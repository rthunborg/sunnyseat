-- seed-dev.sql — Sample Gothenburg venues, patios, and buildings for local development
-- Run against a local or dev Supabase instance after migrations

-- ============================================================================
-- VENUES (5 Gothenburg neighbourhoods)
-- ============================================================================
INSERT INTO venues ("Name", "Address", "Phone", "Website", "Type", "Description", "Location", "IsActive", "IsMapped")
VALUES
  ('Magasinsgatan Café', 'Magasinsgatan 17, 411 18 Göteborg', '031-123456', 'https://example.com/magasinsgatan', 1, 'Populärt fik på Magasinsgatan med solig uteservering.', ST_SetSRID(ST_MakePoint(11.9674, 57.7045), 4326)::geography, true, true),
  ('Haga Espresso', 'Haga Nygata 24, 413 01 Göteborg', '031-234567', 'https://example.com/haga', 1, 'Mysigt kafé i hjärtat av Haga.', ST_SetSRID(ST_MakePoint(11.9536, 57.6983), 4326)::geography, true, true),
  ('Linné Bistro', 'Linnégatan 42, 413 08 Göteborg', '031-345678', 'https://example.com/linne', 2, 'Bistro med stor uteservering längs Linnégatan.', ST_SetSRID(ST_MakePoint(11.9485, 57.6943), 4326)::geography, true, true),
  ('Majorna Krog', 'Karl Johansgatan 66, 414 55 Göteborg', '031-456789', 'https://example.com/majorna', 2, 'Klassisk krog i Majorna med kvällssol.', ST_SetSRID(ST_MakePoint(11.9280, 57.6925), 4326)::geography, true, true),
  ('Vasastan Bar & Grill', 'Vasagatan 38, 411 37 Göteborg', '031-567890', 'https://example.com/vasastan', 2, 'Grill med uteservering nära Vasaplatsen.', ST_SetSRID(ST_MakePoint(11.9720, 57.6985), 4326)::geography, true, true);

-- ============================================================================
-- PATIOS (one per venue, simple rectangular polygons near venue coords)
-- ============================================================================
INSERT INTO patios ("VenueId", "Name", "Geometry", "HeightM", "HeightSource", "PolygonQuality", "Orientation", "Notes", "ReviewNeeded")
VALUES
  (1, 'Magasinsgatan uteservering', ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.96730, 57.70445),
    ST_MakePoint(11.96750, 57.70445),
    ST_MakePoint(11.96750, 57.70455),
    ST_MakePoint(11.96730, 57.70455),
    ST_MakePoint(11.96730, 57.70445)
  ])), 4326)::geography, 0.0, 0, 0.85, 'S', NULL, false),

  (2, 'Haga uteservering', ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.95350, 57.69825),
    ST_MakePoint(11.95375, 57.69825),
    ST_MakePoint(11.95375, 57.69835),
    ST_MakePoint(11.95350, 57.69835),
    ST_MakePoint(11.95350, 57.69825)
  ])), 4326)::geography, 0.0, 0, 0.80, 'SW', NULL, false),

  (3, 'Linné uteservering', ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.94840, 57.69425),
    ST_MakePoint(11.94865, 57.69425),
    ST_MakePoint(11.94865, 57.69438),
    ST_MakePoint(11.94840, 57.69438),
    ST_MakePoint(11.94840, 57.69425)
  ])), 4326)::geography, 0.0, 0, 0.90, 'W', NULL, false),

  (4, 'Majorna uteservering', ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.92790, 57.69245),
    ST_MakePoint(11.92815, 57.69245),
    ST_MakePoint(11.92815, 57.69255),
    ST_MakePoint(11.92790, 57.69255),
    ST_MakePoint(11.92790, 57.69245)
  ])), 4326)::geography, 0.0, 0, 0.75, 'W', NULL, false),

  (5, 'Vasastan uteservering', ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.97190, 57.69845),
    ST_MakePoint(11.97215, 57.69845),
    ST_MakePoint(11.97215, 57.69858),
    ST_MakePoint(11.97190, 57.69858),
    ST_MakePoint(11.97190, 57.69845)
  ])), 4326)::geography, 0.0, 0, 0.82, 'SE', NULL, false);

-- ============================================================================
-- BUILDINGS (nearby structures that cast shadows on the patios)
-- ============================================================================
INSERT INTO buildings ("Geometry", "Height", "HeightM", "HeightSource", "Source", "QualityScore", "ExternalId", "BuildingType")
VALUES
  -- Building south of Magasinsgatan patio
  (ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.96720, 57.70430),
    ST_MakePoint(11.96760, 57.70430),
    ST_MakePoint(11.96760, 57.70440),
    ST_MakePoint(11.96720, 57.70440),
    ST_MakePoint(11.96720, 57.70430)
  ])), 4326)::geography, 18.0, 18.0, 1, 'lantmateriet', 0.900, 'bldg-mag-001', 'commercial'),

  -- Building west of Haga patio
  (ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.95320, 57.69820),
    ST_MakePoint(11.95345, 57.69820),
    ST_MakePoint(11.95345, 57.69840),
    ST_MakePoint(11.95320, 57.69840),
    ST_MakePoint(11.95320, 57.69820)
  ])), 4326)::geography, 14.0, 14.0, 1, 'lantmateriet', 0.850, 'bldg-haga-001', 'residential'),

  -- Building east of Linné patio
  (ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.94870, 57.69420),
    ST_MakePoint(11.94900, 57.69420),
    ST_MakePoint(11.94900, 57.69440),
    ST_MakePoint(11.94870, 57.69440),
    ST_MakePoint(11.94870, 57.69420)
  ])), 4326)::geography, 20.0, 20.0, 1, 'lantmateriet', 0.920, 'bldg-linne-001', 'commercial'),

  -- Building north of Majorna patio
  (ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.92785, 57.69260),
    ST_MakePoint(11.92820, 57.69260),
    ST_MakePoint(11.92820, 57.69275),
    ST_MakePoint(11.92785, 57.69275),
    ST_MakePoint(11.92785, 57.69260)
  ])), 4326)::geography, 12.0, 12.0, 1, 'lantmateriet', 0.800, 'bldg-maj-001', 'residential'),

  -- Building west of Vasastan patio
  (ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(11.97160, 57.69840),
    ST_MakePoint(11.97185, 57.69840),
    ST_MakePoint(11.97185, 57.69862),
    ST_MakePoint(11.97160, 57.69862),
    ST_MakePoint(11.97160, 57.69840)
  ])), 4326)::geography, 22.0, 22.0, 1, 'lantmateriet', 0.880, 'bldg-vasa-001', 'commercial');

-- ============================================================================
-- ADMIN USERS (dev only — password: Test123!)
-- ============================================================================
INSERT INTO admin_users ("Username", "Email", "PasswordHash", "Role", "IsActive", "Claims", "LastLoginAt")
VALUES (
  'admin',
  'admin@sunnyseat.se',
  '$2b$10$P6bX4mtKTGjPOQVWURjjGulaaFRL5UZN9rl4AUbY8MJJn/H16Pw.a',
  'Admin',
  true,
  '[]'::jsonb,
  NOW()
);
