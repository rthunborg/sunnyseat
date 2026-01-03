#!/bin/bash
# Get Row Counts from Source Database
# This script exports row counts from Azure PostgreSQL for comparison

set -e

# Configuration
AZURE_HOST="${AZURE_DB_HOST:-your-azure-host.postgres.database.azure.com}"
AZURE_DB="${AZURE_DB_NAME:-sunnyseat}"
AZURE_USER="${AZURE_DB_USER:-your-username}"
AZURE_PORT="${AZURE_DB_PORT:-5432}"
OUTPUT_FILE="${OUTPUT_FILE:-./row-counts-source.txt}"

echo "Getting row counts from Azure PostgreSQL..."
echo ""

if [ -z "$AZURE_DB_PASSWORD" ]; then
    echo "Enter Azure PostgreSQL password:"
    read -s AZURE_DB_PASSWORD
    export PGPASSWORD="$AZURE_DB_PASSWORD"
else
    export PGPASSWORD="$AZURE_DB_PASSWORD"
fi

# Get row counts for all tables
psql --host="$AZURE_HOST" --port="$AZURE_PORT" --dbname="$AZURE_DB" --username="$AZURE_USER" -t -c "
SELECT 
    'venues' as table_name, COUNT(*) as row_count FROM venues
UNION ALL
SELECT 'patios', COUNT(*) FROM patios
UNION ALL
SELECT 'buildings', COUNT(*) FROM buildings
UNION ALL
SELECT 'venue_quality_metrics', COUNT(*) FROM venue_quality_metrics
UNION ALL
SELECT 'sun_windows', COUNT(*) FROM sun_windows
UNION ALL
SELECT 'weather_slices', COUNT(*) FROM weather_slices
UNION ALL
SELECT 'processed_weather', COUNT(*) FROM processed_weather
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL
SELECT 'precomputed_sun_exposure', COUNT(*) FROM precomputed_sun_exposure
UNION ALL
SELECT 'precomputation_schedules', COUNT(*) FROM precomputation_schedules
ORDER BY table_name;
" > "$OUTPUT_FILE"

echo "Row counts saved to: $OUTPUT_FILE"
cat "$OUTPUT_FILE"
