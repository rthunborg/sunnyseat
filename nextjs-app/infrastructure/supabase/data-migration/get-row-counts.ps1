# Get Row Counts from Source Database (PowerShell)
# This script exports row counts from Azure PostgreSQL for comparison

param(
    [string]$AzureHost = $env:AZURE_DB_HOST,
    [string]$AzureDb = $env:AZURE_DB_NAME,
    [string]$AzureUser = $env:AZURE_DB_USER,
    [int]$AzurePort = 5432,
    [string]$OutputFile = "./row-counts-source.txt"
)

$ErrorActionPreference = "Stop"

Write-Host "Getting row counts from Azure PostgreSQL..."
Write-Host ""

if (-not $env:AZURE_DB_PASSWORD) {
    $SecurePassword = Read-Host "Enter Azure PostgreSQL password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}
else {
    $env:PGPASSWORD = $env:AZURE_DB_PASSWORD
}

$Query = @"
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
"@

& psql --host=$AzureHost --port=$AzurePort --dbname=$AzureDb --username=$AzureUser -t -c $Query | Out-File -FilePath $OutputFile -Encoding utf8

Write-Host "Row counts saved to: $OutputFile"
Get-Content $OutputFile
