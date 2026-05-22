# Story 2.4 Round 2 Edge Case Hunter Prompt

You are the Edge Case Hunter for SunnySeat Story 2.4 Round 2.

Scope:
- Review the current working-tree diff against `HEAD`.
- You may read project source files as needed.
- Focus on edge cases, integration failures, race conditions, invalid inputs, state reconciliation, accessibility behavior, i18n boundaries, and missing regression tests.
- Do not use the story file as the source of truth; this layer is about implementation risk.

Get the diff:

```powershell
cd C:\Users\Rasmus\sunnyseat
git diff --no-ext-diff -- HEAD
git ls-files --others --exclude-standard | ForEach-Object {
  "`n--- UNTRACKED: $_ ---"
  Get-Content -LiteralPath $_
}
```

Useful starting points:
- `nextjs-app/app/api/venues/route.ts`
- `nextjs-app/components/composed/search/VenueSearchCombobox.tsx`
- `nextjs-app/components/custom/search/VenueSearchShell.tsx`
- `nextjs-app/components/custom/map/MapView.tsx`
- `nextjs-app/components/custom/layout/DesktopNavBar.tsx`
- `nextjs-app/components/custom/venue/VenueList.tsx`
- `nextjs-app/hooks/queries/useVenueSearch.ts`
- `nextjs-app/lib/query-keys.ts`

Output:
- Markdown findings only.
- Each finding must include severity, one-line title, evidence from files/lines, and an actionable fix.
- If there are no findings, say `No findings`.
