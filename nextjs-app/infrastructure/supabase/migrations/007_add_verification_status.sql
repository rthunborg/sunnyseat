-- Add verification status and OSM tracking columns to venues
-- verification_status: 0 = Candidate (from OSM), 1 = Verified (admin-approved)
-- osm_node_id: unique OSM node identifier for duplicate detection

ALTER TABLE venues ADD COLUMN IF NOT EXISTS "VerificationStatus" INTEGER DEFAULT 1;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS "OsmNodeId" BIGINT;

-- Unique partial index on OSM node ID for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_osm_node_id
  ON venues ("OsmNodeId") WHERE "OsmNodeId" IS NOT NULL;

COMMENT ON COLUMN venues."VerificationStatus" IS '0=Candidate (from OSM import), 1=Verified (admin-approved)';
COMMENT ON COLUMN venues."OsmNodeId" IS 'OpenStreetMap node ID for duplicate detection';
