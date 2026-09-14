-- School subscriptions table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS school_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id         text NOT NULL,            -- 'test','starter','growth','enterprise'
  status          text NOT NULL DEFAULT 'pending',  -- 'pending','active','expired','cancelled'
  amount          numeric(10,2),
  gateway         text,
  gateway_order_id text,
  activated_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_subscriptions_school_id_idx ON school_subscriptions(school_id);

ALTER TABLE school_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role (backend) has full access — no public policies needed
