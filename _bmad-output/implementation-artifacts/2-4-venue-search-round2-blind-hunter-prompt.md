# Story 2.4 Round 2 Blind Hunter Prompt

You are the Blind Hunter for SunnySeat Story 2.4 Round 2.

Scope:
- Review only the current working-tree diff against `HEAD`.
- Do not read the story file, project context, docs, or surrounding source outside the diff.
- Treat this as an adversarial bug hunt: behavioral regressions, broken edge cases, inconsistent state, accessibility issues visible in the diff, and test holes visible from changed tests.

Get the diff:

```powershell
cd C:\Users\Rasmus\sunnyseat
git diff --no-ext-diff -- HEAD
git ls-files --others --exclude-standard | ForEach-Object {
  "`n--- UNTRACKED: $_ ---"
  Get-Content -LiteralPath $_
}
```

Output:
- Markdown findings only.
- Each finding must include severity, one-line title, evidence from the diff, and an actionable fix.
- If there are no findings, say `No findings`.
