-- Venue confirmations for crowdsourcing verification
-- Users can confirm candidate venues; auto-verify at 3+ confirmations

CREATE TABLE IF NOT EXISTS venue_confirmations (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "VenueId" INTEGER NOT NULL REFERENCES venues("Id") ON DELETE CASCADE,
  "IpHash" VARCHAR(64) NOT NULL,
  "UserAgent" TEXT,
  "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_venue_confirmations_venue_ip UNIQUE ("VenueId", "IpHash")
);

CREATE INDEX IF NOT EXISTS idx_venue_confirmations_venue_id
  ON venue_confirmations ("VenueId");

COMMENT ON TABLE venue_confirmations IS 'Tracks user confirmations of candidate venues for crowdsource verification';
COMMENT ON COLUMN venue_confirmations."IpHash" IS 'SHA-256 hash of user IP for rate limiting (one confirmation per IP per venue)';
