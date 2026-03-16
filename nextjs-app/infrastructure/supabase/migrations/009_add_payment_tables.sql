-- 009: Add payment tables for Swish integration
-- Story 9.8: Swish Payment Integration

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  swish_payment_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL DEFAULT 39.00,
  currency VARCHAR(3) DEFAULT 'SEK',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_purchases_session_id ON purchases(session_id);
CREATE INDEX idx_purchases_swish_payment_id ON purchases(swish_payment_id);

CREATE TABLE IF NOT EXISTS user_premium_status (
  session_id VARCHAR(100) PRIMARY KEY,
  is_premium BOOLEAN DEFAULT FALSE,
  purchase_id UUID REFERENCES purchases(id),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
