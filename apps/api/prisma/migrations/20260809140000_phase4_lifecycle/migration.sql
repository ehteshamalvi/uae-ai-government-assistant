-- AlterEnum TransactionStatus
DO $$ BEGIN
  ALTER TYPE "TransactionStatus" ADD VALUE 'PROCESSING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "TransactionStatus" ADD VALUE 'COMPLETED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum PaymentStatus
DO $$ BEGIN
  ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum AuditAction
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_COMPLETED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_FAILED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'STATUS_CHANGED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'SANDBOX_ADVANCED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Transaction
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "submissionReference" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "reviewConfirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_submissionReference_key" ON "Transaction"("submissionReference");
