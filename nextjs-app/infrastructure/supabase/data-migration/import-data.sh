#!/bin/bash
# Data Import Script for Supabase Migration
# This script imports exported data to Supabase in the correct order

set -e  # Exit on error

# Configuration - Update these values
SUPABASE_HOST="${SUPABASE_DB_HOST:-db.your-project.supabase.co}"
SUPABASE_DB="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_PORT="${SUPABASE_DB_PORT:-6543}"  # Use connection pooler port
EXPORT_DIR="${EXPORT_DIR:-./exports}"
TIMESTAMP="${1:-latest}"  # Use timestamp from export or 'latest' for most recent

echo "=========================================="
echo "SunnySeat Data Import Script"
echo "=========================================="
echo "Destination: Supabase"
echo "Export directory: $EXPORT_DIR"
echo ""

# Find latest export if timestamp is 'latest'
if [ "$TIMESTAMP" = "latest" ]; then
    LATEST_FILE=$(ls -t "$EXPORT_DIR"/01_venues_*.sql 2>/dev/null | head -1)
    if [ -z "$LATEST_FILE" ]; then
        echo "Error: No export files found in $EXPORT_DIR"
        exit 1
    fi
    TIMESTAMP=$(echo "$LATEST_FILE" | sed -n 's/.*01_venues_\(.*\)\.sql/\1/p')
    echo "Using latest export timestamp: $TIMESTAMP"
fi

# Prompt for password if not set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Enter Supabase database password:"
    read -s SUPABASE_DB_PASSWORD
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
else
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
fi

# Verify export files exist
echo "Verifying export files..."
for i in {01..11}; do
    case $i in
        01) TABLE="venues" ;;
        02) TABLE="buildings" ;;
        03) TABLE="admin_users" ;;
        04) TABLE="weather_slices" ;;
        05) TABLE="precomputation_schedules" ;;
        06) TABLE="patios" ;;
        07) TABLE="venue_quality_metrics" ;;
        08) TABLE="sun_windows" ;;
        09) TABLE="feedback" ;;
        10) TABLE="processed_weather" ;;
        11) TABLE="precomputed_sun_exposure" ;;
    esac
    
    FILE="$EXPORT_DIR/${i}_${TABLE}_${TIMESTAMP}.sql"
    if [ ! -f "$FILE" ]; then
        echo "Warning: Export file not found: $FILE"
    fi
done

echo ""
echo "Step 1: Importing independent tables (no foreign keys)..."
echo ""

# Import in dependency order
IMPORT_ORDER=(
    "01_venues"
    "02_buildings"
    "03_admin_users"
    "04_weather_slices"
    "05_precomputation_schedules"
    "06_patios"
    "07_venue_quality_metrics"
    "08_sun_windows"
    "09_feedback"
    "10_processed_weather"
    "11_precomputed_sun_exposure"
)

for FILE_PREFIX in "${IMPORT_ORDER[@]}"; do
    FILE="$EXPORT_DIR/${FILE_PREFIX}_${TIMESTAMP}.sql"
    if [ -f "$FILE" ]; then
        TABLE_NAME=$(echo "$FILE_PREFIX" | sed 's/^[0-9]*_//')
        echo "  → Importing $TABLE_NAME..."
        psql \
          --host="$SUPABASE_HOST" \
          --port="$SUPABASE_PORT" \
          --dbname="$SUPABASE_DB" \
          --username="$SUPABASE_USER" \
          --file="$FILE" \
          --quiet
        echo "    ✓ $TABLE_NAME imported"
    else
        echo "  ⚠ Skipping $FILE_PREFIX (file not found)"
    fi
done

echo ""
echo "=========================================="
echo "Import Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run validation script: ./validate-data.sh"
echo "2. Verify data integrity"
echo ""
