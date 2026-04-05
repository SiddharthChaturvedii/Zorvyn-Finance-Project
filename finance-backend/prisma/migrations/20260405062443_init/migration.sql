-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REGISTER', 'LOGIN', 'LOGOUT', 'CREATE_RECORD', 'UPDATE_RECORD', 'DELETE_RECORD', 'RESTORE_RECORD', 'CREATE_USER', 'UPDATE_USER', 'CHANGE_ROLE', 'DEACTIVATE_USER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_records" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "RecordType" NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "financial_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "financial_records_is_deleted_idx" ON "financial_records"("is_deleted");

-- CreateIndex
CREATE INDEX "financial_records_date_idx" ON "financial_records"("date");

-- CreateIndex
CREATE INDEX "financial_records_category_idx" ON "financial_records"("category");

-- CreateIndex
CREATE INDEX "financial_records_type_idx" ON "financial_records"("type");

-- CreateIndex
CREATE INDEX "financial_records_created_by_idx" ON "financial_records"("created_by");

-- CreateIndex
CREATE INDEX "financial_records_date_type_idx" ON "financial_records"("date", "type");

-- CreateIndex
CREATE INDEX "financial_records_category_type_idx" ON "financial_records"("category", "type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
