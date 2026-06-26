# Gaming Wallet Service

A Express + PostgreSQL (Sequelize) service for managing players, wallets, an
item inventory, and rewards. Money-changing endpoints (credit, purchase, claim) are
**idempotent** — a repeated request with the same logical key is recorded in a
`done_requests` table and replayed instead of re-executed, which also protects
against race conditions via row-level locks.

---

## Tech stack

- Node.js + Express 5
- PostgreSQL 15 (via Sequelize 6)
- Docker Compose (PostgreSQL + pgAdmin)
- `express-validator` for input validation

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Docker Desktop](https://www.docker.com/) (for the PostgreSQL container)

---

## 1. Configuration

Create a `.env` file in the project root:

```env
PORT=8888
POSTGRE_SQL_HOST=localhost
POSTGRE_SQL_USERNAME="game_admin"
POSTGRE_SQL_PASSWORD="game@123"
POSTGRE_SQL_DATABASE_NAME="game_db"
POSTGRE_SQL_PORT=5433
```

> The container maps host port **5433 → container 5432** (see `docker-compose.yaml`).
> Port `5433` is used to avoid clashing with any native PostgreSQL already running
> on `5432`. If `5432` is free on your machine, you may change both the compose
> mapping and `POSTGRE_SQL_PORT` to `5432`.

---

## 2. Build & run

### Start the database

```bash
docker compose up -d
```

This starts:

| Service     | Host port | Purpose            |
| ----------- | --------- | ------------------ |
| PostgreSQL  | `5433`    | application database |
| pgAdmin     | `8080`    | DB web UI (`admin@admin.in` / `admin`) |

### Install dependencies & start the API

```bash
npm install
npm run dev
```

On startup the server:

1. Connects to PostgreSQL.
2. Auto-creates tables (`sequelize.sync`).
3. Listens on `http://localhost:8888`.

Expected logs:

```
Server is listening at 8888
PostgreSQL connected Succesfully.
Tables Created
```

### Connecting pgAdmin to the DB

pgAdmin runs **inside Docker**, so register the server with:

- Host: `postgres_db` (the compose service name, not `localhost`)
- Port: `5432` (container-internal port, not `5433`)
- Username: `game_admin` / Password: `game@123`

---

## API contract

Base URL: `http://localhost:8888`
All routes are prefixed with the API version `/v1`.

| Method | Path                              | Description                         |
| ------ | --------------------------------- | ----------------------------------- |
| POST   | `/v1/player/create`               | Create a player                     |
| POST   | `/v1/inventory/create`            | Create an inventory item            |
| POST   | `/v1/rewards/create`              | Create a reward                     |
| POST   | `/v1/rewards/:rewardId/claim`     | Claim a reward for a player         |
| POST   | `/v1/wallets/:playerId/credit`    | Credit money to a player's wallet   |
| POST   | `/v1/wallets/:playerId/purchase`  | Buy an inventory item with wallet   |
| GET    | `/v1/wallets/:playerId`           | Get balance, inventory & rewards    |

Standard response envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

Validation errors return `400` with an `errors` array from `express-validator`.

---

## 3. Exercise the API

### Option A — curl walkthrough (bash)

```bash
BASE=http://localhost:8888

# 1) Create a player  -> copy the returned data.id
curl -s -X POST $BASE/v1/player/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'

PLAYER_ID="<paste-player-id>"

# 2) Create an inventory item -> copy the returned data.id
curl -s -X POST $BASE/v1/inventory/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Sword"}'

ITEM_ID="<paste-item-id>"

# 3) Credit 100 to the wallet (idempotent per "reason")
curl -s -X POST $BASE/v1/wallets/$PLAYER_ID/credit \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"reason":"deposit_invoice_12345"}'

# 4) Purchase the item for 40
curl -s -X POST $BASE/v1/wallets/$PLAYER_ID/purchase \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\",\"price\":40}"

# 5) Create and claim a reward
curl -s -X POST $BASE/v1/rewards/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Welcome Bonus"}'

REWARD_ID="<paste-reward-id>"

curl -s -X POST $BASE/v1/rewards/$REWARD_ID/claim \
  -H "Content-Type: application/json" \
  -d "{\"playerId\":\"$PLAYER_ID\"}"

# 6) View wallet summary (balance + inventory + claimed rewards)
curl -s $BASE/v1/wallets/$PLAYER_ID
```

### Option B — PowerShell walkthrough (Windows)

```powershell
$Base = "http://localhost:8888"

# 1) Create a player
$player = Invoke-RestMethod -Method Post -Uri "$Base/v1/player/create" `
  -ContentType "application/json" -Body '{"name":"Alice"}'
$playerId = $player.data.id

# 2) Create an inventory item
$item = Invoke-RestMethod -Method Post -Uri "$Base/v1/inventory/create" `
  -ContentType "application/json" -Body '{"name":"Sword"}'
$itemId = $item.data.id

# 3) Credit 100
Invoke-RestMethod -Method Post -Uri "$Base/v1/wallets/$playerId/credit" `
  -ContentType "application/json" `
  -Body '{"amount":100,"reason":"deposit_invoice_12345"}'

# 4) Purchase the item for 40
Invoke-RestMethod -Method Post -Uri "$Base/v1/wallets/$playerId/purchase" `
  -ContentType "application/json" `
  -Body (@{ itemId = $itemId; price = 40 } | ConvertTo-Json)

# 5) Create and claim a reward
$reward = Invoke-RestMethod -Method Post -Uri "$Base/v1/rewards/create" `
  -ContentType "application/json" -Body '{"name":"Welcome Bonus"}'
$rewardId = $reward.data.id

Invoke-RestMethod -Method Post -Uri "$Base/v1/rewards/$rewardId/claim" `
  -ContentType "application/json" `
  -Body (@{ playerId = $playerId } | ConvertTo-Json)

# 6) View wallet summary
Invoke-RestMethod -Uri "$Base/v1/wallets/$playerId"
```

---

## Request / response examples

### Create player — `POST /v1/player/create`

Request:

```json
{ "name": "Alice" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Player created Succesfully",
  "data": { "id": "1f0b...uuid", "name": "Alice" }
}
```

### Credit wallet — `POST /v1/wallets/:playerId/credit`

Request:

```json
{ "amount": 100, "reason": "deposit_invoice_12345" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Amount Credited Succesfully",
  "data": { "totalAmount": 100 }
}
```

> **Idempotency:** the key is `code:<playerId>:<reason>`. Re-sending the same
> `playerId` + `reason` returns the original result without crediting again.
> Use a unique `reason` per real transaction (e.g. `deposit_invoice_12345`).

### Purchase item — `POST /v1/wallets/:playerId/purchase`

Request:

```json
{ "itemId": "<inventory-uuid>", "price": 40 }
```

Response `200`:

```json
{
  "success": true,
  "message": "Item Purchased successfully",
  "data": { "itemId": "<inventory-uuid>", "remainingBalance": 60, "quantity": 1 }
}
```

Insufficient funds returns `400` with `"Insufiicent Funds"`.

### Claim reward — `POST /v1/rewards/:rewardId/claim`

Request:

```json
{ "playerId": "<player-uuid>" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Reward claimed successfully",
  "data": { "rewardId": "<reward-uuid>", "claimedAt": "2026-06-27T10:00:00.000Z" }
}
```

A second claim by the same player returns `409` `"Player already claimed the Reward"`.

### Wallet summary — `GET /v1/wallets/:playerId`

Response `200`:

```json
{
  "success": true,
  "balance": 60,
  "inventory": [
    { "itemId": "<inventory-uuid>", "name": "Sword", "quantity": 1 }
  ],
  "claimedRewards": [
    { "rewardId": "<reward-uuid>", "name": "Welcome Bonus" }
  ]
}
```

---

## Validation rules

| Field    | Endpoint            | Rule                                   |
| -------- | ------------------- | -------------------------------------- |
| `name`   | player create       | string, 2–50 chars                     |
| `name`   | inventory create    | string, 2–50 chars                     |
| `name`   | reward create       | string, 3–100 chars                    |
| `amount` | credit              | integer ≥ 1                            |
| `reason` | credit              | string, ≥ 3 chars                      |
| `price`  | purchase            | integer ≥ 1                            |
| `itemId` | purchase            | non-empty string                       |
| `playerId` | reward claim      | non-empty string                       |

---

## Project structure

```
docker-compose.yaml      # PostgreSQL + pgAdmin
src/
  server.js              # app bootstrap, route wiring, DB connect/sync
  config/                # env + Sequelize connection
  middlewares/           # API version check
  models/                # Sequelize models (player, wallet, inventory, reward, ...)
  routes/                # Express routers per domain
  controllers/           # request handlers (idempotent money flows)
  validations/           # express-validator rule sets
```

---

## Troubleshooting

- **`password authentication failed for user "game_admin"`** — a native PostgreSQL
  may be occupying port `5432`. This project uses host port `5433`; make sure
  `POSTGRE_SQL_PORT=5433` in `.env` matches the compose mapping, then
  `docker compose up -d` again.
- **`API version not found`** — call routes with the `/v1` prefix.
- **Tables missing** — confirm the startup log shows `Tables Created`; the server
  runs `sequelize.sync()` on boot.
