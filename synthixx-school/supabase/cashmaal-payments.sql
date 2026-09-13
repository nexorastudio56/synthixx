-- CashMaal payment gateway support for Synthixx School.
-- Extends the EXISTING fee_payments table (no new table needed).
-- Apply this once in the Supabase SQL editor (Dashboard > SQL).
--
-- It is safe to run twice: every statement is additive / guarded.

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS student_id uuid,
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
  ADD COLUMN IF NOT EXISTS gateway_order_id text,
  ADD COLUMN IF NOT EXISTS initiated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS marked_by text,
  ADD COLUMN IF NOT EXISTS marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS mark_reason text;

-- If a legacy check constraint restricted gateway/status to the old values,
-- drop it (the wider constraint below replaces it).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.fee_payments'::regclass AND contype = 'c'
  LOOP
    IF c.def ILIKE '%cashmaal%' OR c.def ILIKE '%jazzcash%' OR c.def ILIKE '%pending%' THEN
      EXECUTE format('ALTER TABLE public.fee_payments DROP CONSTRAINT %I', c.conname);
    END IF;
  END LOOP;
END $$;

-- Guarantee the constraint names below are free, then add wider checks.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.fee_payments'::regclass AND conname = 'fee_payments_gateway_check'
  ) THEN
    ALTER TABLE public.fee_payments DROP CONSTRAINT fee_payments_gateway_check;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.fee_payments'::regclass AND conname = 'fee_payments_status_check'
  ) THEN
    ALTER TABLE public.fee_payments DROP CONSTRAINT fee_payments_status_check;
  END IF;
END $$;

ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_gateway_check CHECK (gateway IN ('jazzcash', 'easypaisa', 'cashmaal', 'bank_transfer')),
  ADD CONSTRAINT fee_payments_status_check CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'));

COMMENT ON TABLE public.fee_payments IS 'Payment attempts/transactions. status: pending, processing, paid, failed, cancelled, refunded. gateway: jazzcash, easypaisa, cashmaal, bank_transfer.';
COMMENT ON COLUMN public.fee_payments.gateway_transaction_id IS 'Gateway transaction id (e.g. CashMaal CM_TID).';
COMMENT ON COLUMN public.fee_payments.gateway_order_id IS 'Gateway order id (same as txn_ref for hosted gateways).';
COMMENT ON COLUMN public.fee_payments.payment_method IS 'Payment method label, e.g. JazzCash / EasyPaisa / Bank Transfer.';
COMMENT ON COLUMN public.fee_payments.payer_email IS 'Email of the payer used to initiate the payment.';
COMMENT ON COLUMN public.fee_payments.marked_by IS 'User email or id who manually marked this payment (for audit trail).';
COMMENT ON COLUMN public.fee_payments.marked_at IS 'Timestamp when admin manually marked this payment (for audit trail).';
COMMENT ON COLUMN public.fee_payments.mark_reason IS 'Reason for manual payment marking (e.g., "Bank transfer verified", "Check received").';
COMMENT ON COLUMN public.fee_payments.initiated_at IS 'When the payment attempt was initiated with the gateway.';
COMMENT ON COLUMN public.fee_payments.paid_at IS 'When the payment was confirmed as paid (gateway or manual).';
COMMENT ON COLUMN public.fee_payments.failed_at IS 'When the payment was marked as failed.';
COMMENT ON COLUMN public.fee_payments.cancelled_at IS 'When the payment was cancelled.';