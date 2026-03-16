-- Admin audit trail for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_actions (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "AdminUser" VARCHAR(100) NOT NULL,
  "Action" VARCHAR(100) NOT NULL,
  "VenueId" VARCHAR(100),
  "Details" JSONB DEFAULT '{}'::jsonb,
  "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at
  ON admin_actions ("CreatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_admin_actions_venue_id
  ON admin_actions ("VenueId") WHERE "VenueId" IS NOT NULL;

COMMENT ON TABLE admin_actions IS 'Audit trail for admin actions on venues and other entities';
