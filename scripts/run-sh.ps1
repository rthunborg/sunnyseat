param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ScriptPath,

  [Parameter(ValueFromRemainingArguments = $true, Position = 1)]
  [string[]]$ScriptArgs
)

$ErrorActionPreference = "Stop"

$candidatePaths = @(
  "C:\Program Files\Git\bin\bash.exe",
  "C:\Program Files\Git\usr\bin\bash.exe"
)

$bash = $candidatePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $bash) {
  Write-Error "Git Bash was not found. Install Git for Windows or update scripts/run-sh.ps1 with the local bash.exe path."
  exit 1
}

if (-not $env:ANTHROPIC_API_KEY) {
  $anthropicKey = [Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY", "User")
  if (-not $anthropicKey) {
    $anthropicKey = [Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY", "Machine")
  }
  if ($anthropicKey) {
    $env:ANTHROPIC_API_KEY = $anthropicKey
  }
}

& $bash $ScriptPath @ScriptArgs
exit $LASTEXITCODE
