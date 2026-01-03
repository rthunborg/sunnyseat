#!/bin/bash
# Test Migration with Small Dataset
# This script exports and imports a small sample dataset for testing

set -e

AZURE_HOST="${AZURE_DB_HOST:-your-azure-host.postgres.database.azure.com}"
AZURE_DB="${AZURE_DB_NAME:-sunnyseat}"
AZURE_USER="${AZURE_DB_USER:-your-username}"
SUPABASE_HOST="${SUPABASE_DB_HOST:-db.your-project.supabase.co}"
SUPABASE_DB="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_PORT="${SUPABASE_DB_PORT:-6543}"
EXPORT_DIR="./test-exports"
SAMPLE_SIZE=10

echo "=========================================="
echo "Small Dataset Migration Test"
echo "=========================================="
echo "Sample size: $SAMPLE_SIZE records per table"
echo ""

# Create test export directory
mkdir -p "$EXPORT_DIR"

# Prompt for passwords
if [ -z "$AZURE_DB_PASSWORD" ]; then
    echo "Enter Azure PostgreSQL password:"
    read -s AZURE_DB_PASSWORD
    export PGPASSWORD="$AZURE_DB_PASSWORD"
else
    export PGPASSWORD="$AZURE_DB_PASSWORD"
fi

echo "Step 1: Exporting sample data from Azure PostgreSQL..."
echo ""

# Export sample venues
echo "  → Exporting sample venues (first $SAMPLE_SIZE)..."
psql --host="$AZURE_HOST" --dbname="$AZURE_DB" --username="$AZURE_USER" -c "
COPY (
    SELECT * FROM venues ORDER BY \"Id\" LIMIT $SAMPLE_SIZE
) TO STDOUT WITH CSV HEADER
" > "$EXPORT_DIR/test_venues.csv"

# Export sample patios (for venues we just exported)
echo "  → Exporting sample patios..."
psql --host="$AZURE_HOST" --dbname="$AZURE_DB" --username="$AZURE_USER" -c "
COPY (
    SELECT p.* FROM patios p
    INNER JOIN (
        SELECT \"Id\" FROM venues ORDER BY \"Id\" LIMIT $SAMPLE_SIZE
    ) v ON p.\"VenueId\" = v.\"Id\"
    LIMIT $SAMPLE_SIZE
) TO STDOUT WITH CSV HEADER
" > "$EXPORT_DIR/test_patios.csv"

# Export sample buildings
echo "  → Exporting sample buildings (first $SAMPLE_SIZE)..."
psql --host="$AZURE_HOST" --dbname="$AZURE_DB" --username="$AZURE_USER" -c "
COPY (
    SELECT * FROM buildings ORDER BY \"Id\" LIMIT $SAMPLE_SIZE
) TO STDOUT WITH CSV HEADER
" > "$EXPORT_DIR/test_buildings.csv"

echo ""
echo "Step 2: Importing sample data to Supabase..."
echo ""

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Enter Supabase database password:"
    read -s SUPABASE_DB_PASSWORD
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
else
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
fi

# Note: CSV import requires COPY command which may need special handling
# For testing, you may want to use INSERT statements instead
echo "  → Sample data exported to $EXPORT_DIR"
echo "  → Review files and import manually or use psql COPY command"
echo ""
echo "Test export complete!"
echo ""
echo "Next steps:"
echo "1. Review exported CSV files in $EXPORT_DIR"
echo "2. Import to Supabase test database"
echo "3. Validate data integrity"
echo "4. If successful, proceed with full migration"
echo ""
