# Resilience: Keeping a Purchase Exactly-Once When the Grant Is Remote

## The new problem

Right now a purchase is one PostgreSQL transaction: I deduct the wallet balance **and**
record the item, and they commit together. If anything fails, the whole thing rolls
back. This is safe because both actions live in the same database.

Now assume the item grant moves to a **separate inventory service** that I call over
HTTP. That call can:

- **time out** — I don't know if the item was granted,
- **fail** — the item was not granted, or
- **run twice** — a retry could grant the item twice,

and it **cannot be inside my wallet transaction**, because it is a different service
with its own database. So I can no longer commit "money" and "item" together.

### The partial-failure window

The risky moment is **after I deduct the balance but before I know whether the grant
succeeded**. If the server crashes, the call times out, or a retry happens in this
window, a player could be charged with no item, charged twice, or given the item twice.

---

## My approach (built on what I already use)

I already use an idempotency key in this project — the `code:<playerId>:<reason>` /
`purchase:<playerId>:<itemId>:<seq>` structure stored in `done_requests`. I extend that
same idea across the two services instead of inventing something new.

### Step 1 — Do the money part locally and safely

In one wallet-DB transaction I:

1. Build the purchase key `purchase:<playerId>:<itemId>:<seq>` and check
   `done_requests`. If it already exists, I just return the old result and stop.
2. Lock the wallet row (`FOR UPDATE`), check the balance, and deduct the price.
3. Save a record that says **"this item still needs to be granted"** with a status like
   `PENDING` and the purchase key.

Because the deduction and this PENDING record are saved in the **same transaction**, I
can never lose track: if the money left the wallet, there is always a PENDING record
saying a grant is owed.

### Step 2 — Call the inventory service and retry until I'm sure

After committing, I call the inventory service and **send the same purchase key**. The
inventory service must remember keys it has already handled, so if I accidentally call
twice, it grants the item only once.

- If it **succeeds** → I mark my record `DONE`.
- If it **times out or fails** → I leave it `PENDING` and **try again later** (a simple
  retry, or a small background job that re-sends PENDING records). Retrying is safe
  precisely because the key prevents a second grant.

So even if my first call's result is unknown, I keep retrying the same keyed request
until I get a clear success — the item ends up granted exactly once.

### Step 3 — If the grant can never succeed, give the money back

If the inventory service permanently refuses the grant (for example, the item no longer
exists), I **refund the wallet** in a local transaction and mark the record failed. The
player ends up either "charged and got the item" or "refunded and got nothing" — never
stuck halfway.

> Note: there are formal, well-known patterns for exactly this situation (the
> **transactional outbox** and **saga / compensation** patterns). I have not used them
> yet; the approach above is the same idea expressed with the tools I already know
> (idempotency keys, transactions, a PENDING status, retries, and a refund). I plan to
> study the proper outbox/saga patterns and adopt them later.

---

## Sub-question: a bug double-granted currency last week

### How to detect it (without downtime)

The thing that makes this easy to find is keeping an **append-only history of every
balance change** — one row per change: `player_id`, amount (`delta`), reason, the
idempotency key, and a timestamp. The wallet balance should always equal the **sum of
all those changes** for that player.

With that history I can run read-only queries (on a copy/replica, so nothing goes down):

- Find any idempotency key (or `player_id + reason`) that appears **more than once** —
  those are the double credits.
- Find players where `wallet.balance` does **not** equal the **sum of their history
  rows** — those are the players the bug affected.

### How to correct it (without downtime)

For each affected player, I add a **negative correcting entry** equal to the extra
amount, with its own unique key and a reason like `correction:incident-XYZ`, inside a
transaction that also fixes the wallet balance. Because each correction has its own
unique key, I can **run the fix script twice without over-correcting** — the second run
sees the correction already exists and skips it. I keep the original wrong entries for
the record instead of deleting them.

### What would have caught it sooner

- A **unique constraint on the idempotency key** for every credit. Then a duplicate
  credit would be **rejected by the database immediately**, instead of silently adding
  money.
- A regular check that `wallet.balance == sum of that player's history rows`, with an
  alert when they disagree.
- This is basically what `done_requests` already does today — turning it into a proper
  uniquely-keyed "money history" table would have stopped the double grant at write
  time.

---

## Summary

- **Risky window:** money deducted, but grant result unknown.
- **My fix:** deduct money + save a PENDING grant in one local transaction, then call the
  inventory service with the **same idempotency key**, retry on failure, and refund if it
  can never succeed.
- **The incident:** an append-only, uniquely-keyed history of balance changes lets me
  detect double credits (duplicate keys / balance ≠ sum) and fix them with re-runnable
  correcting entries — and a unique key would have blocked the duplicate up front.
- **To learn next:** the formal **outbox** and **saga/compensation** patterns, which are
  the standard way to do this.
