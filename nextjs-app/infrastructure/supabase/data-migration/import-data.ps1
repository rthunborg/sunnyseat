# Data Import Script for Supabase Migration (PowerShell)
# This script imports exported data to Supabase in the correct order

param(
    [string]$SupabaseHost = $env:SUPABASE_DB_HOST,
    [string]$SupabaseDb = $env:SUPABASE_DB_NAME,
    [string]$SupabaseUser = $env:SUPABASE_DB_USER,
    [int]$SupabasePort = 6543,  # Use connection pooler port
    [string]$ExportDir = "./exports",
    [string]$Timestamp = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "SunnySeat Data Import Script"
Write-Host "=========================================="
Write-Host "Destination: Supabase"
Write-Host "Export directory: $ExportDir"
Write-Host ""

# Find latest export if timestamp is 'latest'
if ($Timestamp -eq "latest") {
    $LatestFile = Get-ChildItem "$ExportDir/01_venues_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $LatestFile) {
        Write-Host "Error: No export files found in $ExportDir" -ForegroundColor Red
        exit 1
    }
    $Timestamp = $LatestFile.Name -replace '01_venues_', '' -replace '\.sql', ''
    Write-Host "Using latest export timestamp: $Timestamp"
}

# Prompt for password if not set
if (-not $env:SUPABASE_DB_PASSWORD) {
    $SecurePassword = Read-Host "Enter Supabase database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}
else {
    $env:PGPASSWORD = $env:SUPABASE_DB_PASSWORD
}

# Import order
$ImportOrder = @(
    "01_venues",
    "02_buildings",
    "03_admin_users",
    "04_weather_slices",
    "05_precomputation_schedules",
    "06_patios",
    "07_venue_quality_metrics",
    "08_sun_windows",
    "09_feedback",
    "10_processed_weather",
    "11_precomputed_sun_exposure"
)

Write-Host "Step 1: Importing tables in dependency order..."
Write-Host ""

foreach ($FilePrefix in $ImportOrder) {
    $File = "$ExportDir/${FilePrefix}_${Timestamp}.sql"
    if (Test-Path $File) {
        $TableName = $FilePrefix -replace '^\d+_', ''
        Write-Host "  → Importing $TableName..."
        & psql `
            --host=$SupabaseHost `
            --port=$SupabasePort `
            --dbname=$SupabaseDb `
            --username=$SupabaseUser `
            --file=$File `
            --quiet
        Write-Host "    ✓ $TableName imported" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ Skipping $FilePrefix (file not found)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Import Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run validation script: ./validate-data.ps1"
Write-Host "2. Verify data integrity"
Write-Host ""
