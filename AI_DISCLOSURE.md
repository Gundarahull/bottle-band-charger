# AI Disclosure

This document discloses where AI assistance was used during the development of this
project, in the interest of transparency. All AI-assisted output was reviewed,
understood, and adjusted by me before being committed.

## Where AI was used

- **Docker setup** — Used AI to help format/clean up the `docker-compose.yaml` file.

- **Repetitive CRUD controllers** — Used AI to help scaffold the create controllers
  for **player**, **reward**, and **inventory**, since these follow the same
  repetitive create-and-respond pattern.

- **Creation validations** — Used AI to help write the `express-validator` rules for
  the player / reward / inventory creation endpoints, again because the validation
  logic is largely repetitive across these resources.

- **Model-level constraints** — Used AI for the SQL-side constraints I knew in RAW SQL were
  needed but wanted help expressing in Sequelize:
  - A check constraint enforcing **amount/balance > 0** at the database level
    (not just in application code).
  - A **composite unique constraint on `(reward_id, player_id)`** to prevent a
    player from claiming the same reward twice.

- **`getWalletBalance` controller** — Used AI to help with the logic that
  **de-duplicates inventory items (and rewards) using a `Map`** when flattening the
  joined SQL result rows.

- **Documentation** — Used AI to help generate the `README.md` (build/run
  instructions and API usage examples).
- **Documentation** — Used AI to help generate the `DESIGN.md` (Beacuse its a heavy work than writing the code, i gave my decisions and instructions).
- **Documentation** — Used AI to help generate the `RESILEICE.md` (Beacuse its a heavy work than writing the code, i gave my decisions and instructions).

## What was done without AI

The overall design, data model, business rules (idempotency keys, transaction and
row-locking strategy), and the decisions about _what_ constraints and logic were
required were my own. AI was used to accelerate implementation and reduce repetitive
work, not to make design decisions.
