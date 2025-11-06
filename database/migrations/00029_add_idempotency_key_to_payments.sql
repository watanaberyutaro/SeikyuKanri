-- ============================================================================
-- Migration: 00029_add_idempotency_key_to_payments.sql
-- Description: Add idempotency_key column to payments table for bank API integration
-- Date: 2025-11-06
-- ============================================================================

-- Add idempotency_key column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key to prevent duplicates
-- Partial index excludes NULL values (existing payments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
ON payments(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN payments.idempotency_key IS '重複防止キー（銀行API連携用）';

-- ============================================================================
-- Migration Complete
-- ============================================================================
