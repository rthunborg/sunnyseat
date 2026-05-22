@echo off
setlocal

set "BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=C:\Program Files\Git\usr\bin\bash.exe"

if not exist "%BASH%" (
  echo Git Bash was not found. Install Git for Windows or update .codex\scripts\git-bash-hook.cmd. 1>&2
  exit /b 1
)

"%BASH%" -lc "ROOT=\"$(git rev-parse --show-toplevel 2>/dev/null || pwd)\"; while [ -n \"$ROOT\" ] && [ \"$ROOT\" != \"/\" ] && [ ! -f \"$ROOT/.codex/scripts/sprint-status-gate.sh\" ]; do ROOT=\"$(dirname \"$ROOT\")\"; done; if [ -f \"$ROOT/.codex/scripts/sprint-status-gate.sh\" ]; then cd \"$ROOT\" && bash .codex/scripts/sprint-status-gate.sh; else cat >/dev/null; exit 0; fi"
exit /b %ERRORLEVEL%
