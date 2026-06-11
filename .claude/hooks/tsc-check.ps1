# PostToolUse hook (Write|Edit): typecheck nextjs-app after a TypeScript file changes.
# Input: Claude Code hook JSON on stdin. Exit 2 = feed type errors back to Claude.
$in = [Console]::In.ReadToEnd() | ConvertFrom-Json
$file = $in.tool_input.file_path
if (-not $file) { exit 0 }
$norm = $file -replace '\\', '/'
if ($norm -notmatch '(^|/)nextjs-app/.*\.(ts|tsx)$' -or $norm -match '/(node_modules|\.next)/') { exit 0 }

$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { Split-Path (Split-Path $PSScriptRoot -Parent) -Parent }
Push-Location (Join-Path $root 'nextjs-app') -ErrorAction Stop
try { $out = npx tsc --noEmit 2>&1; $code = $LASTEXITCODE } finally { Pop-Location }
if ($code -ne 0) {
  $tail = ($out | ForEach-Object { if ($_ -is [Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" } } |
    Select-Object -Last 20) -join "`n"
  [Console]::Error.WriteLine("tsc --noEmit failed after editing ${file}:`n$tail")
  exit 2
}
exit 0
