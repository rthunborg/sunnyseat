-- Story 9.5: Add partner venue fields for Golden Pin styling
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_url VARCHAR(500);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
