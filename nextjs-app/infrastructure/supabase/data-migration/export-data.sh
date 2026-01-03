#!/bin/bash
# Data Export Script for Azure PostgreSQL to Supabase Migration
# This script exports all data from Azure PostgreSQL in the correct order

set -e  # Exit on error

# Configuration - Update these values
AZURE_HOST="${AZURE_DB_HOST:-your-azure-host.postgres.database.azure.com}"
AZURE_DB="${AZURE_DB_NAME:-sunnyseat}"
AZURE_USER="${AZURE_DB_USER:-your-username}"
AZURE_PORT="${AZURE_DB_PORT:-5432}"
EXPORT_DIR="${EXPORT_DIR:-./exports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create export directory
mkdir -p "$EXPORT_DIR"

echo "=========================================="
echo "SunnySeat Data Export Script"
echo "=========================================="
echo "Source: Azure PostgreSQL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Prompt for password if not set
if [ -z "$AZURE_DB_PASSWORD" ]; then
    echo "Enter Azure PostgreSQL password:"
    read -s AZURE_DB_PASSWORD
    export PGPASSWORD="$AZURE_DB_PASSWORD"
else
    export PGPASSWORD="$AZURE_DB_PASSWORD"
fi

# Export order: Tables with no dependencies first, then dependent tables
# Order: venues, buildings, admin_users, weather_slices (no FKs)
#        → patios (FK: venues)
#        → venue_quality_metrics (FK: venues)
#        → sun_windows (FK: patios)
#        → feedback (FK: patios, venues)
#        → processed_weather (FK: weather_slices)
#        → precomputed_sun_exposure (FK: patios)
#        → precomputation_schedules (no FKs)

echo "Step 1: Exporting independent tables (no foreign keys)..."
echo ""

# Export venues (no dependencies)
echo "  → Exporting venues..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=venues \
  --file="$EXPORT_DIR/01_venues_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export buildings (no dependencies)
echo "  → Exporting buildings..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=buildings \
  --file="$EXPORT_DIR/02_buildings_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export admin_users (no dependencies)
echo "  → Exporting admin_users..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=admin_users \
  --file="$EXPORT_DIR/03_admin_users_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export weather_slices (no dependencies)
echo "  → Exporting weather_slices..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=weather_slices \
  --file="$EXPORT_DIR/04_weather_slices_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export precomputation_schedules (no dependencies)
echo "  → Exporting precomputation_schedules..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=precomputation_schedules \
  --file="$EXPORT_DIR/05_precomputation_schedules_$TIMESTAMP.sql" \
  --no-owner --no-privileges

echo ""
echo "Step 2: Exporting dependent tables (with foreign keys)..."
echo ""

# Export patios (depends on venues)
echo "  → Exporting patios..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=patios \
  --file="$EXPORT_DIR/06_patios_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export venue_quality_metrics (depends on venues)
echo "  → Exporting venue_quality_metrics..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=venue_quality_metrics \
  --file="$EXPORT_DIR/07_venue_quality_metrics_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export sun_windows (depends on patios)
echo "  → Exporting sun_windows..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=sun_windows \
  --file="$EXPORT_DIR/08_sun_windows_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export feedback (depends on patios, venues)
echo "  → Exporting feedback..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=feedback \
  --file="$EXPORT_DIR/09_feedback_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export processed_weather (depends on weather_slices)
echo "  → Exporting processed_weather..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=processed_weather \
  --file="$EXPORT_DIR/10_processed_weather_$TIMESTAMP.sql" \
  --no-owner --no-privileges

# Export precomputed_sun_exposure (depends on patios)
echo "  → Exporting precomputed_sun_exposure..."
pg_dump --data-only --column-inserts \
  --host="$AZURE_HOST" \
  --port="$AZURE_PORT" \
  --dbname="$AZURE_DB" \
  --username="$AZURE_USER" \
  --table=precomputed_sun_exposure \
  --file="$EXPORT_DIR/11_precomputed_sun_exposure_$TIMESTAMP.sql" \
  --no-owner --no-privileges

echo ""
echo "=========================================="
echo "Export Complete!"
echo "=========================================="
echo "Export directory: $EXPORT_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "Exported files:"
ls -lh "$EXPORT_DIR"/*_$TIMESTAMP.sql
echo ""
echo "Next steps:"
echo "1. Review exported files"
echo "2. Run import script: ./import-data.sh"
echo ""
