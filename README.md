# EVE Healthcare — Diagnostics Booking & Payments API

Backend service for diagnostic test bookings and simulated payments, built for the EVE Healthcare
SDE Intern assignment.

**Stack:** Node.js, Express, PostgreSQL, Sequelize (ORM), JWT auth, Zod (validation), Jest + Supertest (tests),
Swagger/OpenAPI, Docker.

> **A note on the ORM choice:** this project uses Sequelize rather than Prisma. I initially built it on
> Prisma, but ran into an environment where I could actively run and verify the code (migrations, a live
> Postgres instance, and the full test suite) only with a pure-JS ORM — Prisma's CLI needs to download a
> platform-specific engine binary at install/migrate time, which wasn't reliably available. I'd rather ship
> something I've actually run end-to-end than something merely plausible, so I switched. Functionally
> everything below (schema, API design, idempotency logic) is unaffected by this choice.

---

## 1. Running locally

### Option A — Docker Compose (recommended, zero local setup)

```bash
docker compose up --build
```

This starts Postgres, runs migrations, seeds demo data, and starts the API on `http://localhost:3000`.
Swagger docs: `http://localhost:3000/docs`.

### Option B — Run natively

Prerequisites: Node 20+, a running PostgreSQL 14+ instance.

```bash
npm install
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET if needed
createdb eve_diagnostics_dev  # or create the DB some other way
npm run migrate              # runs all migrations
npm run seed                 # optional demo data (1 user + 1 centre + 3 tests)
npm run dev                  # starts on http://localhost:3000 with nodemon
```

Demo login after seeding: `demo@eve.health` / `password123`.

### Running tests

Tests run against a **real** Postgres database (not mocks), because the thing most worth verifying here —
webhook idempotency under a unique DB constraint — only means something against a real database.

```bash
createdb eve_diagnostics_test
npm test
```

`.env.test` already points at `eve_diagnostics_test` by default. The suite calls `sequelize.sync({ force: true })`
before running, so **never point `.env.test` at a database with real data**.

32 tests currently pass, covering: auth (signup/login/validation/bad token), centres & tests, bookings
(ownership, state transitions, validation), simulated payments, and — the most important part — webhook
idempotency (duplicate `eventId` delivered 3× produces exactly one payment row and one state transition).

---

## 2. API overview

All endpoints are under `/api`. Full interactive docs (with request/response schemas) are at `/docs` once
the server is running. Summary:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | – | Create an account, returns a JWT |
| POST | `/auth/login` | – | Returns a JWT |
| POST | `/centres` | JWT | Register a diagnostic centre |
| GET | `/centres` | – | List centres (paginated), with their tests |
| GET | `/centres/:id` | – | Get one centre |
| POST | `/centres/:id/tests` | JWT | Add a test to a centre |
| GET | `/centres/:id/tests` | – | List a centre's tests |
| POST | `/bookings` | JWT | Book a test (creates a `PENDING` booking) |
| GET | `/bookings` | JWT | List the caller's own bookings (paginated) |
| GET | `/bookings/:id` | JWT | Get one of the caller's own bookings |
| PATCH | `/bookings/:id/cancel` | JWT | Cancel a `PENDING`/`FAILED` booking |
| POST | `/payments` | JWT | Simulate a payment for one of the caller's bookings |
| POST | `/payments/webhook` | shared secret (optional) | Provider pushes an async status update — **idempotent** |

Auth: `Authorization: Bearer <token>` header.

### Example requests

**Sign up**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Aayush","email":"aayush@example.com","password":"secret123"}'
```

**Book a test**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"testId":"<test-id>","appointmentAt":"2026-10-01T09:00:00.000Z"}'
```

**Simulate a payment**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"bookingId":"<booking-id>"}'
```
(`forceStatus: "SUCCESS" | "FAILED"` is accepted too, for deterministic testing/demoing — a real gateway
obviously wouldn't offer this knob.)

**Webhook delivery (simulating the provider)**
```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt_123","bookingId":"<booking-id>","status":"SUCCESS"}'
```
Redelivering the exact same `eventId` is always safe — see §4.

---

## 3. Database / schema design

```
users            (id, name, email UNIQUE, password_hash)
diagnostic_centres (id, name, location)
diagnostic_tests   (id, name, price, centre_id → centres)
bookings         (id, user_id → users, test_id → tests, centre_id → centres,
                   appointment_at, amount, status ENUM[PENDING|CONFIRMED|FAILED|CANCELLED])
payments         (id, booking_id → bookings, amount, status ENUM[PENDING|SUCCESS|FAILED], provider_ref UNIQUE)
webhook_events   (id, event_id UNIQUE, payload JSONB, booking_id)
```

Design notes:

- **`booking.amount` is a price snapshot**, copied from the test's price at booking time. If a centre later
  changes a test's price, existing bookings are unaffected — the amount owed was locked in when the booking
  was made.
- **`payments` is a log, not 1:1 with bookings.** A booking can have more than one payment attempt (e.g. a
  `FAILED` attempt followed by a retry), so it's a one-to-many relationship, not a single mutable field on
  the booking.
- **`booking.status` is only ever mutated by the payment endpoints** (`POST /payments` or the webhook) —
  never by a generic "update booking" route. That's the one thing that keeps `CONFIRMED` meaning "an actual
  payment succeeded" rather than "the client claimed it did."
- **`webhook_events.event_id` carries a UNIQUE constraint** — this is the entire idempotency mechanism (see
  §4).

---

## 4. Idempotent webhook — how it works

Payment providers redeliver webhooks (at-least-once delivery is the norm), and the assignment explicitly
calls out that a repeated event must not create duplicate payments, duplicate bookings, or corrupt booking
state.

The approach: `webhook_events.event_id` has a **unique constraint** at the database level. Each webhook
delivery runs inside a single DB transaction that:

1. Inserts a row into `webhook_events` keyed on `eventId`.
2. Creates the `Payment` row.
3. Updates the `Booking`'s status.

If the same `eventId` arrives again, step 1's insert violates the unique constraint, Postgres rejects it,
and **the entire transaction rolls back** — no payment row, no booking mutation. The handler catches that
specific error and returns `200` with a "duplicate delivery" message (webhook providers generally expect a
`2xx` on retries even when you've already processed the event, otherwise they keep retrying forever), along
with the booking's current state for visibility.

This relies on the database's atomicity/uniqueness guarantees rather than an application-level "have I seen
this before?" check-then-act, which would have a race condition under concurrent delivery of the same event.

Other edge cases the webhook (and payment endpoint) explicitly handle:
- Booking doesn't exist → `404`.
- Booking is already `CANCELLED` → `400`, payment is not applied.
- Payload fails schema validation (missing/invalid fields) → `400` before touching the DB.
- Optional shared-secret header (`x-webhook-secret` / `WEBHOOK_SECRET` env var) so the endpoint isn't
  wide open to anyone who finds the URL — stands in for the HMAC signature verification a real provider
  (Stripe, Razorpay, etc.) would use.

---

## 5. Other edge cases handled

- **Auth:** duplicate email on signup (`409`), wrong password / non-existent email both return the same
  generic `401` (doesn't leak which emails are registered), malformed/expired JWTs (`401`).
- **Bookings:** booking a non-existent test (`404`), appointment date in the past (`400`), a user fetching
  or cancelling someone else's booking returns `404` (not `403`) so as not to confirm the booking even
  exists, double-cancelling (`400`), cancelling a `CONFIRMED` booking is blocked (real refund flow needed,
  out of scope).
- **Payments:** paying for a booking that isn't `PENDING` (`400`), paying for someone else's booking
  (`404`), paying for a non-existent booking (`404`).
- **Validation:** every request body is validated with Zod before it reaches a controller; malformed UUIDs,
  negative prices, missing fields, etc. all fail fast with a `400` and per-field messages.

---

## 6. Assumptions made

- Any authenticated user can register a centre/test (no admin/staff role). A real system would gate this
  behind a role check — flagged here rather than silently ignored.
- "Cancel" is only allowed while a booking is `PENDING` or `FAILED`. Cancelling a `CONFIRMED` (paid)
  booking would need a real refund flow, which is out of scope for a simulated payment system.
- The webhook's shared-secret check is opt-in (only enforced if `WEBHOOK_SECRET` is set) so the assignment
  can be exercised without extra setup, but the mechanism itself is real and meant to be turned on.
- `POST /payments` simulates a synchronous gateway response (roughly 85% success) for demo convenience;
  `POST /payments/webhook` simulates the async/callback style most real providers actually use. Both paths
  update booking state through the same rules.

## 7. What I'd improve with more time

- Role-based access control for centre/test management (admin vs. regular user).
- Redis-backed idempotency cache in front of the DB check, and a proper outbox/retry queue for webhook
  processing under load.
- Rate limiting on auth and webhook endpoints.
- Refund flow for cancelling a `CONFIRMED` booking.
- Structured logging (pino/winston) instead of morgan, with request IDs threaded through.
- CI (GitHub Actions) running the test suite against a Postgres service container on every PR.

---

## 8. Project structure

```
src/
  app.js                 Express app assembly (no listen — importable by tests)
  server.js               Entry point (loads env, starts the HTTP server)
  config/
    swagger.js             OpenAPI spec generation
  models/                  Sequelize models + associations
  controllers/             Route handlers (business logic)
  routes/                  Route definitions + Swagger doc comments
  middleware/              auth, validate, error handling, webhook secret check
  utils/                   ApiError, asyncHandler, Zod schemas
migrations/                Sequelize migrations (schema history)
seeders/                   Demo data seed script
tests/                     Jest + Supertest integration tests (32 tests)
```
