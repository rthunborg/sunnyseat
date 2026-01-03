# Data Export Script for Azure PostgreSQL to Supabase Migration (PowerShell)
# This script exports all data from Azure PostgreSQL in the correct order

param(
  [string]$AzureHost = $env:AZURE_DB_HOST,
  [string]$AzureDb = $env:AZURE_DB_NAME,
  [string]$AzureUser = $env:AZURE_DB_USER,
  [int]$AzurePort = 5432,
  [string]$ExportDir = "./exports"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create export directory
New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

Write-Host "=========================================="
Write-Host "SunnySeat Data Export Script"
Write-Host "=========================================="
Write-Host "Source: Azure PostgreSQL"
Write-Host "Timestamp: $Timestamp"
Write-Host ""

# Prompt for password if not set
if (-not $env:AZURE_DB_PASSWORD) {
  $SecurePassword = Read-Host "Enter Azure PostgreSQL password" -AsSecureString
  $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
  $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}
else {
  $env:PGPASSWORD = $env:AZURE_DB_PASSWORD
}

Write-Host "Step 1: Exporting independent tables (no foreign keys)..."
Write-Host ""

# Export venues
Write-Host "  → Exporting venues..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=venues `
  --file="$ExportDir/01_venues_$Timestamp.sql" `
  --no-owner --no-privileges

# Export buildings
Write-Host "  → Exporting buildings..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=buildings `
  --file="$ExportDir/02_buildings_$Timestamp.sql" `
  --no-owner --no-privileges

# Export admin_users
Write-Host "  → Exporting admin_users..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=admin_users `
  --file="$ExportDir/03_admin_users_$Timestamp.sql" `
  --no-owner --no-privileges

# Export weather_slices
Write-Host "  → Exporting weather_slices..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=weather_slices `
  --file="$ExportDir/04_weather_slices_$Timestamp.sql" `
  --no-owner --no-privileges

# Export precomputation_schedules
Write-Host "  → Exporting precomputation_schedules..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=precomputation_schedules `
  --file="$ExportDir/05_precomputation_schedules_$Timestamp.sql" `
  --no-owner --no-privileges

Write-Host ""
Write-Host "Step 2: Exporting dependent tables (with foreign keys)..."
Write-Host ""

# Export patios
Write-Host "  → Exporting patios..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=patios `
  --file="$ExportDir/06_patios_$Timestamp.sql" `
  --no-owner --no-privileges

# Export venue_quality_metrics
Write-Host "  → Exporting venue_quality_metrics..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=venue_quality_metrics `
  --file="$ExportDir/07_venue_quality_metrics_$Timestamp.sql" `
  --no-owner --no-privileges

# Export sun_windows
Write-Host "  → Exporting sun_windows..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=sun_windows `
  --file="$ExportDir/08_sun_windows_$Timestamp.sql" `
  --no-owner --no-privileges

# Export feedback
Write-Host "  → Exporting feedback..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=feedback `
  --file="$ExportDir/09_feedback_$Timestamp.sql" `
  --no-owner --no-privileges

# Export processed_weather
Write-Host "  → Exporting processed_weather..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=processed_weather `
  --file="$ExportDir/10_processed_weather_$Timestamp.sql" `
  --no-owner --no-privileges

# Export precomputed_sun_exposure
Write-Host "  → Exporting precomputed_sun_exposure..."
& pg_dump --data-only --column-inserts `
  --host=$AzureHost `
  --port=$AzurePort `
  --dbname=$AzureDb `
  --username=$AzureUser `
  --table=precomputed_sun_exposure `
  --file="$ExportDir/11_precomputed_sun_exposure_$Timestamp.sql" `
  --no-owner --no-privileges

Write-Host ""
Write-Host "=========================================="
Write-Host "Export Complete!"
Write-Host "=========================================="
Write-Host "Export directory: $ExportDir"
Write-Host "Timestamp: $Timestamp"
Write-Host ""
Write-Host "Exported files:"
Get-ChildItem "$ExportDir/*_$Timestamp.sql" | Format-Table Name, Length
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review exported files"
Write-Host "2. Run import script: ./import-data.ps1"
Write-Host ""
