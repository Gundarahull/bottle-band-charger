# Design

This document describes the architecture of the Gaming Wallet Service, the datastore
choice, the idempotency (non-duplicate) strategy, the atomicity & durability
guarantees, the API contract, and known limits.

---

## 1. Architecture

```
            HTTP (JSON)
Client ───────────────────▶  Express app (src/server.js)
                                  │
                                  │  request logger + API version check (/v1)
                                  ▼
                             Routers (src/routes/*)
                                  │
                                  ▼
                            Controllers (src/controllers/*)
                                  │  Sequelize models + transactions
                                  ▼
                          PostgreSQL  (Docker container)
```

- **Express 5** HTTP layer. Each domain (player, inventory, rewards, wallets) has its
  own router → controller, with `express-validator` running before each handler.
- A small **version middleware** (`/v1` prefix) gates all routes.
- **Sequelize 6** is the data-access layer. Tables are auto-created on boot via
  `sequelize.sync()`.
- **PostgreSQL** is the single source of truth; all money/ownership invariants are
  enforced at the database level, not only in application code.
- **Docker Compose** runs PostgreSQL and pgAdmin locally for a reproducible dev
  environment.

### Domain tables

| Table                            | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `players`                        | player identity (UUID id)                        |
| `inventories`                    | catalog of purchasable items (UUID id)           |
| `rewards`                        | catalog of rewards (UUID id)                      |
| `wallet`                         | one balance row per player                        |
| `players_purchases_inventories`  | items a player owns + quantity                    |
| `rewards_players`                | rewards a player has claimed                      |
| `done_requests`                  | idempotency ledger (replay store)                 |

---

## 2. Datastore choice — and why

**PostgreSQL.**

This is a money-handling service, so correctness under concurrency matters more than
anything else. PostgreSQL was chosen because:

- **Strong ACID transactions** — credit, purchase, and claim each touch multiple rows
  and must be all-or-nothing. Postgres gives this natively.
- **Row-level locking** (`SELECT ... FOR UPDATE`) to serialize concurrent writes to the
  same wallet and prevent lost updates / double-spends.
- **Server-side constraints** — `CHECK` (balance > 0, quantity > 0), composite
  `UNIQUE`, foreign keys with `CASCADE` — so invariants hold even if application code
  has a bug.
- **JSONB** — the `done_requests` ledger stores the original response body as `JSONB`
  so a duplicate request can be replayed exactly.
- It scales well for large, write-heavy applications and is a well-understood,
  production-grade relational database.

**Docker Compose** runs the database locally so the schema and credentials are
reproducible across machines without installing Postgres on the host.

---

## 3. Non-duplicate (idempotency) strategy

The core idea is a **Redis-style logical key** for every state-changing money/ownership
operation. Before performing the work, the controller computes a deterministic `code`
and checks the `done_requests` ledger inside the same transaction:

- If the `code` already exists → **replay** the stored `response_body` (no re-execution).
- If not → perform the work, then **persist** the `code` + status + response body.

Because the lookup and the insert happen **inside the same transaction** as the actual
mutation, the operation and its idempotency record commit together (or not at all).

### Key shapes (the `code:'':''` structure)

| Operation        | Key format                                   | Dedup meaning                                  |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| Credit balance   | `code:<playerId>:<reason>`                   | one credit per (player, reason)                |
| Purchase item    | `purchase:<playerId>:<itemId>:<nextSeq>`     | sequenced per (player, item) purchase          |
| Claim reward     | `claim:<playerId>:<rewardId>`                | one claim per (player, reward)                 |

> Example: a deposit should send a unique `reason` such as `deposit_invoice_12345`;
> resending the same `reason` returns the original result instead of crediting twice.

### Defense in depth

Idempotency is backed by **hard database constraints** so duplicates cannot slip
through even under a race:

- `rewards_players` has a **composite `UNIQUE(player_id, reward_id)`** — a player can
  never claim the same reward twice.
- `wallet.balance` and `players_purchases_inventories.quantity` carry **`CHECK (> 0)`**
  partial indexes.

### Key retention

Keys in `done_requests` are currently **retained indefinitely** (the table is the
permanent replay ledger; there is no TTL/expiry job). This guarantees idempotency holds
forever for any historical request. The trade-off is unbounded growth of the table —
see *Limits* for the intended cleanup approach.

---

## 4. Atomicity & durability

### What is atomic

Every money/ownership flow runs inside a single `connectDB.transaction(...)`:

- **Credit:** check ledger → `findOrCreate` wallet with `LOCK.UPDATE` → increment
  balance → write `done_requests`. All commit together.
- **Purchase:** check ledger → lock wallet row (`FOR UPDATE`) → verify funds → deduct
  balance → upsert ownership/quantity → write `done_requests`. All commit together.
- **Claim:** check ledger → verify player & reward → insert into `rewards_players`
  (unique-protected) → write `done_requests`. All commit together.

If any step throws, the transaction **rolls back** and nothing is persisted — no
partial credit, no balance deducted without the item being granted, no idempotency key
left behind for work that didn't happen. This is exactly why transactions are used:
between deduct-balance and grant-item there are several steps, and a failure in the
middle would otherwise corrupt state.

### Isolation level & concurrency

- Isolation is PostgreSQL's default **READ COMMITTED**.
- Correctness under concurrent requests to the **same wallet** is enforced with
  **pessimistic row locks** (`transaction.LOCK.UPDATE` → `SELECT ... FOR UPDATE`). A
  second concurrent purchase/credit for the same player blocks until the first commits,
  preventing lost updates and double-spends.

### What happens on `kill -9` mid-purchase

If the process is killed (`kill -9`) after the balance was deducted but **before the
transaction commits**:

1. The TCP connection drops; PostgreSQL **aborts the open transaction** and rolls back.
2. The balance deduction, the ownership row, and the `done_requests` insert are **all
   undone**. The wallet is exactly as it was before the request.
3. Any row locks are released on disconnect, so other requests are not blocked.

Durability comes from Postgres's **WAL (write-ahead log)**: only **committed**
transactions survive a crash, and they survive fully. So the system is never left in a
half-applied state — either the whole purchase happened (and a retry replays the stored
response), or none of it did (and a retry performs it fresh).

---

## 5. API contract

Base URL `http://localhost:8888`, all routes prefixed with `/v1`. Standard envelope:
`{ "success": boolean, "message": string, "data": object }`. Validation failures return
`400` with an `errors` array.

| Method | Path                              | Body                                  | Notes                          |
| ------ | --------------------------------- | ------------------------------------- | ------------------------------ |
| POST   | `/v1/player/create`               | `{ name }`                            | name 2–50 chars                |
| POST   | `/v1/inventory/create`            | `{ name }`                            | name 2–50 chars; `201`         |
| POST   | `/v1/rewards/create`              | `{ name }`                            | name 3–100 chars; `201`        |
| POST   | `/v1/rewards/:rewardId/claim`     | `{ playerId }`                        | idempotent; dup → `409`        |
| POST   | `/v1/wallets/:playerId/credit`    | `{ amount, reason }`                  | amount ≥ 1; idempotent by reason |
| POST   | `/v1/wallets/:playerId/purchase`  | `{ itemId, price }`                   | price ≥ 1; checks funds        |
| GET    | `/v1/wallets/:playerId`           | —                                     | balance + inventory + rewards  |

Notable status codes: `400` validation / insufficient funds / unknown player or item;
`404` unknown player on claim / wallet summary; `409` reward already claimed;
`500` unhandled error.

The wallet summary (`GET /v1/wallets/:playerId`) uses a single raw, parameterized SQL
join (guards against SQL injection via bound `:playerId`) and **de-duplicates** the
joined rows into unique `inventory` and `claimedRewards` arrays using a `Map`.

---

## 6. Limits & trade-offs

- **`done_requests` grows unbounded.** Keys are retained forever. For production a
  retention policy (e.g. TTL + periodic cleanup of keys older than N days) should be
  added; current design favors correctness over storage cost.
- **Wallet currency is an integer** (whole units). No fractional amounts / multi-currency.
- **No authentication/authorization** layer — any caller can act on any `playerId`.
- **To Design this, I can design using bcryptJS and JWT, i make full focus on the IDEMPOTENCY**

