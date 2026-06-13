# PreToolUse hook (Write|Edit): sprint-status review-transition gate.
# When sprint-status.yaml is written with a story moving to "review", delegates to the
# canonical gate .claude/scripts/sprint-status-gate.sh via Git Bash (AGENTS.md: never
# run .sh through plain `bash`, it resolves to WSL). The bash gate runs visual
# validation for frontend stories and expects Codex-shaped JSON in $CLAUDE_TOOL_INPUT.
# Input: Claude Code hook JSON on stdin. Exit 2 = block the tool call.
$in = [Console]::In.ReadToEnd() | ConvertFrom-Json
$file = $in.tool_input.file_path
if (-not $file -or $file -notmatch 'sprint-status\.yaml$') { exit 0 }
$new = "$($in.tool_input.content)$($in.tool_input.new_string)"
if ($new -notmatch '"review"' -and $new -notmatch ':\s*review\b') { exit 0 }

$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { Split-Path (Split-Path $PSScriptRoot -Parent) -Parent }
$gate = (Join-Path $root '.claude\scripts\sprint-status-gate.sh') -replace '\\', '/'
$bash = @('C:\Program Files\Git\bin\bash.exe', 'C:\Program Files\Git\usr\bin\bash.exe') |
  Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $bash) {
  [Console]::Error.WriteLine("GATE BLOCKED: Git Bash not found, cannot run the sprint-status gate. Use .\scripts\run-sh.ps1 scripts/story-review.sh <story-id> instead of writing sprint-status.yaml directly.")
  exit 2
}

$env:CLAUDE_TOOL_INPUT = @{ path = $file; content = $new } | ConvertTo-Json -Compress
Push-Location $root
try { $out = & $bash $gate 2>&1; $code = $LASTEXITCODE } finally { Pop-Location }
if ($code -ne 0) {
  $text = ($out | ForEach-Object { if ($_ -is [Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" } }) -join "`n"
  [Console]::Error.WriteLine($text)
  exit 2
}
exit 0
