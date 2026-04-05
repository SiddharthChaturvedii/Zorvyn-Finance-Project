# Zorvyn Finance Dashboard Backend

This is my submission for the Zorvyn FinTech Backend Developer Internship Assessment. It's a complete REST API built with NestJS, PostgreSQL, and Redis that handles authenticated users, manages financial records, and serves dashboard analytics.

## Tech Stack & Architecture

*   **NestJS:** Chosen over Express/Django for its out-of-the-box modular architecture and dependency injection. It makes it easier to keep the auth, users, and dashboard features separated.
*   **Prisma & PostgreSQL:** Used Prisma's `Decimal` type mapped to PostgreSQL's `NUMERIC(15,2)`. This is critical for finance apps to avoid floating-point rounding errors when calculating balances.
*   **Redis:** Used to cache dashboard aggregation queries (like total income and monthly trends) to speed up load times. The cache is automatically invalidated when a record is added or updated.
*   **Audit Trail:** Added a globally scoped interceptor that logs every state-changing request (POST, PUT, DELETE) to an `AuditLog` table, which is a standard compliance requirement in FinTech.

---

## Features

- **RBAC (Role Based Access Control):** Users have `VIEWER`, `ANALYST`, or `ADMIN` roles. The API enforces what they can do at both the route level and the object level (e.g., VIEWERs can only see their own records).
- **Authentication:** JWT access tokens (15m expiry) and UUID-based refresh tokens stored in the DB for easy revocation.
- **Records Management:** Full CRUD operations on financial records with soft-deletes (records are never truly wiped from the DB).
- **Dashboard Analytics:** Calculates net balance, spending trends, and top categories.
- **Validation:** Global validation pipes strip unwhitelisted fields and block bad requests before they hit the controller.

## Prerequisites
- Node.js 20 (LTS)
- Docker Desktop
- Git

---

## 🚀 Quick Start (Docker)

This is the easiest way to run the app. It will securely start the Postgres database, Redis cache, apply the schema, and seed the test data.

```bash
# 1. Clone the repository
git clone <repo-url>
cd finance-backend

# 2. Setup your .env file
cp .env.example .env
# Open .env and set JWT_SECRET to a random secure string

# 3. Start the containers in the background
docker compose up --build -d

# 4. Run database migrations (only needed the first time)
docker compose exec api npx prisma migrate deploy

# 5. Seed the database with users and 200 dummy financial records
docker compose exec api npx ts-node prisma/seed.ts

# 6. Check out the interactive docs!
# Open http://localhost:3000/docs in your browser
```

## 💻 Local Setup (Without Docker runtime)

If you just want to use Docker for the DBs and run Node locally:

```bash
# Start Postgres and Redis
docker compose up -d postgres redis

# Install dependencies
npm install

# Generate Prisma client and push schema
npx prisma generate
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed

# Run the app locally
npm run start:dev
```

## Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/finance_db` |
| `DATABASE_URL_TEST` | Separate DB for E2E tests | `postgresql://postgres:postgres@localhost:5432/finance_db_test` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing tokens | `some_long_random_string` |
| `ACCESS_TOKEN_EXPIRES_IN` | standard JWT expiry | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS`| refresh token block limit | `7` |

## API Documentation

I used Swagger to automatically document the API. You can view all endpoints and test them interactively here:
🔗 **[http://localhost:3000/docs](http://localhost:3000/docs)**

> Tip: Use the `/auth/login` endpoint below with the seed credentials to get an `accessToken`, then click the **Authorize** lock button in the top right to test the dashboard routes.

## Running Tests

There are over 45 End-to-End (E2E) tests testing everything from auth validation to role-based access denial.

```bash
npm run test:e2e
```
* **`test/auth.e2e-spec.ts`:** Tests registration, login, and token rotation.
* **`test/records.e2e-spec.ts`:** Tests CRUD, pagination, filtering, and soft-deletes.
* **`test/rbac.e2e-spec.ts`:** Tests that users cannot exceed their permission scope.
* **`test/dashboard.e2e-spec.ts`:** Verifies the aggregation math is correct.

## Default Credentials

The `seed.ts` script creates the following users for you to test the API with:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@zorvyn.io` | `Admin@123456` | Can change roles and restore deleted records. |
| **ANALYST** | `analyst1@zorvyn.io` | `Analyst@123` | Can create and read all transactions. |
| **VIEWER** | `viewer1@zorvyn.io` | `Viewer@123` | Can only view their own personal records. |
