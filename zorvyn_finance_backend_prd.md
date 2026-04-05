# Finance Dashboard Backend — Product Requirements Document

**Company:** Zorvyn FinTech  
**Role:** Backend Developer Internship Assessment  
**Candidate:** Siddharth Chaturvedi  
**Version:** 1.0 — April 2026  
**Status:** Final — Full Implementation Brief  
**Stack:** NestJS · TypeScript · PostgreSQL · Prisma · Redis · Docker  

---

## Important Note for the AI Building This

This is a **complete, self-contained implementation brief**. You do not need to ask any clarifying questions. Every decision has been made — architecture, stack, schema, endpoint behavior, validation rules, error shapes, caching strategy, RBAC logic, and test cases. Build exactly what is described here. Where a code example is given, use it as the implementation. Do not substitute alternative approaches unless something is technically impossible.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack — Every Choice Justified](#2-tech-stack--every-choice-justified)
3. [Project Structure — Exact Directory Tree](#3-project-structure--exact-directory-tree)
4. [Database Schema — Exact Prisma Schema](#4-database-schema--exact-prisma-schema)
5. [Role-Based Access Control](#5-role-based-access-control)
6. [Authentication Design](#6-authentication-design)
7. [API Endpoints — Full Specification](#7-api-endpoints--full-specification)
8. [Request & Response Shapes](#8-request--response-shapes)
9. [Business Logic Rules](#9-business-logic-rules)
10. [Dashboard & Analytics Logic](#10-dashboard--analytics-logic)
11. [Caching Strategy — Redis](#11-caching-strategy--redis)
12. [Middleware & Guards](#12-middleware--guards)
13. [Validation & Error Handling](#13-validation--error-handling)
14. [Audit Logging](#14-audit-logging)
15. [Testing Requirements](#15-testing-requirements)
16. [Environment Variables](#16-environment-variables)
17. [Docker Setup](#17-docker-setup)
18. [Seed Data Specification](#18-seed-data-specification)
19. [README Requirements](#19-readme-requirements)
20. [Assumptions & Decisions](#20-assumptions--decisions)

---

## 1. Project Overview

### What This Is

A production-grade REST API backend for a **Finance Dashboard System** built as the Zorvyn FinTech Backend Developer Internship Assessment. The system manages users with role-based access, financial records (income/expense transactions), and serves aggregated analytics to a frontend dashboard.

### Zorvyn Context (Important for Design Decisions)

Zorvyn is a FinTech company that builds secure, compliant, and intelligent financial systems for startups and SMEs. Their platform unifies budgeting, payments, compliance, forecasting, and transaction monitoring. They process millions of transactions with near-zero downtime for 600+ clients. Every design decision in this project should reflect that context — this is not a hobby CRUD app, it is a financial infrastructure backend.

### What the System Does

- Manages users with roles: `VIEWER`, `ANALYST`, `ADMIN`
- Stores and manages financial records (income/expense transactions) with soft delete
- Enforces role-based access at the route level (Guards) and object level (service layer)
- Serves aggregated analytics for a dashboard — summaries, trends, category breakdowns
- Logs every state-changing action to an immutable audit trail
- Caches expensive dashboard queries in Redis with invalidation on writes
- Supports filtering, pagination, full-text search, and CSV export on records
- Issues JWT access tokens + refresh tokens with rotation on every refresh

### Why This Stack Beats the Known Competitor

A competing candidate built this using Django REST Framework on PostgreSQL. This submission uses NestJS + TypeScript and is superior on every dimension that matters for a FinTech company:

| Dimension | Django DRF (Competitor) | This Project (NestJS) |
|---|---|---|
| Architecture | MVC monolith | Modular DI architecture — each domain is an isolated NestJS module |
| Type safety | Python type hints (optional) | TypeScript — compile-time guarantees on every request and response |
| API docs | Manual via drf-spectacular | Auto-generated via `@nestjs/swagger` — always accurate |
| RBAC implementation | DRF permission classes | NestJS Guards + custom `@Roles()` decorator — cleaner separation |
| Dashboard caching | Not implemented | Redis cache with per-endpoint TTL and write-triggered invalidation |
| Audit logging | Not implemented | Dedicated AuditLog table, interceptor-based capture |
| Containerisation | Deployed on Render | Docker Compose — full local reproducibility in one command |
| Test count | 30+ | 50+ covering auth flows, RBAC enforcement, analytics accuracy |
| Endpoints | 25+ | 40+ with full Swagger docs |
| Token security | Not specified | JWT access token (15 min) + refresh token rotation (7 days) |
| Financial precision | Default float risk | Prisma `Decimal` type mapped to PostgreSQL `NUMERIC(15,2)` |

---

## 2. Tech Stack — Every Choice Justified

### Complete Dependency List

```
Runtime:          Node.js 20 LTS
Language:         TypeScript 5.x (strict mode)
Framework:        NestJS 10
ORM:              Prisma 5 (with PostgreSQL adapter)
Database:         PostgreSQL 16
Cache:            Redis 7 (via ioredis)
Auth:             @nestjs/jwt + @nestjs/passport + passport-jwt + bcryptjs
Validation:       class-validator + class-transformer
API Docs:         @nestjs/swagger
Testing:          Jest + Supertest
Containers:       Docker + Docker Compose v2
Linting:          ESLint + Prettier
```

### Why NestJS

NestJS is the enterprise-grade Node.js framework. It provides:
- **Dependency injection** — services, repositories, and guards are injected, not imported. This makes testing trivial and architecture clean.
- **Decorators for routing and validation** — `@Get()`, `@Post()`, `@Roles()`, `@Body()` are declarative. The route file reads like documentation.
- **Guards** — purpose-built for RBAC. `@UseGuards(JwtAuthGuard, RolesGuard)` on a route handler is self-documenting and testable.
- **Interceptors** — used here for audit logging. Every request passes through the interceptor; it captures the action after the response is confirmed successful.
- **Modules** — each domain (auth, users, records, dashboard, audit) is a NestJS module. No cross-domain imports leak. This mirrors Zorvyn's microservices-oriented architecture.

### Why Prisma Over TypeORM

- Prisma schema is the single source of truth for the database. It generates the TypeScript types, migration SQL, and the query client.
- Prisma's `Decimal` type maps directly to PostgreSQL `NUMERIC` — no float rounding on money fields.
- Prisma migrations are version-controlled, deterministic, and reversible.
- TypeORM has known issues with complex relations and async behavior. Prisma does not.

### Why Redis

Dashboard analytics aggregate potentially thousands of records. Computing totals, trends, and category breakdowns on every request is unnecessary. Redis sits in front of aggregation queries with a configurable TTL. Cache is invalidated when any financial record is written, updated, or deleted.

### Why PostgreSQL

- ACID compliance — financial data must never be partially written
- `NUMERIC(15,2)` for money — no floating point rounding errors ever
- `JSONB` for audit log metadata — flexible structured storage with indexing
- Window functions used in trend aggregation queries
- Full-text search with `tsvector` on record descriptions

---

## 3. Project Structure — Exact Directory Tree

Build the project with exactly this structure. Do not deviate.

```
finance-backend/
├── src/
│   ├── main.ts                          # Bootstrap, global pipes, Swagger setup, CORS
│   ├── app.module.ts                    # Root module — imports all domain modules
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts       # @Roles(...roles) custom decorator
│   │   │   └── current-user.decorator.ts # @CurrentUser() extracts user from request
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts        # Extends AuthGuard('jwt')
│   │   │   └── roles.guard.ts           # Reads @Roles(), checks req.user.role
│   │   ├── interceptors/
│   │   │   └── audit.interceptor.ts     # Captures successful mutations to AuditLog
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts # Global exception filter — standardizes error shape
│   │   ├── pipes/
│   │   │   └── parse-uuid.pipe.ts       # Validates UUID params before they hit handlers
│   │   ├── dto/
│   │   │   └── pagination.dto.ts        # Shared PaginationDto used across modules
│   │   └── types/
│   │       ├── jwt-payload.type.ts      # { sub: string; role: Role; type: 'access'|'refresh' }
│   │       └── paginated-response.type.ts # Generic PaginatedResponse<T>
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # POST /auth/register, /login, /refresh, /logout, GET /auth/me
│   │   ├── auth.service.ts              # register, login, refresh, logout, validateUser
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts          # Passport JWT strategy — validates access token
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts          # GET /users, POST /users, GET/PUT/PATCH/DELETE /users/:id
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       ├── update-user.dto.ts
│   │       └── user-response.dto.ts     # Strips hashed_password from responses
│   │
│   ├── records/
│   │   ├── records.module.ts
│   │   ├── records.controller.ts
│   │   ├── records.service.ts
│   │   └── dto/
│   │       ├── create-record.dto.ts
│   │       ├── update-record.dto.ts
│   │       ├── patch-record.dto.ts      # All fields optional version of update
│   │       ├── record-filter.dto.ts     # Query params for list endpoint
│   │       └── record-response.dto.ts
│   │
│   ├── dashboard/
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts         # All analytics logic lives here
│   │   └── dto/
│   │       ├── summary-response.dto.ts
│   │       ├── category-breakdown.dto.ts
│   │       └── trend-response.dto.ts
│   │
│   ├── audit/
│   │   ├── audit.module.ts
│   │   ├── audit.controller.ts          # GET /audit-logs (Admin only)
│   │   ├── audit.service.ts             # createLog, findAll, findOne
│   │   └── dto/
│   │       └── audit-filter.dto.ts
│   │
│   └── prisma/
│       ├── prisma.module.ts             # Global module — PrismaService available everywhere
│       └── prisma.service.ts            # Extends PrismaClient, onModuleInit connects
│
├── prisma/
│   ├── schema.prisma                    # Single source of truth for DB schema
│   ├── migrations/                      # Auto-generated by prisma migrate dev
│   └── seed.ts                          # Seed script — run with: npx ts-node prisma/seed.ts
│
├── test/
│   ├── auth.e2e-spec.ts
│   ├── records.e2e-spec.ts
│   ├── dashboard.e2e-spec.ts
│   ├── rbac.e2e-spec.ts                 # Dedicated RBAC enforcement tests
│   └── jest-e2e.json
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .env                                 # Never committed — gitignored
├── nest-cli.json
├── tsconfig.json                        # strict: true
├── tsconfig.build.json
├── package.json
└── README.md
```

---

## 4. Database Schema — Exact Prisma Schema

Create this file at `prisma/schema.prisma` exactly as written.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  VIEWER
  ANALYST
  ADMIN
}

enum RecordType {
  INCOME
  EXPENSE
}

enum AuditAction {
  REGISTER
  LOGIN
  LOGOUT
  CREATE_RECORD
  UPDATE_RECORD
  DELETE_RECORD
  RESTORE_RECORD
  CREATE_USER
  UPDATE_USER
  CHANGE_ROLE
  DEACTIVATE_USER
}

// ─── User ────────────────────────────────────────────────────────────────────

model User {
  id             String    @id @default(uuid()) @db.Uuid
  email          String    @unique
  fullName       String    @map("full_name")
  hashedPassword String    @map("hashed_password")
  role           Role      @default(VIEWER)
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  records        FinancialRecord[]
  refreshTokens  RefreshToken[]
  auditLogs      AuditLog[]        @relation("ActorAuditLogs")

  @@map("users")
}

// ─── Financial Record ────────────────────────────────────────────────────────

model FinancialRecord {
  id          String     @id @default(uuid()) @db.Uuid
  amount      Decimal    @db.Decimal(15, 2)  // NEVER use Float for money
  type        RecordType
  category    String     @db.VarChar(100)
  date        DateTime   @db.Date             // Transaction date, not ingestion date
  description String?    @db.Text
  createdById String     @map("created_by") @db.Uuid
  isDeleted   Boolean    @default(false) @map("is_deleted")
  deletedAt   DateTime?  @map("deleted_at") @db.Timestamptz
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime   @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  createdBy   User       @relation(fields: [createdById], references: [id])

  // Indexes — essential for filter/analytics query performance
  @@index([isDeleted])
  @@index([date])
  @@index([category])
  @@index([type])
  @@index([createdById])
  @@index([date, type])           // Compound — used in trend queries
  @@index([category, type])       // Compound — used in category breakdown queries

  @@map("financial_records")
}

// ─── Refresh Token ───────────────────────────────────────────────────────────

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  tokenHash String   @unique @map("token_hash") // bcrypt hash of the raw token
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  revokedAt DateTime? @map("revoked_at") @db.Timestamptz
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])

  @@map("refresh_tokens")
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

model AuditLog {
  id           String      @id @default(uuid()) @db.Uuid
  actorId      String      @map("actor_id") @db.Uuid
  action       AuditAction
  resourceType String      @map("resource_type") @db.VarChar(50)
  resourceId   String?     @map("resource_id") @db.Uuid
  metadata     Json?       // JSONB — stores before/after diffs, IP, request ID
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz

  actor        User        @relation("ActorAuditLogs", fields: [actorId], references: [id])

  @@index([actorId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])

  @@map("audit_logs")
}
```

---

## 5. Role-Based Access Control

### The Three Roles

```
VIEWER   — Read-only. Can view dashboard and their own records. Cannot write anything.
ANALYST  — Can read all records and analytics. Can create/update/delete their own records. Cannot manage users.
ADMIN    — Full access. Can manage all records, all users, roles, and view audit logs.
```

### Permission Matrix — Implement This Exactly

| Action | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| `GET /auth/me` | ✓ | ✓ | ✓ |
| `GET /records` (own records only) | ✓ | — | — |
| `GET /records` (all records) | — | ✓ | ✓ |
| `GET /records/:id` (own only) | ✓ | — | — |
| `GET /records/:id` (any) | — | ✓ | ✓ |
| `POST /records` | ✗ 403 | ✓ | ✓ |
| `PUT /records/:id` (own only) | ✗ 403 | ✓ | — |
| `PUT /records/:id` (any) | ✗ 403 | ✗ 403 | ✓ |
| `PATCH /records/:id` (own only) | ✗ 403 | ✓ | — |
| `DELETE /records/:id` (own only) | ✗ 403 | ✓ | — |
| `DELETE /records/:id` (any) | ✗ 403 | ✗ 403 | ✓ |
| `POST /records/:id/restore` | ✗ 403 | ✗ 403 | ✓ |
| `GET /records/export` | ✗ 403 | ✓ | ✓ |
| `GET /dashboard/*` | ✓ | ✓ | ✓ |
| `GET /users` | ✗ 403 | ✗ 403 | ✓ |
| `POST /users` | ✗ 403 | ✗ 403 | ✓ |
| `GET /users/:id` | ✗ 403 | ✗ 403 | ✓ |
| `PUT /users/:id` | ✗ 403 | ✗ 403 | ✓ |
| `PATCH /users/:id/role` | ✗ 403 | ✗ 403 | ✓ |
| `PATCH /users/:id/deactivate` | ✗ 403 | ✗ 403 | ✓ |
| `GET /audit-logs` | ✗ 403 | ✗ 403 | ✓ |

### RBAC Implementation Pattern

Use NestJS Guards. Apply them globally in `app.module.ts` or individually per route.

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    return true;
  }
}

// Usage on a controller method:
@Post()
@Roles(Role.ANALYST, Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async createRecord(@Body() dto: CreateRecordDto, @CurrentUser() user: JwtPayload) { ... }
```

### Object-Level Permission Check (in Service Layer)

For `ANALYST` accessing records — they can only touch their own. This check happens in the service, not the guard:

```typescript
// records.service.ts
async findOneOrThrow(id: string, requestingUser: JwtPayload): Promise<FinancialRecord> {
  const record = await this.prisma.financialRecord.findFirst({
    where: { id, isDeleted: false },
  });
  if (!record) throw new NotFoundException(`Record ${id} not found`);

  // VIEWER and ANALYST can only access own records
  if (
    requestingUser.role !== Role.ADMIN &&
    record.createdById !== requestingUser.sub
  ) {
    throw new ForbiddenException('You do not have access to this record');
  }
  return record;
}
```

---

## 6. Authentication Design

### Token Strategy

Two-token system: short-lived access token + long-lived refresh token with rotation.

```
Access Token:
  - JWT signed with JWT_SECRET
  - Expires in 15 minutes (configurable via ACCESS_TOKEN_EXPIRES_IN)
  - Payload: { sub: userId, role: Role, type: 'access', iat, exp }
  - Verified by JwtStrategy on every authenticated request
  - Never stored in the database

Refresh Token:
  - Random UUID (crypto.randomUUID()) — not a JWT
  - Raw token is returned to the client once, then never stored in plaintext
  - Stored as a bcrypt hash in the refresh_tokens table
  - Expires in 7 days (configurable via REFRESH_TOKEN_EXPIRES_IN_DAYS)
  - On use: validate hash, issue new access token + new refresh token, revoke old one
  - On logout: revoke by setting revokedAt timestamp
```

### Auth Flow — Step by Step

**Register:**
1. Validate `RegisterDto` (email format, password strength, name length)
2. Check email uniqueness — throw `ConflictException` if taken
3. Hash password with `bcrypt.hash(password, 12)`
4. Create `User` record with `role: VIEWER` by default
5. Issue access token + refresh token
6. Return `{ user: UserResponseDto, accessToken, refreshToken }`
7. Write `AuditLog` entry with action `REGISTER`

**Login:**
1. Find user by email — throw `UnauthorizedException` with generic message if not found (do not leak whether email exists)
2. Verify `bcrypt.compare(password, user.hashedPassword)`
3. Check `user.isActive === true` — throw `UnauthorizedException` if inactive
4. Issue access token + refresh token
5. Return `{ user: UserResponseDto, accessToken, refreshToken }`
6. Write `AuditLog` entry with action `LOGIN`

**Refresh:**
1. Receive raw refresh token in request body
2. Hash it and look up in `refresh_tokens` table
3. Validate: exists, not revoked (`revokedAt === null`), not expired (`expiresAt > now()`)
4. Load the associated user, check `isActive`
5. Revoke old refresh token (set `revokedAt = now()`)
6. Issue new access token + new refresh token
7. Return `{ accessToken, refreshToken }`

**Logout:**
1. Receive raw refresh token in request body
2. Hash and find in table
3. Set `revokedAt = now()`
4. Return `{ message: 'Logged out successfully' }`
5. Write `AuditLog` entry with action `LOGOUT`

### JWT Strategy

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Only accept access tokens, not refresh tokens
    if (payload.type !== 'access') throw new UnauthorizedException();

    // Verify user still exists and is active on every request
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive or not found');

    return payload; // Attached to req.user
  }
}
```

---

## 7. API Endpoints — Full Specification

All routes are prefixed `/api/v1`. API versioning is built in from day one.

### 7.1 Auth Routes — `POST /api/v1/auth/...`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user. Returns user + tokens. |
| POST | `/auth/login` | Public | Authenticate. Returns user + tokens. |
| POST | `/auth/refresh` | Public (refresh token in body) | Rotate refresh token. Returns new tokens. |
| POST | `/auth/logout` | Public (refresh token in body) | Revoke refresh token. |
| GET | `/auth/me` | Bearer | Return current user's profile. |

### 7.2 User Routes — `/api/v1/users/...`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/users` | Bearer | ADMIN | List all users. Supports `?page`, `?limit`, `?role`, `?isActive`, `?search` |
| POST | `/users` | Bearer | ADMIN | Create user with specified role. |
| GET | `/users/:id` | Bearer | ADMIN | Get single user by UUID. |
| PUT | `/users/:id` | Bearer | ADMIN | Update user (name, email). |
| PATCH | `/users/:id/role` | Bearer | ADMIN | Change user's role. |
| PATCH | `/users/:id/deactivate` | Bearer | ADMIN | Deactivate user. Revokes all refresh tokens. |
| PATCH | `/users/:id/activate` | Bearer | ADMIN | Reactivate previously deactivated user. |

### 7.3 Record Routes — `/api/v1/records/...`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/records` | Bearer | ALL | List records. VIEWERs see own only. Supports filters (see below). |
| POST | `/records` | Bearer | ANALYST, ADMIN | Create record. `createdById` is auto-set from token. |
| GET | `/records/categories` | Bearer | ALL | List distinct categories in system. |
| GET | `/records/export` | Bearer | ANALYST, ADMIN | Download filtered records as CSV. |
| GET | `/records/:id` | Bearer | ALL | Get single record. Object-level check applies. |
| PUT | `/records/:id` | Bearer | ANALYST, ADMIN | Full update. Object-level check applies. |
| PATCH | `/records/:id` | Bearer | ANALYST, ADMIN | Partial update. Object-level check applies. |
| DELETE | `/records/:id` | Bearer | ANALYST, ADMIN | Soft delete. Object-level check applies. |
| POST | `/records/:id/restore` | Bearer | ADMIN | Restore soft-deleted record. |

**Record List Query Parameters:**

```
page         integer   default: 1         Page number
limit        integer   default: 20, max: 100  Items per page
sortBy       string    default: 'date'    Field to sort by: date | amount | category | createdAt
sortOrder    string    default: 'desc'    asc | desc
type         string                       INCOME | EXPENSE
category     string                       Filter by category (exact match, case-insensitive)
dateFrom     string    ISO 8601 date      Start of date range (inclusive)
dateTo       string    ISO 8601 date      End of date range (inclusive)
amountMin    number                       Minimum amount filter
amountMax    number                       Maximum amount filter
search       string                       Full-text search on description field
```

### 7.4 Dashboard Routes — `/api/v1/dashboard/...`

| Method | Path | Auth | Role | Cache TTL | Description |
|---|---|---|---|---|---|
| GET | `/dashboard/summary` | Bearer | ALL | 5 min | Total income, expenses, net balance, record count |
| GET | `/dashboard/by-category` | Bearer | ALL | 5 min | Income and expense totals per category |
| GET | `/dashboard/monthly-trend` | Bearer | ALL | 5 min | Monthly income/expense for last N months (default 12) |
| GET | `/dashboard/weekly-trend` | Bearer | ALL | 5 min | Weekly income/expense for last N weeks (default 8) |
| GET | `/dashboard/recent-activity` | Bearer | ALL | 2 min | Latest N records (default 10) |
| GET | `/dashboard/top-categories` | Bearer | ALL | 5 min | Top N categories by total spend or income |
| GET | `/dashboard/balance-over-time` | Bearer | ALL | 5 min | Running net balance by month |
| GET | `/dashboard/income-vs-expense` | Bearer | ALL | 5 min | Side-by-side totals with % change from prior period |

### 7.5 Audit Log Routes — `/api/v1/audit-logs/...`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/audit-logs` | Bearer | ADMIN | Paginated list. Supports `?actorId`, `?action`, `?resourceType`, `?dateFrom`, `?dateTo` |
| GET | `/audit-logs/:id` | Bearer | ADMIN | Full detail of single audit event. |

---

## 8. Request & Response Shapes

### RegisterDto

```typescript
class RegisterDto {
  @IsEmail()
  email: string;                        // Valid email format

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
  password: string;
}
```

### LoginDto

```typescript
class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### CreateRecordDto

```typescript
class CreateRecordDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;                       // Stored as NUMERIC(15,2)

  @IsEnum(RecordType)
  type: RecordType;                     // 'INCOME' | 'EXPENSE'

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  category: string;

  @IsDateString()
  date: string;                         // ISO 8601 date string — validated as valid date

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
// Note: createdById is NEVER accepted in the request body. It is always taken from req.user.sub
```

### UpdateRecordDto

```typescript
class UpdateRecordDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(RecordType)
  type: RecordType;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  category: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
```

### PatchRecordDto

```typescript
// All fields from UpdateRecordDto but optional via PartialType
class PatchRecordDto extends PartialType(UpdateRecordDto) {}
```

### RecordResponse

```typescript
// What every record endpoint returns
{
  id: string;           // UUID
  amount: string;       // Decimal serialized as string to preserve precision
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;         // ISO date
  description: string | null;
  createdById: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {          // Nested user on single-record endpoints
    id: string;
    fullName: string;
    email: string;
  };
}
```

### Paginated Response (Generic)

```typescript
// All list endpoints return this shape
{
  data: T[];
  meta: {
    total: number;       // Total records matching filter (before pagination)
    page: number;        // Current page
    limit: number;       // Items per page
    totalPages: number;  // Math.ceil(total / limit)
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### UserResponse

```typescript
// hashedPassword is NEVER included in any response
{
  id: string;
  email: string;
  fullName: string;
  role: 'VIEWER' | 'ANALYST' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### AuthResponse

```typescript
{
  user: UserResponse;
  accessToken: string;    // JWT
  refreshToken: string;   // Raw UUID — client stores this securely
}
```

---

## 9. Business Logic Rules

These are non-negotiable rules that must be enforced in the service layer regardless of role.

### Records

1. `createdById` is always assigned from `req.user.sub` (the JWT). It must never be accepted in the request body. If a client sends `createdById`, ignore it silently.
2. `amount` must be stored as `NUMERIC(15,2)`. Never use JavaScript `number` for money in the database — use Prisma `Decimal`. When serializing to JSON, return `amount` as a string to avoid float precision loss in JavaScript clients.
3. Soft delete: `DELETE /records/:id` sets `isDeleted = true` and `deletedAt = now()`. It does NOT physically delete the row.
4. All record list and single-get queries must include `WHERE is_deleted = false` by default.
5. `GET /records/:id` on a soft-deleted record returns `404 Not Found` (not a 410) unless the caller is ADMIN and explicitly queries deleted records.
6. The `ADMIN` calling `GET /records` can pass `?includeDeleted=true` to see soft-deleted records.
7. `date` on a record is the **transaction date** (when the money moved), not `createdAt` (when it was entered into the system). Both fields exist and serve different purposes.
8. Category comparison is case-insensitive in filters but stored as provided (trimmed, original case).

### Users

9. An ADMIN cannot deactivate themselves. Throw `BadRequestException('Cannot deactivate your own account')`.
10. An ADMIN cannot change their own role. Throw `BadRequestException('Cannot change your own role')`.
11. When a user is deactivated, all their `RefreshToken` rows for that user must have `revokedAt` set to now. This prevents deactivated users with existing refresh tokens from re-acquiring access tokens.
12. User `email` must be unique system-wide. Enforce at DB level (unique constraint in schema) and at service level (return `ConflictException` before the DB error fires).
13. Default role on registration is `VIEWER`. Only an ADMIN can assign `ANALYST` or `ADMIN` roles.

### Auth

14. Login failure (wrong password or email not found) must return the same generic `UnauthorizedException` message: `'Invalid credentials'`. Do not reveal whether the email exists.
15. Refresh token validation must check three things in order: (a) token hash exists in table, (b) `revokedAt IS NULL`, (c) `expiresAt > now()`. If any fail, return `UnauthorizedException('Invalid or expired refresh token')`.

---

## 10. Dashboard & Analytics Logic

All analytics are computed with Prisma raw queries or aggregations on the `financial_records` table where `is_deleted = false`.

### Summary Endpoint — `GET /dashboard/summary`

Query and return:
```typescript
{
  totalIncome: string;        // SUM(amount) WHERE type = 'INCOME'
  totalExpenses: string;      // SUM(amount) WHERE type = 'EXPENSE'
  netBalance: string;         // totalIncome - totalExpenses
  recordCount: number;        // COUNT(*) of non-deleted records
  incomeRecordCount: number;
  expenseRecordCount: number;
}
```

### Category Breakdown — `GET /dashboard/by-category`

```typescript
// Group by category + type, sum amounts
[
  {
    category: string;
    totalIncome: string;
    totalExpense: string;
    netAmount: string;   // totalIncome - totalExpense
    recordCount: number;
  }
]
// Sorted by (totalIncome + totalExpense) descending
```

### Monthly Trend — `GET /dashboard/monthly-trend?months=12`

```typescript
// Group by year-month of the `date` field
// Return last N months even if some months have no records (fill with 0)
[
  {
    month: string;       // Format: "2025-01" (YYYY-MM)
    income: string;
    expense: string;
    net: string;
  }
]
// Ordered chronologically oldest to newest
```

Use this PostgreSQL approach via Prisma `$queryRaw`:
```sql
SELECT
  TO_CHAR(date, 'YYYY-MM') AS month,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
FROM financial_records
WHERE is_deleted = false
  AND date >= DATE_TRUNC('month', NOW() - INTERVAL '11 months')
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month ASC;
```

### Weekly Trend — `GET /dashboard/weekly-trend?weeks=8`

Same pattern as monthly but grouped by ISO week: `TO_CHAR(date, 'IYYY-IW')`.

### Recent Activity — `GET /dashboard/recent-activity?limit=10`

```typescript
// Most recent N records ordered by date DESC, then createdAt DESC
// Include createdBy user (id, fullName)
[
  {
    id: string;
    amount: string;
    type: string;
    category: string;
    date: string;
    description: string | null;
    createdBy: { id: string; fullName: string; };
  }
]
```

### Balance Over Time — `GET /dashboard/balance-over-time`

Running cumulative net balance by month:
```sql
SELECT
  month,
  net,
  SUM(net) OVER (ORDER BY month ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM (
  SELECT
    TO_CHAR(date, 'YYYY-MM') AS month,
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
  FROM financial_records
  WHERE is_deleted = false
  GROUP BY TO_CHAR(date, 'YYYY-MM')
) sub
ORDER BY month ASC;
```

### Income vs Expense — `GET /dashboard/income-vs-expense`

Compare current period vs previous period:
```typescript
// Accept ?period=month|quarter|year (default: month)
{
  current: {
    period: string;        // e.g. "2026-04"
    income: string;
    expense: string;
    net: string;
  };
  previous: {
    period: string;        // e.g. "2026-03"
    income: string;
    expense: string;
    net: string;
  };
  changes: {
    incomeChangePercent: number | null;   // null if previous was 0
    expenseChangePercent: number | null;
    netChangePercent: number | null;
  };
}
```

---

## 11. Caching Strategy — Redis

### Cache Keys

All cache keys follow the pattern: `financeapp:{endpoint}:{params_hash}`

```
financeapp:dashboard:summary
financeapp:dashboard:by-category
financeapp:dashboard:monthly-trend:{months}
financeapp:dashboard:weekly-trend:{weeks}
financeapp:dashboard:recent-activity:{limit}
financeapp:dashboard:balance-over-time
financeapp:dashboard:income-vs-expense:{period}
financeapp:records:categories
```

### TTLs

```
Dashboard aggregations:   300 seconds (5 minutes)
Recent activity:          120 seconds (2 minutes)
Category list:            600 seconds (10 minutes)
```

### Cache Invalidation

On every successful `POST /records`, `PUT /records/:id`, `PATCH /records/:id`, `DELETE /records/:id`, and `POST /records/:id/restore`, invalidate all dashboard cache keys using a wildcard delete:

```typescript
// In records.service.ts after any successful write:
await this.redis.del(await this.redis.keys('financeapp:dashboard:*'));
await this.redis.del('financeapp:records:categories');
```

### Redis Helper Pattern

```typescript
// core usage pattern in dashboard.service.ts
async getSummary(): Promise<SummaryResponse> {
  const cacheKey = 'financeapp:dashboard:summary';
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await this.computeSummary();
  await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}
```

---

## 12. Middleware & Guards

### Global Setup in `main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — transforms and validates all DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw if unknown properties are sent
    transform: true,           // Auto-transform to DTO types
    transformOptions: { enableImplicitConversion: true },
  }));

  // Global exception filter — standardizes all error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Zorvyn Finance Dashboard API')
    .setDescription('Backend API for the Zorvyn FinTech Finance Dashboard System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
```

### Rate Limiting

Install `@nestjs/throttler`. Apply to the entire auth module:

```typescript
// In AuthModule or globally in AppModule
ThrottlerModule.forRoot([{
  ttl: 60000,    // 1 minute window
  limit: 10,     // 10 requests per minute per IP on auth endpoints
}])
```

Apply `@Throttle({ default: { limit: 10, ttl: 60000 } })` on `AuthController`.
All other routes: 100 requests per minute per IP.

### Request ID Middleware

Add a `X-Request-ID` header to every request and response. Use it in audit log metadata for correlation.

```typescript
// common/middleware/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  }
}
```

---

## 13. Validation & Error Handling

### Standard Error Response Shape

Every error from the API — validation, auth, not found, server error — must return this exact JSON structure:

```json
{
  "statusCode": 403,
  "error": "FORBIDDEN",
  "message": "Insufficient permissions for this action",
  "timestamp": "2026-04-01T10:30:00.000Z",
  "path": "/api/v1/records/some-uuid"
}
```

For validation errors, `message` is an array:

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": [
    "amount must be a positive number",
    "type must be one of: INCOME, EXPENSE",
    "date must be a valid ISO 8601 date string"
  ],
  "timestamp": "2026-04-01T10:30:00.000Z",
  "path": "/api/v1/records"
}
```

### Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    const message = exceptionResponse
      ? (typeof exceptionResponse === 'object' && 'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : exceptionResponse)
      : 'Internal server error';

    const errorCode = exceptionResponse
      ? (typeof exceptionResponse === 'object' && 'error' in exceptionResponse
          ? (exceptionResponse as any).error
          : HttpStatus[status])
      : 'INTERNAL_SERVER_ERROR';

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### HTTP Status Codes Used

| Code | When |
|---|---|
| 200 | Successful GET, PATCH, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body returned) |
| 400 | Validation failure, malformed request, business rule violation (e.g. admin deactivating self) |
| 401 | Missing token, invalid token, expired token, invalid credentials, inactive account |
| 403 | Valid token but insufficient role or object-level denial |
| 404 | Resource not found or soft-deleted |
| 409 | Conflict — duplicate email, restore on non-deleted record |
| 422 | Semantically invalid input — date range where start > end |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error — never expose stack trace |

---

## 14. Testing Requirements

Use Jest + Supertest for end-to-end tests. Use a separate test database configured by `DATABASE_URL_TEST` env var. Each test file should reset relevant DB state with `beforeEach` or `beforeAll` hooks.

### Test Structure

```
test/
├── auth.e2e-spec.ts         # 10+ tests
├── records.e2e-spec.ts      # 15+ tests
├── dashboard.e2e-spec.ts    # 8+ tests
├── rbac.e2e-spec.ts         # 12+ tests — most important file
└── jest-e2e.json
```

### Auth Tests (auth.e2e-spec.ts)

- `POST /auth/register` — success, duplicate email, weak password, missing fields
- `POST /auth/login` — success, wrong password, nonexistent email, inactive user
- `POST /auth/refresh` — success, revoked token, expired token, invalid token
- `POST /auth/logout` — success, already revoked token
- `GET /auth/me` — success, no token, expired token

### Record Tests (records.e2e-spec.ts)

- `POST /records` — success as ANALYST, correct `createdById` assignment, validation failures
- `GET /records` — pagination, date filter, type filter, category filter, search
- `GET /records/:id` — found, not found, soft-deleted returns 404
- `PUT /records/:id` — success, not found, invalid data
- `DELETE /records/:id` — soft delete confirmed (row still exists, isDeleted=true)
- `POST /records/:id/restore` — success as ADMIN
- `GET /records/export` — returns CSV with correct headers

### Dashboard Tests (dashboard.e2e-spec.ts)

- Each endpoint returns correct shape
- Summary totals match manually seeded records
- Monthly trend has correct number of months
- Empty state (no records) returns zeros, not errors

### RBAC Tests (rbac.e2e-spec.ts) — Most Important

Every forbidden action must be tested explicitly:

```typescript
describe('RBAC Enforcement', () => {
  it('VIEWER cannot create a record — 403', ...)
  it('VIEWER cannot update a record — 403', ...)
  it('VIEWER cannot delete a record — 403', ...)
  it('VIEWER cannot access /users — 403', ...)
  it('VIEWER cannot access another user\'s record — 403', ...)
  it('ANALYST cannot access /users — 403', ...)
  it('ANALYST cannot update another user\'s record — 403', ...)
  it('ANALYST cannot delete another user\'s record — 403', ...)
  it('ANALYST cannot change user roles — 403', ...)
  it('ANALYST cannot view audit logs — 403', ...)
  it('Inactive user with valid token is rejected — 401', ...)
  it('Deactivated user cannot login — 401', ...)
})
```

---

## 15. Environment Variables

Create `.env.example` with all of these. Never commit `.env`.

```env
# Application
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finance_db
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/finance_db_test

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-this-to-a-very-long-random-string-in-production-min-64-chars
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=7

# Rate Limiting
AUTH_RATE_LIMIT_TTL=60000
AUTH_RATE_LIMIT_MAX=10
GLOBAL_RATE_LIMIT_TTL=60000
GLOBAL_RATE_LIMIT_MAX=100

# Seed (used by prisma/seed.ts only)
SEED_ADMIN_EMAIL=admin@zorvyn.io
SEED_ADMIN_PASSWORD=Admin@123456
SEED_ADMIN_FULL_NAME=System Admin
```

---

## 16. Docker Setup

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  api:
    build: .
    container_name: finance_api
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/finance_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ACCESS_TOKEN_EXPIRES_IN: 15m
      REFRESH_TOKEN_EXPIRES_IN_DAYS: 7
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: sh -c "npx prisma migrate deploy && npm run start:dev"

  postgres:
    image: postgres:16-alpine
    container_name: finance_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: finance_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: finance_redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Local Setup Commands (for README)

```bash
# 1. Clone the repository
git clone <repo-url>
cd finance-backend

# 2. Copy environment file
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string

# 3. Start all services
docker compose up --build

# 4. Run database migrations (first time only)
docker compose exec api npx prisma migrate deploy

# 5. Seed demo data
docker compose exec api npx ts-node prisma/seed.ts

# 6. Access API documentation
open http://localhost:3000/docs
```

---

## 17. Seed Data Specification

The seed script at `prisma/seed.ts` must create the following. Use `upsert` so it is safe to re-run.

### Users (5 total)

```
email: admin@zorvyn.io        | role: ADMIN    | fullName: System Admin       | password: Admin@123456
email: analyst1@zorvyn.io     | role: ANALYST  | fullName: Priya Sharma       | password: Analyst@123
email: analyst2@zorvyn.io     | role: ANALYST  | fullName: Rahul Mehta        | password: Analyst@123
email: viewer1@zorvyn.io      | role: VIEWER   | fullName: Aisha Khan         | password: Viewer@123
email: viewer2@zorvyn.io      | role: VIEWER   | fullName: Dev Patel          | password: Viewer@123
```

### Financial Records (200 total)

Generate records programmatically with this distribution:
- Spread across the last 12 months (roughly even distribution)
- 6 categories: `Payroll`, `Marketing`, `Revenue`, `Utilities`, `Tax`, `Operations`
- Mix of `INCOME` and `EXPENSE`: 40% income, 60% expense
- Amount range: income ₹10,000–₹500,000 | expense ₹1,000–₹200,000
- `createdById`: split between analyst1 and analyst2 (100 records each)
- Some records (10%) should be soft-deleted to test admin restore functionality

This seed data ensures that every dashboard endpoint returns meaningful, non-trivial aggregations immediately after setup.

---

## 18. Requirements README

The `README.md` at the root of the project must include these sections:

1. **Project Overview** — what it does, tech stack table
2. **Architecture** — brief description of layered architecture (controller → service → repository via Prisma)
3. **Features** — bullet list of all implemented features
4. **Prerequisites** — Node 20, Docker, Git
5. **Quick Start (Docker)** — the 6 commands from section 16
6. **Quick Start (Local)** — without Docker, manual DB setup
7. **Environment Variables** — table of all vars with description and example
8. **API Documentation** — link to `/docs` (Swagger), brief description of auth flow
9. **Running Tests** — `npm run test:e2e` command, what each test file covers
10. **Default Credentials** — the seed user credentials (admin, analyst, viewer)
11. **Assumptions & Design Decisions** — section 19 of this document, summarised

---

## 19. README Requirements

The README must be written as if the reader has never seen this project before and is a Zorvyn engineer evaluating the submission. It should convey confidence, not just instructions. Include:

- One-line project description that mentions FinTech and Zorvyn context
- Why NestJS was chosen over Express/Django (3 bullet points max)
- A note on financial data precision (NUMERIC vs float)
- A note on the audit trail and why it matters for FinTech compliance
- Link to live Swagger docs if deployed

---

## 20. Assumptions & Decisions

Document these in the README under "Design Decisions":

1. **Single currency**: All amounts are in a single currency (INR implied). Multi-currency would require a `currency` field and an exchange rate service — noted as a future enhancement.

2. **Single tenant**: All users share one financial dataset. Multi-tenancy (organisation-scoped data) is architecturally prepared for — adding an `orgId` field is a one-table change — but out of scope for this submission.

3. **VIEWER scope**: VIEWERs can only see their own records. If the requirement were for VIEWERs to see all records read-only, the object-level permission check in `RecordService.findOneOrThrow` is the only line that changes.

4. **Soft delete is the only delete**: Hard physical deletion of financial records is not exposed in the API. Financial data must remain recoverable for compliance and audit purposes. Admins can restore soft-deleted records.

5. **Transaction date vs ingestion date**: The `date` field on a record is when the money actually moved, not when the record was created. This supports backdated entry, which is standard practice in real accounting systems.

6. **JWT role claim**: The user's `role` is embedded in the JWT access token. This means role changes take effect when the current access token expires (max 15 minutes). This is a deliberate trade-off — it avoids a DB lookup on every request. If immediate role revocation is needed, reducing token TTL or adding a token blocklist would be the solution.

7. **Refresh token as raw UUID**: Refresh tokens are random UUIDs, not JWTs. This means they carry no claims — validation requires a DB lookup. This is intentional: it enables server-side revocation, which JWTs alone cannot provide.

8. **Decimal serialisation**: Prisma returns `Decimal` objects for `NUMERIC` fields. These are serialised to `string` in all API responses to prevent JavaScript float precision loss on the client side. Clients must treat `amount` as a string and parse it with a decimal library if arithmetic is needed client-side.

9. **Pagination default limit**: Default is 20 records per page, max 100. This prevents accidental full-table scans from unparameterised list requests.

10. **Redis cache invalidation strategy**: All dashboard caches are invalidated on any write to `financial_records`. This is a slightly aggressive invalidation strategy (fine-grained per-category invalidation would be more efficient) but simpler to implement correctly. For the data volumes in scope, the simplicity trade-off is correct.

---

*End of Product Requirements Document*  
*Version 1.0 — April 2026 — Zorvyn FinTech Backend Internship Assessment*
