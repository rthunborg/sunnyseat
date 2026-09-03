# SunnySeat isolated disaster-recovery rehearsal

Status: **RUNBOOK READY; PROVIDER RESTORE NOT EXERCISED**.

The source verifier was most recently exercised read-only on 2026-08-24. No
disposable Supabase project was created, no restore/cost was confirmed, no
target or production resource was mutated, and no failover was attempted.
Execution remains pending fresh approval of the provider-displayed cost.

## Scope and inviolable safety boundary

This runbook rehearses a provider-native database restore into a new independent
Supabase project, then an isolated Vercel preview. It covers backup selection,
schema/migration history, representative data, RLS, grants, RPCs, Storage,
Auth, venue/geometry/weather contracts, application smoke, timing, rollback,
and cleanup.

Never:

- restore over the source project or run `supabase backups restore`;
- run `supabase db reset --linked`, broad `db push`, or production failover;
- change Vercel Production variables, domains, aliases, or traffic;
- attach scheduled jobs, SMTP, OAuth, webhooks, callbacks, or external
  integrations to the clone;
- reuse source keys on the target;
- delete a project unless live provider identity guards prove it is this
  session's `sunnyseat-dr-*` target;
- claim Storage-byte, Auth-configuration, Realtime, or endpoint attribution
  that was not directly exercised.

Production overwrite, failover, traffic switch, and production rollback require
fresh explicit approval and are outside this rehearsal.

## Reviewed CLI pins and operator bindings

Use exactly Supabase CLI `2.114.0` and Vercel CLI `59.1.3`. Do not use
`latest`, unversioned `npx`, or a global binary. Keep raw refs, organization
IDs, keys, tokens, and passwords only in the current PowerShell process.
Durable evidence contains SHA-256 identity bindings, not raw provider IDs.

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SupabaseCliVersion = '2.114.0'
$VercelCliVersion = '59.1.3'
if ($SupabaseCliVersion -ne '2.114.0' -or
    $VercelCliVersion -ne '59.1.3') {
  throw 'Unreviewed CLI version.'
}

$sessionStartUtc = (Get-Date).ToUniversalTime()
$sessionId = $sessionStartUtc.ToString('yyyyMMddTHHmmssZ')
$targetCreationDeadlineUtc = $sessionStartUtc.AddHours(2)
$cloneConfirmedAtUtc = $null
$cleanupDeadlineUtc = $null
$authoringRepositoryRoot = '<absolute-path-to-reviewed-sunnyseat-checkout>'
$expectedApplicationCommit = '<exact-reviewed-application-commit-sha>'
$drEvidenceRoot = Join-Path $authoringRepositoryRoot (
  '_bmad-output\implementation-artifacts\validation\' +
  'story-13-1-restore-drill'
)
$sessionEvidenceIgnorePath = Join-Path $drEvidenceRoot '.gitignore'
$sessionEvidenceDirectory = Join-Path $drEvidenceRoot $sessionId
$smokeEvidenceDirectory = Join-Path (
  $sessionEvidenceDirectory
) 'preview-smoke'

if ($expectedApplicationCommit -notmatch '^[0-9a-f]{40}$') {
  throw 'Set the exact reviewed application commit SHA before any provider mutation.'
}
if (-not (Test-Path -LiteralPath $authoringRepositoryRoot -PathType Container)) {
  throw 'Authoring repository root does not exist.'
}
New-Item -ItemType Directory -Path $drEvidenceRoot -Force | Out-Null
$expectedEvidenceIgnore = "*`n!.gitignore`n"
if (Test-Path -LiteralPath $sessionEvidenceIgnorePath -PathType Leaf) {
  if ((Get-Content -Raw -LiteralPath $sessionEvidenceIgnorePath) -ne
      $expectedEvidenceIgnore) {
    throw 'DR evidence ignore guard differs from the reviewed session policy.'
  }
} else {
  [IO.File]::WriteAllText(
    $sessionEvidenceIgnorePath,
    $expectedEvidenceIgnore,
    [Text.UTF8Encoding]::new($false)
  )
}
New-Item -ItemType Directory -Path $sessionEvidenceDirectory -Force |
  Out-Null
New-Item -ItemType Directory -Path $smokeEvidenceDirectory -Force |
  Out-Null

# Initialise before any provider mutation. Raw IDs live only in this process.
$cleanupLedger = [ordered]@{
  target_ref = $null
  vercel_project_name = $null
  vercel_project_id = $null
  preview_deployment_id = $null
  preview_environment_ids = [Collections.Generic.List[string]]::new()
  feedback_id = $null
  storage_paths = [Collections.Generic.List[string]]::new()
  auth_user_id = $null
  local_root = $null
  steps = [Collections.Generic.List[object]]::new()
  errors = [Collections.Generic.List[object]]::new()
}

$sourceRef = '<source-project-ref>'
$sourceProjectName = 'SunnySeat'
$expectedOrganizationId = '<source-organization-id>'
$expectedRegion = 'eu-west-1'
$restoreVerifierAsOfUtc = ''
$expectedRestoreVerifierSha256 =
  '4564E278D1C2BAEAB00580182AB0FD78E15A4BA0B9D0B0884F90DD32F7F790BB'

# Populate only after Restore to a New Project succeeds.
$targetRef = ''
$targetName = "sunnyseat-dr-$sessionId"

function Get-TextSha256 {
  param([Parameter(Mandatory)][string]$Value)
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  try {
    [Convert]::ToHexString(
      [Security.Cryptography.SHA256]::HashData($bytes)
    ).ToLowerInvariant()
  } finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
  }
}

function Get-CurrentSupabaseProjects {
  $json = & npx --yes "supabase@$SupabaseCliVersion" `
    projects list `
    --output json `
    --agent no
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not refresh Supabase project inventory.'
  }
  @($json | ConvertFrom-Json)
}

function Assert-SourceBinding {
  $projects = Get-CurrentSupabaseProjects
  $matches = @($projects | Where-Object id -eq $sourceRef)
  if ($matches.Count -ne 1) { throw 'Source did not resolve exactly once.' }
  $source = $matches[0]
  if ($source.name -ne $sourceProjectName -or
      $source.organization_id -ne $expectedOrganizationId -or
      $source.region -ne $expectedRegion -or
      $source.status -ne 'ACTIVE_HEALTHY') {
    throw 'Source identity/status mismatch.'
  }
  if ([DateTimeOffset]::Parse($source.created_at).UtcDateTime -ge
      $sessionStartUtc) {
    throw 'Source was created inside the rehearsal window.'
  }
}

function Assert-ClonePreConfirmation {
  # This guard is intentionally stricter than cleanup identity. It is only for
  # starting a new paid clone; it must never be called from cleanup.
  Assert-SourceBinding
  $nowUtc = (Get-Date).ToUniversalTime()
  if (($targetCreationDeadlineUtc - $nowUtc).TotalMinutes -lt 30) {
    throw 'Fewer than 30 minutes remain in the target-creation window; start a fresh session.'
  }
  if ($null -ne $cloneConfirmedAtUtc -or
      $null -ne $cleanupDeadlineUtc -or
      -not [string]::IsNullOrWhiteSpace($targetRef)) {
    throw 'This rehearsal session has already crossed the clone boundary.'
  }

  $providerLedgerIsEmpty =
    -not $cleanupLedger.target_ref -and
    -not $cleanupLedger.vercel_project_name -and
    -not $cleanupLedger.vercel_project_id -and
    -not $cleanupLedger.preview_deployment_id -and
    $cleanupLedger.preview_environment_ids.Count -eq 0 -and
    -not $cleanupLedger.feedback_id -and
    $cleanupLedger.storage_paths.Count -eq 0 -and
    -not $cleanupLedger.auth_user_id
  if (-not $providerLedgerIsEmpty) {
    throw 'The provider-resource cleanup ledger is not empty; do not create another clone.'
  }

  $projects = Get-CurrentSupabaseProjects
  if (@($projects | Where-Object name -eq $targetName).Count -ne 0) {
    throw 'A provider project already occupies this session target name.'
  }
}

function Start-CloneRecoveryClock {
  if ($null -ne $cloneConfirmedAtUtc) {
    throw 'Clone clock already started.'
  }
  $script:cloneConfirmedAtUtc = (Get-Date).ToUniversalTime()
  $script:cleanupDeadlineUtc = $cloneConfirmedAtUtc.AddHours(4)
}

function Get-DrTargetIdentity {
  if ([string]::IsNullOrWhiteSpace($sourceRef) -or
      [string]::IsNullOrWhiteSpace($targetRef)) {
    throw 'Explicit source and target refs are required.'
  }
  if ($targetRef -eq $sourceRef) { throw 'Target equals source.' }
  if ($targetName -notmatch '^sunnyseat-dr-[0-9]{8}T[0-9]{6}Z$') {
    throw 'Target name is outside this session namespace.'
  }

  $projects = Get-CurrentSupabaseProjects
  $sourceMatches = @($projects | Where-Object id -eq $sourceRef)
  $targetMatches = @($projects | Where-Object id -eq $targetRef)
  if ($sourceMatches.Count -ne 1 -or $targetMatches.Count -ne 1) {
    throw 'Source/target did not each resolve exactly once.'
  }

  $source = $sourceMatches[0]
  $target = $targetMatches[0]
  $createdUtc = [DateTimeOffset]::Parse($target.created_at).UtcDateTime
  if ($source.name -ne $sourceProjectName -or
      $source.organization_id -ne $expectedOrganizationId -or
      $source.region -ne $expectedRegion) {
    throw 'Source identity drifted.'
  }
  if ($target.name -ne $targetName -or
      $target.organization_id -ne $expectedOrganizationId -or
      $target.region -ne $expectedRegion) {
    throw 'Target name/organization/region identity mismatch.'
  }
  if ($createdUtc -lt $sessionStartUtc -or
      $createdUtc -gt $targetCreationDeadlineUtc) {
    throw 'Target creation is outside this session window.'
  }
  $target
}

function Assert-DrTargetIdentity {
  [void](Get-DrTargetIdentity)
}

function Assert-DrTargetOperational {
  $target = Get-DrTargetIdentity
  if ($target.status -ne 'ACTIVE_HEALTHY') {
    throw 'Target is not operationally healthy.'
  }
  if ($null -eq $cloneConfirmedAtUtc -or
      $null -eq $cleanupDeadlineUtc) {
    throw 'Clone-confirmation clock was not anchored.'
  }
  if ((Get-Date).ToUniversalTime() -gt $cleanupDeadlineUtc) {
    throw 'Operational TTL expired; enter cleanup/quarantine mode.'
  }
}

function Assert-DrTargetCleanupIdentity {
  # Deliberately ignores health, current time, and operational TTL so failure
  # or expiry cannot block exact session-bound cleanup.
  Assert-DrTargetIdentity
}

function Assert-TargetOriginBinding {
  param([switch]$Cleanup)
  if ($Cleanup) {
    Assert-DrTargetCleanupIdentity
  } else {
    Assert-DrTargetOperational
  }

  $expectedOrigin = "https://$targetRef.supabase.co"
  $parsed = [Uri]$targetOrigin
  if ($targetOrigin.TrimEnd('/') -ne $expectedOrigin -or
      $parsed.Scheme -ne 'https' -or
      $parsed.Host -ne "$targetRef.supabase.co" -or
      $parsed.AbsolutePath -ne '/' -or
      $parsed.Query -or $parsed.Fragment -or $parsed.UserInfo) {
    throw 'Target origin is not bound exactly to the live target ref.'
  }
}

function Get-HashedBindingRecord {
  Assert-SourceBinding
  if ($targetRef) { Assert-DrTargetIdentity }
  [ordered]@{
    session_id = $sessionId
    session_start_utc = $sessionStartUtc.ToString('o')
    clone_confirmed_at_utc = if ($cloneConfirmedAtUtc) {
      $cloneConfirmedAtUtc.ToString('o')
    } else { $null }
    cleanup_deadline_utc = if ($cleanupDeadlineUtc) {
      $cleanupDeadlineUtc.ToString('o')
    } else { $null }
    source_ref_sha256 = Get-TextSha256 $sourceRef
    source_name_sha256 = Get-TextSha256 $sourceProjectName
    organization_id_sha256 = Get-TextSha256 $expectedOrganizationId
    region = $expectedRegion
    restore_verifier_as_of_utc = $restoreVerifierAsOfUtc
    restore_verifier_sha256 = $expectedRestoreVerifierSha256
    target_ref_sha256 = if ($targetRef) {
      Get-TextSha256 $targetRef
    } else { $null }
    target_name_sha256 = if ($targetRef) {
      Get-TextSha256 $targetName
    } else { $null }
  }
}

function Assert-RestoreVerifierAnchor {
  if ($restoreVerifierAsOfUtc -notmatch
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$') {
    throw 'Set a fresh UTC restore verifier anchor before running verifier SQL.'
  }
  $anchorUtc = [DateTimeOffset]::Parse(
    $restoreVerifierAsOfUtc,
    [Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AssumeUniversal
  ).UtcDateTime
  $nowUtc = (Get-Date).ToUniversalTime()
  if ($anchorUtc -lt $sessionStartUtc.AddMinutes(-5) -or
      $anchorUtc -gt $nowUtc.AddMinutes(5)) {
    throw 'Restore verifier anchor is outside this rehearsal session.'
  }
  $verifierPath = Join-Path $authoringRepositoryRoot (
    'scripts\dr\verify-restore.sql'
  )
  $actualHash = (
    Get-FileHash -Algorithm SHA256 -LiteralPath $verifierPath
  ).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedRestoreVerifierSha256) {
    throw 'Restore verifier SQL hash differs from the reviewed binding.'
  }
}

function Start-RestoreVerifierAnchor {
  Assert-SourceBinding
  if (-not [string]::IsNullOrWhiteSpace($restoreVerifierAsOfUtc)) {
    throw 'Restore verifier anchor already captured.'
  }
  $script:restoreVerifierAsOfUtc =
    (Get-Date).ToUniversalTime().ToString(
      "yyyy-MM-ddTHH:mm:ss.fff'Z'",
      [Globalization.CultureInfo]::InvariantCulture
    )
  Assert-RestoreVerifierAnchor
}

function Invoke-DrRestoreVerifier {
  param([Parameter(Mandatory)][string]$ProjectRef)
  Assert-RestoreVerifierAnchor
  $previousPgOptions = $env:PGOPTIONS
  try {
    $env:PGOPTIONS =
      "-c sunnyseat.dr_as_of_utc=$restoreVerifierAsOfUtc"
    & npx --yes "supabase@$SupabaseCliVersion" db query `
      --linked `
      --project-ref $ProjectRef `
      --file scripts/dr/verify-restore.sql `
      --output-format text
  } finally {
    if ($null -eq $previousPgOptions) {
      Remove-Item Env:\PGOPTIONS -ErrorAction SilentlyContinue
    } else {
      $env:PGOPTIONS = $previousPgOptions
    }
  }
}
```

Run `Assert-SourceBinding` before every source capture. Run
`Assert-DrTargetOperational` and, for HTTP operations,
`Assert-TargetOriginBinding` immediately before every non-cleanup block labeled
**TARGET MUTATION**. Cleanup uses only `Assert-DrTargetCleanupIdentity` plus
`Assert-TargetOriginBinding -Cleanup`; health and an expired TTL must never
prevent deletion of exact ledger resources. The following command must itself
contain the explicit target ref/origin or execute inside the guarded disposable
workspace. If live
inventory cannot be refreshed, stop. A browser tab, URL appearance, cached
inventory, or local Supabase link is not proof.

Persist only `Get-HashedBindingRecord | ConvertTo-Json`. Never retain raw
`projects list` output because it enumerates unrelated accessible projects.

## Current read-only recovery inventory

Captured 2026-08-18:

- source name `SunnySeat`, region `eu-west-1`;
- database approximately 922 MB;
- eight completed physical backups;
- latest observed record ID `1408240294` with provider `inserted_at`
  `2026-08-18T07:05:56.434Z`;
- PITR disabled; physical/WAL-G backup capability enabled;
- 24 remote migration rows, earliest `20260629215021`, latest
  `20260817143743`;
- one `venue-media` bucket, zero Storage objects;
- zero Auth users, identities, and sessions;
- PostGIS present; no `pg_net`, `pg_cron`, `wrappers`, or Edge Functions.

The backup record timestamp is management metadata. It is not proven to be
snapshot completion, a WAL recovery point, or the newest included commit. Call
it `backup_record_timestamp`, never `restore_point` or `achieved_rpo` unless
the provider supplies a distinct authoritative recovery point.

## Source verifier, algorithms, and exercised evidence

Run unchanged with the exact pin and a fresh, session-scoped verifier anchor:

```powershell
Start-RestoreVerifierAnchor
Invoke-DrRestoreVerifier -ProjectRef $sourceRef
```

CLI `2.114.0` requires `--linked` with `--project-ref` for `db query`.
The SQL begins `TRANSACTION READ ONLY`, reads its fixed as-of timestamp from
the runtime `PGOPTIONS` value set by `Invoke-DrRestoreVerifier`, has bounded
timeouts, performs no DDL/DML/RPC, and leaves its report SELECT final. Require
exit zero and `transaction_read_only: "on"`. The reviewed verifier SHA-256 for
future paid-drill source and target captures is
`4564E278D1C2BAEAB00580182AB0FD78E15A4BA0B9D0B0884F90DD32F7F790BB`.

Deterministic algorithms and hard gates:

- Migration fields use ASCII unit separator (`E''`); ordered records use
  exactly `E'
--migration--
'`. The statement checksum covers `version`,
  `name`, newline-joined `statements[]`, `created_by`,
  `idempotency_key`, and newline-joined `rollback[]`. All 24 rows must
  contain statements.
- Application-function signatures include identity, owner, kind, security
  flags, volatility/parallel flags, runtime config, and full
  `pg_get_functiondef`. View, sequence-definition, and noninternal-trigger
  signatures are separate; extension-owned public objects are excluded.
- All 12 application relations have exact owner, RLS/force-RLS, ordered column,
  constraint, index, effective relation ACL (including `PUBLIC`, grantor, and
  PG17 `MAINTAIN`), explicit column ACL, and normalized policy signatures.
- Data checksums concatenate `md5(to_jsonb(row)::text)` in primary-key order.
  `shadow_casters` uses full count plus deduplicated first/last 128 IDs; it is
  representative, not full-table.
- `validAt` requires a full timezone-bearing timestamp regex and
  `pg_input_is_valid(..., 'timestamp with time zone')`.
- RPC owner/security-definer/volatility/execute ACL/search-path posture is
  gated. Eight RPCs require one reviewed fixed path. Two immutable pure
  validators lack `proconfig` and pass only with exact full-body MD5, no
  browser execute, and no untrusted login creator in `public`.
- Installed extensions must be exactly `pg_stat_statements`, `pgcrypto`,
  `plpgsql`, `postgis`, `supabase_vault`, and `uuid-ossp`. The verifier also
  hard-gates zero dblink functions/direct-connect entry points, installed FDWs,
  foreign servers, user mappings, logical subscriptions, database cron jobs,
  queued `pg_net` HTTP requests, and database webhooks.
- Storage requires the exact sole normalized policy and bucket contract; extra
  browser reads, any browser write, extra policy, or owner/RLS drift fails.
- Data hard gates are 42 visible venues, 42 valid seating polygons, and 42
  ready inputs with non-null valid current hashes. Every retained geometry date
  must contain exactly one current-hash row for each of the 42 venues; all rows
  must be validator-valid exact ordered 61-step series, with the current
  five-date application window present and no duplicate venue/date rows.
  Weather requires exactly 42 coordinate buckets, one `current` row per
  bucket/date, every retained and current four-date cohort complete across all
  42 buckets, structurally valid nonempty slices, and
  `expires_at > refreshed_at`. Current-time freshness is reported separately
  and is not mislabeled as a restore-integrity gate. Raw totals, date ranges,
  full scheduled-table checksums, and latest timestamps remain output for exact
  fresh-source versus target comparison; zero-row and stale-hash vacuous passes
  cannot succeed.

### Exercised source results

#### Historical structural-retention and outbound hardening result

At approximately `2026-08-24T13:17Z`:

- Supabase CLI `2.114.0`; exit 0; roughly 12 seconds end-to-end;
- verifier SHA-256
  `4EC7569D654F9A89182D66BAE0B6319AB88A1FF00C699A16877CCEF4F82EF012`;
- read-only `on`; hard failures `0` across all 13 categories;
- the installed extensions matched exactly: `pg_stat_statements`, `pgcrypto`,
  `plpgsql`, `postgis`, `supabase_vault`, and `uuid-ossp`;
- dblink extension/functions/direct-connect entry points, FDW extensions/live
  wrappers, foreign servers, user mappings, logical subscriptions, cron jobs,
  queued HTTP requests, and database webhooks were all exactly zero;
- 504 geometry rows formed 12 complete 42-venue cohorts from `2026-08-17`
  through `2026-08-28`; all 504 used current hashes and exact ordered 61-step
  series, the five required current dates were complete, and duplicate
  venue/date rows were zero;
- 462 weather rows formed 11 complete 42-bucket cohorts from `2026-08-17`
  through `2026-08-27`; all 462 were nonempty, structurally valid,
  valid-expiry `current` rows, the four required current dates were complete,
  and duplicate bucket/date rows were zero. The 168 currently unexpired rows
  were reported separately and were not used as a restore-integrity gate;
- migration, schema/relation, venue/seating, RPC, role-membership, Storage, and
  Auth gates also passed unchanged.

Fresh exact data manifest:

| Relation | Class | Rows | Sample | Checksum |
| --- | --- | ---: | ---: | --- |
| `app_feedback` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `feedback` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `geometry_precompute_runs` | operational | 16 | 16 | `13b76d3a4baa58d15b896a5974e2d0b2` |
| `hours_review_outcomes` | operational | 420 | 420 | `4c079e326351a1de5e288e938955c7ac` |
| `hours_review_runs` | operational | 10 | 10 | `057baf0417b3723f2e2c1bbf63ef2335` |
| `reviews` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `shadow_caster_import_batches` | reference | 1 | 1 | `421f7fab154f94f5bd4716ff4b088fac` |
| `shadow_casters` | reference | 58,731 | 256 | `a6722778d200c42e9939aedf1b9f7a44` |
| `venue_geometry_inputs` | scheduled | 42 | 42 | `0d847bd49645e702c1daea9d1f1024e0` |
| `venue_sun_geometry_series` | scheduled | 504 | 504 | `5c89e1507406b4b68de70b2f5bbd1e42` |
| `venues` | curated | 42 | 42 | `4ea017e252f860ffdb15fe2b62d89661` |
| `weather_bucket_snapshots` | scheduled | 462 | 462 | `5552328de825c28a2a04142793f895bf` |

These values are historical source evidence produced by an older verifier file,
not a selected-backup or restored target manifest. Capture source evidence again
with the reviewed SHA-256 above immediately before paid confirmation.

#### Historical baseline result

At approximately `2026-08-18T13:08Z`:

- Supabase CLI `2.114.0`; exit 0; roughly 14 seconds end-to-end;
- verifier SHA-256
  `C2D1E7ABC0C6E7DEA596F2E866520934F991D2AE8973F8110387A3E7C039AA9E`;
- read-only `on`; hard failures `0`;
- 24 migrations/24 statement bodies; metadata checksum
  `dc92dd6ac392da787c4acad2f343e207`; statement checksum
  `d5d34a18e55cee01fd559b68595c46c3`;
- 37 application functions, zero views, three sequences, three triggers; every
  schema and 12-relation security signature matched;
- zero outbound-capable extensions, foreign servers, user mappings, and logical
  subscriptions; the exact service-role membership graph matched 5/5 edges;
- all 10 service RPCs passed owner/body/path/effective-execute checks; their 20
  direct ACL entries allow only `postgres` and `service_role`, grantor
  `postgres`, no grant option;
- 42/42 venue and seating contracts; 42/42 ready/current hashes; 252/252 valid,
  exact-series, and current-hash rows; 42 venues with one shared six-date set;
- 42 weather coordinate buckets, five dates/rows each; 210/210 nonempty,
  structurally valid, valid-expiry rows and 2,520 slices. The 168 currently
  unexpired rows are reported only, not used as a restore-integrity gate;
- exactly one total Storage bucket with the closed `venue-media` contract and
  zero Storage/Auth records.

Exact data manifest:

| Relation | Class | Rows | Sample | Checksum |
| --- | --- | ---: | ---: | --- |
| `app_feedback` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `feedback` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `geometry_precompute_runs` | operational | 4 | 4 | `bb33da2efbdb22ab98fdc8a33b0c19f6` |
| `hours_review_outcomes` | operational | 378 | 378 | `8eb68d97debeee98e47cc809ffd4eec7` |
| `hours_review_runs` | operational | 9 | 9 | `e70d1432e5b0ab72fd99684efed26823` |
| `reviews` | user mutable | 0 | 0 | `d41d8cd98f00b204e9800998ecf8427e` |
| `shadow_caster_import_batches` | reference | 1 | 1 | `421f7fab154f94f5bd4716ff4b088fac` |
| `shadow_casters` | reference | 58,731 | 256 | `a6722778d200c42e9939aedf1b9f7a44` |
| `venue_geometry_inputs` | scheduled | 42 | 42 | `d52a71f5cdc5efa5c804276a8fe1d95c` |
| `venue_sun_geometry_series` | scheduled | 252 | 252 | `a5a5479e2766e241dfd1fba4d719f26b` |
| `venues` | curated | 42 | 42 | `4ea017e252f860ffdb15fe2b62d89661` |
| `weather_bucket_snapshots` | scheduled | 210 | 210 | `82581bb1a7562f2084bccb2a0df7503f` |

The 252/210 scheduled totals above describe only the 2026-08-18 source
snapshot; they are comparison evidence, not hardcoded retention gates. A drill
must capture the fresh source totals/date ranges/checksums immediately before
confirmation and require the target to match the selected snapshot or explain
each bounded lag delta.

This is source evidence, not restore evidence. Refresh it immediately before
clone confirmation. Embedded schema/security constants change only after an
intentional reviewed production migration, never merely to make a target pass.

## Recovery objectives and evidence handling

Provisional objectives:

- RPO objective: no more than 24 hours (PITR is disabled);
- RTO objective: no more than two hours from clone confirmation to passing
  isolated application smoke;
- cleanup TTL: four hours from clone confirmation, including failed runs.

Record separately:

1. `backup_record_age`: clone confirmation minus provider record timestamp;
2. `database_restore_time`: confirmation to healthy target plus read-only
   verifier connection;
3. `application_recovery_time`: confirmation to all smoke gates passing;
4. `observed_data_lag`: per relation, fresh-source minus target
   count/checksum/latest-time delta;
5. cleanup duration/outcome.

Do not call observed lag achieved RPO without an authoritative recovery point or
commit timeline. Otherwise state that exact achieved RPO is unmeasured.

Use a new ignored evidence directory:
`_bmad-output/implementation-artifacts/validation/story-13-1-restore-drill/<session>/`.
The runbook creates/reuses
`_bmad-output/implementation-artifacts/validation/story-13-1-restore-drill/.gitignore`
with `*` and `!.gitignore` before provider mutation, so every per-session raw
capture, including `<session>/preview-smoke/`, stays local unless a later
sanitized artifact is intentionally promoted by a separate reviewed change.
Retain sanitized:

- hashed source/target bindings, backup selection, cost screenshot;
- fresh source and target pre/post-transport manifests;
- timeline/RPO-RTO record; relation-delta classification;
- security/Storage/RPC results; browser/API smoke JSONL and screenshots;
- sanitized runtime/external-dependency evidence;
- cleanup proof and SHA-256 manifest of retained files.

Redact refs, organization IDs, keys/tokens/passwords, cookies, authorization
headers, connection strings, signed URLs, email addresses, request bodies with
credentials, account UI, and unrelated projects. Request/deployment IDs,
operation/destination paths, status, duration, region, and UTC timestamps may
remain. Delete unsanitized captures in `finally`. If cleanup fails, remove all
application connectivity, quarantine the target, record the exact error, and
escalate before TTL. The drill cannot pass with a target, preview, credential,
test user/session, feedback row, or test object remaining.

## Phase 1: freeze source and select backup

1. Run `Assert-SourceBinding` and save only its hashed record.
2. List backups read-only:

   ```powershell
   npx --yes supabase@2.114.0 backups list `
     --project-ref $sourceRef `
     --output json
   ```
3. Select the newest `COMPLETED` physical record; record ID,
   `backup_record_timestamp`, type, region, database size, selection UTC, and
   current production Vercel deployment ID. If Dashboard shows a separate
   recovery point, record it distinctly.
4. Run the source verifier and save sanitized output.
5. Verify production
   `https://sunnyseat.vercel.app/api/venues?lat=57.7089&lng=11.9746&radiusKm=3`:
   HTTP 200, 42 unique venues, exact 61 steps (minutes 360..1260) each.
6. Record source-manifest time after backup-record time. Scheduled/user/
   operational changes between them are possible.

## Phase 2: provider-native isolated clone and cost approval

**NOT EXERCISED. First paid/provider-mutating boundary.**

1. In the guarded source Dashboard open **Database > Backups > Restore to a New
   Project**. Never use in-place CLI restore.
2. Select the recorded backup and enter exactly `$targetName`.
3. Require the confirmation page to show new-project operation, matching source
   and backup, same organization/`eu-west-1`, exact target name, plan, and
   current cost. Capture a redacted screenshot.
4. Stop. State the displayed cost and obtain fresh explicit approval. Runbook
   preparation/launch approval is not cost approval.
5. Only after approval, immediately before selecting **Confirm**, run
   `Assert-ClonePreConfirmation`. It must refresh source/provider inventory,
   prove at least 30 minutes remain in the session creation window, prove the
   provider-resource cleanup ledger is empty, and prove no provider project
   already uses `$targetName`. A failed guard requires a fresh session and new
   displayed-cost approval; never reuse the stale confirmation page.
6. Confirm once. Record `clone_confirmed_at_utc`; start RTO and cleanup timers.
7. Immediately call `Start-CloneRecoveryClock`; the confirmation timestamp,
   not session setup, anchors RTO and the four-hour cleanup TTL.
8. Poll only pinned read-only project inventory. Set `$targetRef` from the one
   exact new record and set `$cleanupLedger.target_ref = $targetRef`.
   `Assert-DrTargetOperational` must prove distinct ref, exact
   name/org/region, healthy status, and session-window creation. Set
   `$targetOrigin = "https://$targetRef.supabase.co"`, run
   `Assert-TargetOriginBinding`, and save only the hashed binding.
9. Run target verifier read-only. Stop database timer only when healthy and
   connected. Re-prove production project/deployment/aliases unchanged.

Supabase documents this as database-only: schema/data, roles/permissions, Auth
records, and encryption root key copy. Storage bytes/settings, API keys, Auth
settings, Realtime settings, Edge Functions, extensions/settings, and replicas
need separate review/reconfiguration.

## Phase 3: quarantine external effects

Before clone confirmation, the fresh source verifier must report the exact
six-extension allowlist and zero dblink/direct-connect functions, FDWs, foreign
servers/user mappings, logical subscriptions, database cron jobs, queued
`pg_net` HTTP requests, and database webhooks. Also inspect provider Cron,
Database Webhooks, integrations, Edge Functions, Realtime, replicas, and custom
domains. SQL cannot prove the absence of provider-side resources. If any
extension drift, job, webhook, subscription, or integration exists, **do not
confirm the clone** until a provider-supported pre-start quarantine procedure
is reviewed and approved; disabling it after clone startup is too late.

After clone creation, use only newly issued target keys. Configure no jobs,
production variables/domains, SMTP/OAuth, webhooks, callbacks, or external
integrations. Recheck the target verifier before issuing application
credentials. Any nonzero outbound-effect count is a hard stop: remove
connectivity, enter cleanup, and do not run application smoke.

## Phase 4: target parity with bounded claims

```powershell
Assert-DrTargetOperational
Invoke-DrRestoreVerifier -ProjectRef $targetRef
```

Require read-only `on`. Before Phase 6, only `storage_contract` may differ, and
only where documented clone semantics omitted Storage settings; any other hard
failure stops. Afterwards hard failures must be zero.

Mechanically compare migration statement history, four application-schema
signatures, all 12 relation/schema/security matrices, Postgres/PostGIS, all 12
data manifests, venue/seating, geometry/current-hash/date sets, weather,
Storage/Auth, public-schema, and RPC contracts.

For `venue_sun_geometry_series` and `weather_bucket_snapshots`, preserve each
fresh manifest's raw row count, full-table checksum, earliest/latest retained
date, complete-cohort counts, and latest-change timestamp. Compare those exact
fresh-source values with the target; the verifier intentionally does not freeze
historical scheduled-retention totals.

Claims are intentionally narrow. This does not prove byte parity for provider
`auth`/`storage` internals, extension-owned objects, sequence current values,
database/Auth/Realtime settings, API keys, or Storage bytes.

Classify data deltas:

- user mutable: `app_feedback`, `feedback`, `reviews`;
- operational: hours-review and geometry-run tables;
- scheduled: geometry inputs/series and weather;
- reference import: shadow-caster tables;
- curated: `venues`.

Because source manifest follows backup, mutable differences are observed
snapshot lag, not automatically corruption. Reference/curated differences need
a documented change inside the interval or fail manually. Exact snapshot
fidelity remains unmeasured without an authoritative recovery point/manifest.
Do not compare only 21 local migration files; the 24-row remote statement
checksum is authoritative.

## Phase 5: RLS, grants, and service-only RPCs

Require exact verifier matrices for every relation and RPC: owner, RLS/
force-RLS, table/column ACL, normalized policies, public-schema CREATE posture,
RPC security-definer/volatility/execute ACL/search-path posture, Storage owner/
policy, and zero hard failures after Storage setup.

Load new target credentials only into process memory:

```powershell
Assert-DrTargetOperational
$targetOrigin = "https://$targetRef.supabase.co"
Assert-TargetOriginBinding
$targetVenueId = '<restored-venue-id>'
$targetCoverageDate = '<YYYY-MM-DD-from-geometry-contract>'

$anonHeaders = @{
  apikey = $env:DR_TARGET_ANON_KEY
  Authorization = "Bearer $($env:DR_TARGET_ANON_KEY)"
}
$serviceHeaders = @{
  apikey = $env:DR_TARGET_SERVICE_ROLE_KEY
  Authorization = "Bearer $($env:DR_TARGET_SERVICE_ROLE_KEY)"
}
$rpcBody = @{
  p_venue_ids = @($targetVenueId)
  p_stockholm_date = $targetCoverageDate
} | ConvertTo-Json -Compress

function Assert-BrowserReadRpcDenied {
  param(
    [Parameter(Mandatory)][hashtable]$Headers,
    [Parameter(Mandatory)][string]$RoleLabel
  )
  Assert-TargetOriginBinding
  $uri =
    "$targetOrigin/rest/v1/rpc/read_current_venue_sun_geometry_batch"
  $response = Invoke-WebRequest `
    -Method Post `
    -Uri $uri `
    -Headers $Headers `
    -ContentType 'application/json' `
    -Body $rpcBody `
    -SkipHttpErrorCheck
  if ($response.StatusCode -notin 401, 403, 404) {
    throw "$RoleLabel reached the service-only read RPC."
  }
  [ordered]@{
    role = $RoleLabel
    status = [int]$response.StatusCode
    request_id = $response.Headers['x-request-id']
    response_bytes = $response.RawContentLength
  }
}
```

Read-only REST gates:

1. anon GET to each service-only relation is denied with no rows;
2. `Assert-BrowserReadRpcDenied $anonHeaders anon` denies the read RPC;
3. service-role POST with exact `$rpcBody` returns 200, current hash, and one
   valid 61-step series; retain status/request ID/shape hash only;
4. after Phase 6 creates a disposable user, repeat with its authenticated bearer
   token; any 2xx is a hard failure;
5. invoke no mutating geometry/run RPC.

## Phase 6: Storage/Auth transport contract

Production has zero Storage objects. This proves recreated target policy and
transport, not recovery of real bytes.

1. Save pre-remediation target Storage/Auth counts.
2. Apply only the reviewed idempotent contract (**TARGET MUTATION**):

   ```powershell
   Assert-DrTargetOperational
   npx --yes supabase@2.114.0 db query `
     --linked `
     --project-ref $targetRef `
     --file supabase/migrations/20260719000000_venue_media_storage.sql `
     --output-format text
   ```

3. Rerun verifier. Require one public `venue-media` bucket, WebP-only,
   358,400-byte limit; `storage.objects` owner
   `supabase_storage_admin`, RLS on/force off; exactly one total/read policy:
   `venue media public read`, permissive SELECT, roles `anon,authenticated`,
   using `bucket_id = 'venue-media'::text`, empty check; zero browser writes.
4. Create local probe and exact paths:

   ```powershell
   $probePath = Join-Path $env:TEMP "sunnyseat-dr-$sessionId.webp"
   [IO.File]::WriteAllBytes(
     $probePath,
     [Convert]::FromBase64String(
       'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA='
     )
   )
   $objectPath = "dr/$sessionId/probe.webp"
   $anonObjectPath = "dr/$sessionId/anon-denied.webp"
   $authObjectPath = "dr/$sessionId/auth-denied.webp"
   foreach ($path in @($objectPath, $anonObjectPath, $authObjectPath)) {
     [void]$cleanupLedger.storage_paths.Add($path)
   }
   ```

5. Service-role upload (**TARGET MUTATION**):

   ```powershell
   Assert-TargetOriginBinding
   $uploadUri =
     "$targetOrigin/storage/v1/object/venue-media/$objectPath"
   if (([Uri]$uploadUri).Host -ne "$targetRef.supabase.co") {
     throw 'Upload URI is not target.'
   }
   $upload = Invoke-WebRequest `
     -Method Post `
     -Uri $uploadUri `
     -Headers $serviceHeaders `
     -ContentType 'image/webp' `
     -InFile $probePath
   if ($upload.StatusCode -notin 200, 201) { throw 'Upload failed.' }
   ```

   Anonymous public GET must match local probe SHA-256.
6. Anonymous upload attempt to `$anonObjectPath` (**TARGET MUTATION**, denial
   expected):

   ```powershell
   Assert-TargetOriginBinding
   $anonUpload = Invoke-WebRequest `
     -Method Post `
     -Uri "$targetOrigin/storage/v1/object/venue-media/$anonObjectPath" `
     -Headers $anonHeaders `
     -ContentType 'image/webp' `
     -InFile $probePath `
     -SkipHttpErrorCheck
   if ($anonUpload.StatusCode -notin 401, 403, 404) {
     throw 'Anonymous write not denied.'
   }
   ```

7. Create one confirmed target-only user (**TARGET MUTATION**):

   ```powershell
   $drAuthEmail = "sunnyseat-dr+$sessionId@example.invalid"
   $drAuthPassword = [Convert]::ToBase64String(
     [Security.Cryptography.RandomNumberGenerator]::GetBytes(36)
   )
   Assert-TargetOriginBinding
   $createUser = Invoke-WebRequest `
     -Method Post `
     -Uri "$targetOrigin/auth/v1/admin/users" `
     -Headers $serviceHeaders `
     -ContentType 'application/json' `
     -Body (@{
       email = $drAuthEmail
       password = $drAuthPassword
       email_confirm = $true
     } | ConvertTo-Json -Compress)
   $drAuthUserId = ($createUser.Content | ConvertFrom-Json).id
   if (-not $drAuthUserId) { throw 'No target Auth user ID.' }
   $cleanupLedger.auth_user_id = $drAuthUserId
   ```

8. Create target-only session/token (**TARGET MUTATION**):

   ```powershell
   Assert-TargetOriginBinding
   $tokenResponse = Invoke-WebRequest `
     -Method Post `
     -Uri "$targetOrigin/auth/v1/token?grant_type=password" `
     -Headers @{ apikey = $env:DR_TARGET_ANON_KEY } `
     -ContentType 'application/json' `
     -Body (@{
       email = $drAuthEmail
       password = $drAuthPassword
     } | ConvertTo-Json -Compress)
   $drAuthAccessToken =
     ($tokenResponse.Content | ConvertFrom-Json).access_token
   $authenticatedHeaders = @{
     apikey = $env:DR_TARGET_ANON_KEY
     Authorization = "Bearer $drAuthAccessToken"
   }
   ```

9. Authenticated upload to `$authObjectPath` (**TARGET MUTATION**, denial
   expected):

   ```powershell
   Assert-TargetOriginBinding
   $authUpload = Invoke-WebRequest `
     -Method Post `
     -Uri "$targetOrigin/storage/v1/object/venue-media/$authObjectPath" `
     -Headers $authenticatedHeaders `
     -ContentType 'image/webp' `
     -InFile $probePath `
     -SkipHttpErrorCheck
   if ($authUpload.StatusCode -notin 401, 403, 404) {
     throw 'Authenticated write not denied.'
   }
   ```

10. Run the authenticated negative read-RPC assertion. Retain exact IDs/paths
    only in memory for cleanup; redact/clear password/token afterwards.
11. Save post-transport verifier. Probe/user/session count deltas are expected;
    hard security gates still pass. If a denied upload succeeded, stop and
    cleanup that exact path; never prefix/bucket delete.

## Phase 7: mechanically isolated Vercel preview

Reject current production identifiers by runtime value and reviewed hash
binding:

- project name `sunnyseat` and the project ID supplied in this PowerShell
  session, after it matches
  `$expectedProductionVercelProjectIdSha256`;
- production deployment ID supplied in this PowerShell session, after it
  matches `$expectedAuthoringProductionDeploymentIdSha256`;
- URL/alias `https://sunnyseat.vercel.app` / `sunnyseat.vercel.app`;
- team display `Enhancior`; root `nextjs-app`.

Create a brand-new dedicated Vercel project for this session. A pre-existing
project or shared Preview environment is forbidden, even if it appears empty.
Use a clean disposable application copy with no `.vercel` or env file:

```powershell
$expectedProductionVercelProjectIdSha256 =
  '<sha256-of-reviewed-production-vercel-project-id>'
$expectedAuthoringProductionDeploymentIdSha256 =
  '<sha256-of-reviewed-authoring-production-deployment-id>'
$productionVercelProjectId = '<runtime-production-vercel-project-id>'
$authoringProductionDeploymentId =
  '<runtime-authoring-production-deployment-id>'
$productionDeploymentId = ''
$productionUrl = 'https://sunnyseat.vercel.app'
$productionAlias = 'sunnyseat.vercel.app'

$stagingVercelTeamId = '<exact-enhancior-team-id>'
$stagingVercelTeamSlug = '<exact-enhancior-team-slug>'
$stagingVercelProjectId = ''
$stagingVercelProjectName = ("sunnyseat-dr-$sessionId").ToLowerInvariant()
$stagingVercelCreatedAtUtc = $null
$approvedStagingAliases = @()
$drLocalRoot = Join-Path (
  [IO.Path]::GetTempPath()
) "sunnyseat-dr-$sessionId"
$stagingWorkspace = Join-Path $drLocalRoot 'nextjs-app'
$cleanupLedger.local_root = $drLocalRoot

function Assert-DrLocalRoot {
  $expected = [IO.Path]::GetFullPath(
    (Join-Path ([IO.Path]::GetTempPath()) "sunnyseat-dr-$sessionId")
  ).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $actual = [IO.Path]::GetFullPath(
    "$($cleanupLedger.local_root)"
  ).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $expectedWorkspace = [IO.Path]::GetFullPath(
    (Join-Path $actual 'nextjs-app')
  ).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $actualWorkspace = [IO.Path]::GetFullPath(
    $stagingWorkspace
  ).TrimEnd([IO.Path]::DirectorySeparatorChar)
  if ($actual -ne $expected -or
      $actualWorkspace -ne $expectedWorkspace -or
      [IO.Path]::GetFileName($actual) -ne "sunnyseat-dr-$sessionId") {
    throw 'Disposable local root is outside the exact session temp path.'
  }
}

function Assert-DrApplicationWorkspace {
  param([switch]$AllowVercelLink)
  Assert-DrLocalRoot
  if (-not (Test-Path -LiteralPath $drLocalRoot -PathType Container)) {
    throw 'Disposable local root is missing.'
  }
  if (-not (Test-Path -LiteralPath $stagingWorkspace -PathType Container)) {
    throw 'Disposable workspace does not contain nextjs-app.'
  }
  $commitRaw = & git -C $drLocalRoot rev-parse HEAD
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not read disposable workspace commit.'
  }
  $workspaceCommit = ($commitRaw -join "`n").Trim()
  if ($workspaceCommit -ne $expectedApplicationCommit) {
    throw 'Disposable workspace is not at the expected application commit.'
  }
  $workspaceStatus = (& git -C $drLocalRoot status --porcelain=v1) -join "`n"
  if ($LASTEXITCODE -ne 0 -or
      -not [string]::IsNullOrWhiteSpace($workspaceStatus)) {
    throw 'Disposable workspace is not clean.'
  }

  foreach ($forbiddenPath in @(
    (Join-Path $stagingWorkspace '.env'),
    (Join-Path $stagingWorkspace '.env.local'),
    (Join-Path $stagingWorkspace '.env.production'),
    (Join-Path $stagingWorkspace '.env.preview')
  )) {
    if (Test-Path -LiteralPath $forbiddenPath) {
      throw "Disposable workspace contains forbidden local state: $forbiddenPath"
    }
  }

  $vercelLinkPath = Join-Path $stagingWorkspace '.vercel/project.json'
  if (-not $AllowVercelLink) {
    if (Test-Path -LiteralPath (Join-Path $stagingWorkspace '.vercel')) {
      throw 'Disposable workspace was linked before the dedicated project guard.'
    }
    return
  }
  if (Test-Path -LiteralPath $vercelLinkPath) {
    $link = Get-Content -Raw -LiteralPath $vercelLinkPath | ConvertFrom-Json
    if ($link.projectId -ne $stagingVercelProjectId -or
        $link.orgId -ne $stagingVercelTeamId) {
      throw 'Disposable workspace Vercel link is not session-bound.'
    }
  }
}

function Get-VercelApiJson {
  param([Parameter(Mandatory)][string]$Path)
  $json = & npx --yes "vercel@$VercelCliVersion" api $Path `
    --scope $stagingVercelTeamSlug
  if ($LASTEXITCODE -ne 0) { throw "Vercel API failed: $Path" }
  $json | ConvertFrom-Json
}

function ConvertFrom-VercelTimestamp {
  param([Parameter(Mandatory)]$Value)
  if ($Value -is [ValueType] -or "$Value" -match '^[0-9]+$') {
    return [DateTimeOffset]::FromUnixTimeMilliseconds(
      [Int64]$Value
    ).UtcDateTime
  }
  [DateTimeOffset]::Parse("$Value").UtcDateTime
}

function Assert-ProductionVercelIdentityBinding {
  if ($productionVercelProjectId -notmatch '^prj_[A-Za-z0-9]+$' -or
      $authoringProductionDeploymentId -notmatch '^dpl_[A-Za-z0-9]+$' -or
      $expectedProductionVercelProjectIdSha256 -notmatch
        '^[0-9a-fA-F]{64}$' -or
      $expectedAuthoringProductionDeploymentIdSha256 -notmatch
        '^[0-9a-fA-F]{64}$') {
    throw 'Production Vercel identity placeholders must be supplied at runtime.'
  }
  if ((Get-TextSha256 $productionVercelProjectId) -ne
      $expectedProductionVercelProjectIdSha256.ToLowerInvariant()) {
    throw 'Production Vercel project ID does not match reviewed hash binding.'
  }
  if ((Get-TextSha256 $authoringProductionDeploymentId) -ne
      $expectedAuthoringProductionDeploymentIdSha256.ToLowerInvariant()) {
    throw 'Authoring production deployment ID does not match reviewed hash binding.'
  }
}

function Get-CurrentProductionVercelDeployment {
  Assert-ProductionVercelIdentityBinding
  $json = & npx --yes vercel@59.1.3 inspect $productionUrl `
    --json `
    --scope $stagingVercelTeamSlug
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not refresh production deployment binding.'
  }
  $deployment = $json | ConvertFrom-Json
  if ($deployment.projectId -ne $productionVercelProjectId -or
      $deployment.target -ne 'production' -or
      $deployment.readyState -ne 'READY' -or
      $deployment.url -ne ([Uri]$productionUrl).Host) {
    throw 'Production project/deployment/target binding mismatch.'
  }
  $deployment
}

function Start-ProductionVercelBaseline {
  if ($productionDeploymentId) {
    throw 'Production baseline already captured.'
  }
  Assert-ProductionVercelIdentityBinding
  $script:productionDeploymentId =
    (Get-CurrentProductionVercelDeployment).id
  if (-not $productionDeploymentId) {
    throw 'Production deployment ID missing.'
  }
  if ($productionDeploymentId -ne $authoringProductionDeploymentId) {
    throw 'Production deployment differs from the reviewed authoring binding.'
  }
}

function Assert-ProductionVercelBinding {
  if (-not $productionDeploymentId) {
    throw 'Fresh production baseline was not captured.'
  }
  $current = Get-CurrentProductionVercelDeployment
  if ($current.id -ne $productionDeploymentId) {
    throw 'Production deployment changed during the drill; stop.'
  }
}

function Assert-VercelStagingProject {
  Assert-DrApplicationWorkspace -AllowVercelLink
  Assert-DrTargetOperational
  Assert-ProductionVercelBinding
  if (-not $stagingVercelProjectId -or
      $stagingVercelProjectId -eq $productionVercelProjectId -or
      $stagingVercelProjectName -eq 'sunnyseat') {
    throw 'Staging project collides with production.'
  }
  if ($cleanupLedger.vercel_project_id -ne $stagingVercelProjectId) {
    throw 'Staging project is absent from the cleanup ledger.'
  }
  $linkPath = Join-Path $stagingWorkspace '.vercel/project.json'
  if (-not (Test-Path -LiteralPath $linkPath)) {
    throw 'Staging workspace is not linked.'
  }
  $link = Get-Content -Raw -LiteralPath $linkPath | ConvertFrom-Json
  if ($link.projectId -ne $stagingVercelProjectId -or
      $link.orgId -ne $stagingVercelTeamId) {
    throw 'Local staging binding mismatch.'
  }
  $project = Get-VercelApiJson (
    "/v9/projects/$stagingVercelProjectId" +
    "?teamId=$stagingVercelTeamId"
  )
  $createdUtc = ConvertFrom-VercelTimestamp $project.createdAt
  if ($project.id -ne $stagingVercelProjectId -or
      $project.name -ne $stagingVercelProjectName -or
      $project.accountId -ne $stagingVercelTeamId -or
      $createdUtc -lt $sessionStartUtc -or
      $createdUtc -gt (Get-Date).ToUniversalTime().AddMinutes(5)) {
    throw 'Remote disposable project identity/creation mismatch.'
  }
  if ($stagingVercelCreatedAtUtc -and
      $createdUtc -ne $stagingVercelCreatedAtUtc) {
    throw 'Disposable project creation timestamp drifted.'
  }
}

function Assert-VercelPreview {
  Assert-VercelStagingProject
  if (-not $previewDeploymentId -or -not $previewUrl -or
      $previewDeploymentId -eq $productionDeploymentId -or
      $cleanupLedger.preview_deployment_id -ne $previewDeploymentId -or
      $previewUrl.TrimEnd('/') -eq $productionUrl) {
    throw 'Preview binding missing or collides with production.'
  }
  $deployment = Get-VercelApiJson (
    "/v13/deployments/$previewDeploymentId" +
    "?teamId=$stagingVercelTeamId"
  )
  $aliases = @($deployment.alias)
  if ($deployment.id -ne $previewDeploymentId -or
      $deployment.projectId -ne $stagingVercelProjectId -or
      $deployment.readyState -ne 'READY' -or
      $deployment.target -eq 'production' -or
      $deployment.url -ne ([Uri]$previewUrl).Host -or
      $deployment.meta.sunnyseatDrSourceCommit -ne
        $expectedApplicationCommit -or
      $aliases -contains $productionAlias) {
    throw 'Preview identity/environment/alias guard failed.'
  }
  foreach ($alias in $aliases) {
    if ($approvedStagingAliases -notcontains $alias) {
      throw "Unapproved alias: $alias"
    }
  }
  $environment = Get-VercelApiJson (
    "/v10/projects/$stagingVercelProjectId/env" +
    "?teamId=$stagingVercelTeamId"
  )
  foreach ($name in @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUNNYSEAT_VENUE_STORE',
    'SUNNYSEAT_SUN_ENGINE',
    'SUNNYSEAT_FEEDBACK_PERSISTENCE',
    'SUNNYSEAT_REVIEW_PERSISTENCE',
    'SUNNYSEAT_DR_SOURCE_COMMIT'
  )) {
    $matches = @($environment.envs | Where-Object key -eq $name)
    if ($matches.Count -lt 1) { throw "$name missing." }
    foreach ($match in $matches) {
      if (@($match.target) -contains 'production') {
        throw "$name reaches Production."
      }
    }
  }
}
```

Create and populate the clean exact-commit disposable workspace before creating
any Vercel project. The workspace must not be the operator's current checkout:

```powershell
Assert-ProductionVercelBinding
Assert-DrTargetOperational
Assert-DrLocalRoot
if (Test-Path -LiteralPath $drLocalRoot) {
  throw 'Disposable local root already exists; choose a new session or cleanup first.'
}
$resolvedApplicationCommit = (
  & git -C $authoringRepositoryRoot rev-parse "$expectedApplicationCommit^{commit}"
).Trim()
if ($LASTEXITCODE -ne 0 -or
    $resolvedApplicationCommit -ne $expectedApplicationCommit) {
  throw 'Authoring repository does not contain the exact reviewed commit.'
}

& git clone --no-local $authoringRepositoryRoot $drLocalRoot
if ($LASTEXITCODE -ne 0) { throw 'Disposable workspace clone failed.' }
& git -C $drLocalRoot switch --detach $expectedApplicationCommit
if ($LASTEXITCODE -ne 0) { throw 'Could not detach workspace at exact commit.' }
Assert-DrApplicationWorkspace
$sourceBinding = [ordered]@{
  application_commit = $expectedApplicationCommit
  application_commit_sha256 = Get-TextSha256 $expectedApplicationCommit
  source_repository_root_sha256 = Get-TextSha256 $authoringRepositoryRoot
  disposable_workspace_sha256 = Get-TextSha256 $drLocalRoot
}
$sourceBinding | ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath (
    Join-Path $sessionEvidenceDirectory 'application-source-binding.json'
  ) -Encoding utf8NoBOM
```

Create and ledger the session-dedicated project before linking it. The provider
creation timestamp is the proof that this was not a pre-existing project:

```powershell
Assert-ProductionVercelBinding
Assert-DrTargetOperational
$cleanupLedger.vercel_project_name = $stagingVercelProjectName

npx --yes vercel@59.1.3 project add $stagingVercelProjectName `
  --scope $stagingVercelTeamSlug
if ($LASTEXITCODE -ne 0) {
  throw 'Dedicated Vercel project creation failed or name already existed.'
}

$createdProject = Get-VercelApiJson (
  "/v9/projects/$stagingVercelProjectName" +
  "?teamId=$stagingVercelTeamId"
)
$stagingVercelProjectId = $createdProject.id
$stagingVercelCreatedAtUtc =
  ConvertFrom-VercelTimestamp $createdProject.createdAt
if (-not $stagingVercelProjectId -or
    $stagingVercelProjectId -eq $productionVercelProjectId -or
    $createdProject.name -ne $stagingVercelProjectName -or
    $createdProject.accountId -ne $stagingVercelTeamId -or
    $stagingVercelCreatedAtUtc -lt $sessionStartUtc -or
    $stagingVercelCreatedAtUtc -gt
      (Get-Date).ToUniversalTime().AddMinutes(5)) {
  throw 'New Vercel project identity/creation proof failed.'
}
$cleanupLedger.vercel_project_id = $stagingVercelProjectId

Push-Location $stagingWorkspace
try {
  npx --yes vercel@59.1.3 link `
    --yes `
    --scope $stagingVercelTeamSlug `
    --project $stagingVercelProjectName
  if ($LASTEXITCODE -ne 0) { throw 'Disposable project link failed.' }
} finally { Pop-Location }

$zeroEnvironment = Get-VercelApiJson (
  "/v10/projects/$stagingVercelProjectId/env" +
  "?teamId=$stagingVercelTeamId"
)
if (@($zeroEnvironment.envs).Count -ne 0) {
  throw 'New disposable project is not zero-state; cleanup and stop.'
}
Assert-VercelStagingProject
```

If CLI `59.1.3` JSON/API shape differs, stop as a manual guard failure; do not
text-parse or weaken the guard.

Set only Preview-scoped target values. The helper revalidates source target and
staging project immediately before every environment mutation:

```powershell
function Set-DrPreviewEnvironment {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Value
  )
  Assert-VercelStagingProject
  Assert-TargetOriginBinding
  $before = Get-VercelApiJson (
    "/v10/projects/$stagingVercelProjectId/env" +
    "?teamId=$stagingVercelTeamId"
  )
  $beforeEnvs = @($before.envs)
  if ($beforeEnvs.Count -ne
      $cleanupLedger.preview_environment_ids.Count -or
      @($beforeEnvs | Where-Object key -eq $Name).Count -ne 0) {
    throw 'Unexpected or pre-existing Preview environment state.'
  }

  Push-Location $stagingWorkspace
  try {
    $Value | & npx --yes vercel@59.1.3 env add $Name preview `
      --scope $stagingVercelTeamSlug
    if ($LASTEXITCODE -ne 0) { throw "Could not set $Name." }
  } finally { Pop-Location }

  $after = Get-VercelApiJson (
    "/v10/projects/$stagingVercelProjectId/env" +
    "?teamId=$stagingVercelTeamId"
  )
  $beforeIds = @($beforeEnvs | ForEach-Object id)
  $created = @($after.envs | Where-Object {
    $_.key -eq $Name -and $beforeIds -notcontains $_.id
  })
  if ($created.Count -ne 1 -or
      -not $created[0].id -or
      @($created[0].target).Count -ne 1 -or
      @($created[0].target)[0] -ne 'preview') {
    throw 'Could not prove one exact new Preview-only environment record.'
  }
  [void]$cleanupLedger.preview_environment_ids.Add($created[0].id)
}

Set-DrPreviewEnvironment NEXT_PUBLIC_SUPABASE_URL $targetOrigin
Set-DrPreviewEnvironment `
  SUPABASE_SERVICE_ROLE_KEY `
  $env:DR_TARGET_SERVICE_ROLE_KEY
Set-DrPreviewEnvironment SUNNYSEAT_VENUE_STORE supabase
Set-DrPreviewEnvironment SUNNYSEAT_SUN_ENGINE real
Set-DrPreviewEnvironment SUNNYSEAT_FEEDBACK_PERSISTENCE supabase
Set-DrPreviewEnvironment SUNNYSEAT_REVIEW_PERSISTENCE supabase
Set-DrPreviewEnvironment SUNNYSEAT_DR_SOURCE_COMMIT $expectedApplicationCommit
```

Configure no `NEXT_PUBLIC_SUPABASE_ANON_KEY`, source key, cron secret,
production target/domain, scheduled job, SMTP/OAuth/webhook/callback. The
target anon key is used only in direct Phase 6 negative API checks through the
process-local `DR_TARGET_ANON_KEY`; it is never a preview application
environment variable. Deploy from guarded workspace
(**TARGET-BOUND VERCEL MUTATION**):

```powershell
Assert-VercelStagingProject
Assert-DrApplicationWorkspace -AllowVercelLink
Push-Location $stagingWorkspace
try {
  $previewUrl = (
    & npx --yes vercel@59.1.3 deploy `
      --yes `
      --target preview `
      --meta "sunnyseatDrSourceCommit=$expectedApplicationCommit" `
      --scope $stagingVercelTeamSlug
  ).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Preview deploy failed.' }

  $inspectionJson = & npx --yes vercel@59.1.3 inspect $previewUrl `
    --json `
    --scope $stagingVercelTeamSlug
  if ($LASTEXITCODE -ne 0) { throw 'Preview inspect failed.' }
  $previewDeploymentId = ($inspectionJson | ConvertFrom-Json).id
  if (-not $previewDeploymentId) {
    throw 'Preview deployment ID missing.'
  }
  $cleanupLedger.preview_deployment_id = $previewDeploymentId
} finally { Pop-Location }
Assert-VercelPreview
```

### Deterministic preview smoke and artifacts

Create one canonical, opaque probe session ID. The collector uses origin
sequences 001..004; sequence 004 is the provider-proven target-binding read.
Reserve 005..007 for browser/detail/reviews smoke and 008 for the single
target-bound feedback mutation:

```powershell
$probeNonce = [Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(4)
).ToLowerInvariant()
$probeSessionId = "lr-$($sessionId.ToLowerInvariant())-$probeNonce"
```

Run the exact collector:

```powershell
Assert-VercelPreview
Push-Location $stagingWorkspace
node scripts/launch-resilience/venue-probe.mjs collect `
  --deployment-id $previewDeploymentId `
  --base-url $previewUrl `
  --environment preview `
  --origin-count 4 `
  --edge-count 0 `
  --concurrency 1 `
  --session-id $probeSessionId `
  --output-dir $smokeEvidenceDirectory
Pop-Location
```

The collector writes `client-samples.jsonl`, `manifest.json`, and
`provider-evidence-plan.json`. Execute every
`provider-evidence-plan.json.exports[].argv` array exactly from the linked
`$stagingWorkspace`, save each stdout byte-for-byte beside the plan under its
declared `stdout_file`, and do not hand-author or trim a preview metric/log
command. For preview plans the generated Vercel commands use
`--environment preview` and omit Production targeting. If the generated plan
does not match the reviewed `venue-probe.mjs` interface, stop instead of
editing the commands.

Build the preview probe report from those generated captures:

```powershell
Assert-VercelPreview
$previewProviderPlanPath = Join-Path (
  $smokeEvidenceDirectory
) 'provider-evidence-plan.json'
$previewProviderPlan = Get-Content -Raw -LiteralPath (
  $previewProviderPlanPath
) | ConvertFrom-Json
$previewProviderReportDirectory = Join-Path (
  $smokeEvidenceDirectory
) 'preview-probe-report'
$previewRequestLogPaths = @(
  $previewProviderPlan.exports |
    Where-Object { "$($_.id)".StartsWith('request_log_') } |
    ForEach-Object { Join-Path $smokeEvidenceDirectory $_.stdout_file }
)

Push-Location $stagingWorkspace
try {
  node scripts/launch-resilience/venue-probe.mjs report `
    --deployment-id $previewDeploymentId `
    --supabase-host "$targetRef.supabase.co" `
    --client (Join-Path $smokeEvidenceDirectory 'client-samples.jsonl') `
    --plan $previewProviderPlanPath `
    --provider-count (
      Join-Path $smokeEvidenceDirectory 'function-invocation-count.json'
    ) `
    --provider-duration (
      Join-Path $smokeEvidenceDirectory 'function-duration.json'
    ) `
    --request-log ($previewRequestLogPaths -join ',') `
    --external (
      Join-Path $smokeEvidenceDirectory 'external-api-request-count.json'
    ) `
    --environment preview `
    --min-cold 20 `
    --threshold-ms 5000 `
    --output-dir $previewProviderReportDirectory
  if ($LASTEXITCODE -notin 0, 2) {
    throw 'Preview probe report command failed unexpectedly.'
  }
} finally { Pop-Location }

$previewProbeReportPath = Join-Path $previewProviderReportDirectory 'report.json'
$previewProbeReport = Get-Content -Raw -LiteralPath $previewProbeReportPath |
  ConvertFrom-Json
if (-not $previewProbeReport.acceptance.correctness -or
    -not $previewProbeReport.acceptance.provider_request_evidence_complete -or
    -not $previewProbeReport.acceptance.provider_join_complete -or
    -not $previewProbeReport.acceptance.dependency_attribution_complete -or
    -not $previewProbeReport.acceptance.external_provider_complete -or
    [int]$previewProbeReport.raw_counts.provider_external_requests -ne 12) {
  throw 'Preview probe did not prove correctness plus exact target dependency attribution.'
}
foreach ($reportError in @($previewProbeReport.errors)) {
  if ($reportError -notmatch
      '^(Edge cache lane requires|Need at least 20 provider-classified cold samples)') {
    throw "Unexpected preview probe report error: $reportError"
  }
}
```

The preview report's overall acceptance is expected to remain FAIL for this DR
smoke because `--min-cold 20` is non-loosenable and no edge lane is collected.
For the restore drill, use it only as the preview-capable proof of HTTP/payload
correctness, request-log correlation, provider join, and direct dependency
attribution against `$targetRef.supabase.co`.

Create `$smokeScriptPath` inside the ignored evidence directory with this exact
body (not in repo source):

```javascript
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const [baseUrl, evidenceDir, expectedDeploymentId, sessionId] =
  process.argv.slice(2);
assert(baseUrl && evidenceDir && expectedDeploymentId && sessionId);
await mkdir(evidenceDir, { recursive: true });

const requestId = `${sessionId}-origin-005`;
const detailRequestId = `${sessionId}-origin-006`;
const reviewsRequestId = `${sessionId}-origin-007`;
function assertResponseBinding(response, expectedRequestId) {
  assert.equal(
    response.headers.get('x-sunnyseat-request-id'),
    expectedRequestId,
  );
  assert.equal(
    response.headers.get('x-sunnyseat-deployment-id'),
    expectedDeploymentId,
  );
}
const listUrl = new URL(
  '/api/venues?lat=57.7089&lng=11.9746&radiusKm=3',
  baseUrl,
);
const listStartedAtUtc = new Date().toISOString();
const listResponse = await fetch(listUrl, {
  headers: { 'x-sunnyseat-request-id': requestId },
});
assert.equal(listResponse.status, 200);
assertResponseBinding(listResponse, requestId);
const payload = await listResponse.json();
const listEndedAtUtc = new Date().toISOString();
assert.equal(payload.venues.length, 42);
assert.equal(new Set(payload.venues.map((venue) => venue.id)).size, 42);
assert.equal(new Set(payload.venues.map((venue) => venue.slug)).size, 42);
for (const venue of payload.venues) {
  assert.equal(venue.sunDaySeries.length, 61);
  venue.sunDaySeries.forEach((step, index) => {
    assert.equal(step.minutes, 360 + index * 15);
  });
}
const venue = payload.venues.find((candidate) => candidate.slug);
assert(venue);

const detailResponse = await fetch(
  new URL('/api/venues/' + encodeURIComponent(venue.slug), baseUrl),
  { headers: { 'x-sunnyseat-request-id': detailRequestId } },
);
assert.equal(detailResponse.status, 200);
assertResponseBinding(detailResponse, detailRequestId);
const detailPayload = await detailResponse.json();
assert.equal(detailPayload.venue.id, venue.id);
assert.equal(detailPayload.venue.slug, venue.slug);

const reviewsUrl = new URL('/api/reviews', baseUrl);
reviewsUrl.searchParams.set('venueId', venue.slug);
const reviewsResponse = await fetch(reviewsUrl, {
  headers: { 'x-sunnyseat-request-id': reviewsRequestId },
});
assert.equal(reviewsResponse.status, 200);
assertResponseBinding(reviewsResponse, reviewsRequestId);
const reviewsPayload = await reviewsResponse.json();
assert(Array.isArray(reviewsPayload.reviews));

const consoleProblems = [];
const pageErrors = [];
const responses = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  locale: 'sv-SE',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
try {
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) {
    consoleProblems.push({ type: message.type(), text: message.text() });
  }
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  const url = new URL(response.url());
  if (url.origin !== new URL(baseUrl).origin) return;
  responses.push({
    path: url.pathname,
    status: response.status(),
    requestId: response.headers()['x-sunnyseat-request-id'] ?? null,
    deploymentId:
      response.headers()['x-sunnyseat-deployment-id'] ?? null,
  });
});

await page.goto(
  new URL('/?venue=' + encodeURIComponent(venue.slug) + '&_time=14:00', baseUrl),
  { waitUntil: 'domcontentloaded' },
);
const detail = page.locator(
  '[data-testid="desktop-venue-detail-panel"]:visible',
);
await detail.waitFor({ state: 'visible' });
await detail.getByText('ÖPPNA I KARTOR', { exact: true }).waitFor();
await detail.getByText('Omdömen', { exact: true }).waitFor();
await detail.locator('[data-testid="venue-detail-hero-fallback"]').waitFor();
await page.waitForTimeout(1500);

const unexpected = responses.filter((item) => {
  const allowedMissingStorage =
    item.status === 404 &&
    item.path.startsWith('/storage/v1/object/public/venue-media/');
  return item.status >= 400 && !allowedMissingStorage;
});
assert.deepEqual(unexpected, []);
assert.deepEqual(consoleProblems, []);
assert.deepEqual(pageErrors, []);

for (const path of ['/api/venues/' + venue.slug, '/api/reviews']) {
  assert(responses.some((item) =>
    item.path === path &&
    item.status === 200
  ));
}

await page.screenshot({
  path: evidenceDir + '/preview-detail-fallback.png',
  fullPage: true,
});
await writeFile(
  evidenceDir + '/preview-smoke.json',
  JSON.stringify({
    requestId,
    listEchoedRequestId:
      listResponse.headers.get('x-sunnyseat-request-id'),
    detailRequestId,
    detailEchoedRequestId:
      detailResponse.headers.get('x-sunnyseat-request-id'),
    detailDeploymentId:
      detailResponse.headers.get('x-sunnyseat-deployment-id'),
    reviewsRequestId,
    reviewsEchoedRequestId:
      reviewsResponse.headers.get('x-sunnyseat-request-id'),
    reviewsDeploymentId:
      reviewsResponse.headers.get('x-sunnyseat-deployment-id'),
    listStartedAtUtc,
    listEndedAtUtc,
    deploymentId: expectedDeploymentId,
    venueId: venue.id,
    venueSlug: venue.slug,
    venueCount: 42,
    seriesCountPerVenue: 61,
    responses,
    consoleProblems,
    pageErrors,
  }, null, 2),
);
} finally {
  await browser.close();
}
```

Run from `nextjs-app`:

```powershell
Assert-VercelPreview
node $smokeScriptPath `
  $previewUrl `
  $smokeEvidenceDirectory `
  $previewDeploymentId `
  $probeSessionId
```

Required artifacts: collector raw JSONL; generated provider plan exports;
`preview-probe-report/report.json`; `preview-smoke.json`; fallback screenshot;
sanitized Vercel project/deployment/env metadata; correlated
runtime/external-dependency logs; SHA-256 evidence manifest. A missing selector,
path, deployment/request header, unexpected console/page error, or non-Storage
4xx/5xx is a failure.

For every unique venue request, directly correlate client timing, Vercel log,
start type/region/status, and these target paths:

| Operation | Method | Destination |
| --- | --- | --- |
| `venue_list` | GET | `/rest/v1/venues` |
| `sun_geometry_batch` | POST | `/rest/v1/rpc/read_current_venue_sun_geometry_batch` |
| `weather_batch` | GET | `/rest/v1/weather_bucket_snapshots` |

Require zero unattributed dependency events, zero Met.no calls, and zero
shadow-caster RPCs in exact request windows. Cache MISS is not cold start. This
small DR cohort does not satisfy the separate 20 provider-classified cold-start
gate. Never infer endpoint attribution from code, cache headers, or host totals.

Before any preview-routed mutation, prove that the exact deployed preview made
the collector's 004 read against this session's exact target host. An
environment value, application response, source inspection, or aggregate host
total is not proof. The proof must come from the reviewed preview-capable probe
report, built from the generated provider plan, exact request-log captures, and
the preview external-dependency export:

```powershell
$previewSmokePath = Join-Path $smokeEvidenceDirectory 'preview-smoke.json'
$previewSmoke = Get-Content -Raw -LiteralPath $previewSmokePath |
  ConvertFrom-Json
if ($previewSmoke.requestId -ne "$probeSessionId-origin-005" -or
    $previewSmoke.listEchoedRequestId -ne "$probeSessionId-origin-005" -or
    $previewSmoke.deploymentId -ne $previewDeploymentId -or
    $previewSmoke.detailRequestId -ne "$probeSessionId-origin-006" -or
    $previewSmoke.detailEchoedRequestId -ne "$probeSessionId-origin-006" -or
    $previewSmoke.detailDeploymentId -ne $previewDeploymentId -or
    $previewSmoke.reviewsRequestId -ne "$probeSessionId-origin-007" -or
    $previewSmoke.reviewsEchoedRequestId -ne "$probeSessionId-origin-007" -or
    $previewSmoke.reviewsDeploymentId -ne $previewDeploymentId) {
  throw 'Preview smoke identity does not match the binding request.'
}

$previewClientSamples = @(
  Get-Content -LiteralPath (
    Join-Path $smokeEvidenceDirectory 'client-samples.jsonl'
  ) | ForEach-Object { $_ | ConvertFrom-Json }
)
$bindingSamples = @(
  $previewClientSamples |
    Where-Object { $_.probe_id -eq "$probeSessionId-origin-004" }
)
if ($bindingSamples.Count -ne 1 -or
    $bindingSamples[0].http_status -ne 200 -or
    $bindingSamples[0].response_request_id -ne "$probeSessionId-origin-004" -or
    $bindingSamples[0].response_deployment_id -ne $previewDeploymentId) {
  throw 'Preview collector binding sample 004 is missing or unbound.'
}

$previewTargetBindingEvidencePath =
  Join-Path $previewProviderReportDirectory 'report.json'
$previewTargetBindingEvidence = Get-Content -Raw -LiteralPath (
  $previewTargetBindingEvidencePath
)
$previewTargetBindingEvidenceSha256 =
  Get-TextSha256 $previewTargetBindingEvidence
$previewTargetBindingProven = $true

function Assert-PreviewProbeTargetBinding {
  Assert-VercelPreview
  Assert-TargetOriginBinding
  if (-not $previewTargetBindingProven -or
      -not $previewTargetBindingEvidenceSha256) {
    throw 'Preview target binding was not probe/provider-proven.'
  }
  $currentEvidence = Get-Content -Raw -LiteralPath (
    $previewTargetBindingEvidencePath
  )
  if ((Get-TextSha256 $currentEvidence) -ne
      $previewTargetBindingEvidenceSha256) {
    throw 'Preview target-binding evidence changed after validation.'
  }
  $report = $currentEvidence | ConvertFrom-Json
  if (-not $report.acceptance.correctness -or
      -not $report.acceptance.provider_request_evidence_complete -or
      -not $report.acceptance.provider_join_complete -or
      -not $report.acceptance.dependency_attribution_complete -or
      -not $report.acceptance.external_provider_complete -or
      [int]$report.raw_counts.provider_external_requests -ne 12) {
    throw 'Preview probe report no longer proves target-bound dependencies.'
  }
}
```

This exact preview probe proof gates zero Met.no calls, zero shadow-caster RPCs,
and the three expected Supabase paths for the collector's 004 request before
any preview-routed write.

Perform one preview app-feedback write (**TARGET-BOUND APPLICATION MUTATION**):

```powershell
Assert-PreviewProbeTargetBinding
$feedbackRequestId = "$probeSessionId-origin-008"
$feedbackResponse = Invoke-WebRequest `
  -Method Post `
  -Uri "$previewUrl/api/feedback" `
  -Headers @{ 'x-sunnyseat-request-id' = $feedbackRequestId } `
  -ContentType 'application/json' `
  -Body (@{
    rating = 5
    comment = "DR $sessionId"
    locale = 'sv'
  } | ConvertTo-Json -Compress) `
  -SkipHttpErrorCheck
$feedbackPayload = $feedbackResponse.Content | ConvertFrom-Json
$drFeedbackId = "$($feedbackPayload.id)"
if (-not [string]::IsNullOrWhiteSpace($drFeedbackId)) {
  # Ledger the server-returned identifier before any status/header/shape
  # assertion so finally can remove it if a later assertion fails.
  $cleanupLedger.feedback_id = $drFeedbackId
}

# Re-prove the preview and target identities after the routed mutation, before
# trusting either the response or a read-back.
Assert-PreviewProbeTargetBinding
if ($feedbackResponse.StatusCode -ne 201) {
  throw 'Preview feedback write failed.'
}
if ($feedbackResponse.Headers['x-sunnyseat-request-id'].ToString() -ne
      $feedbackRequestId -or
    $feedbackResponse.Headers['x-sunnyseat-deployment-id'].ToString() -ne
      $previewDeploymentId) {
  throw 'Preview feedback response identity headers do not match.'
}
if ($drFeedbackId -notmatch
    '^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$') {
  throw 'Preview feedback response did not include an ID.'
}

Assert-TargetOriginBinding
$feedbackReadbackUri =
  "$targetOrigin/rest/v1/app_feedback" +
  "?select=id,rating,comment,locale&id=eq.$drFeedbackId"
$feedbackReadback = @(
  Invoke-RestMethod `
    -Method Get `
    -Uri $feedbackReadbackUri `
    -Headers $serviceHeaders
)
Assert-TargetOriginBinding
if ($feedbackReadback.Count -ne 1 -or
    $feedbackReadback[0].id -ne $drFeedbackId -or
    [int]$feedbackReadback[0].rating -ne 5 -or
    $feedbackReadback[0].comment -ne "DR $sessionId" -or
    $feedbackReadback[0].locale -ne 'sv') {
  throw 'Exact feedback row was not bound to the guarded restore target.'
}
```

Retain that exact ID for cleanup. Stop RTO only after smoke, echoed endpoint
identity, attribution, target read-back, and production-binding checks pass.

## Phase 8: rollback and cleanup (`finally`)

No production traffic was switched. Cleanup is armed before the paid confirmation
and runs after success, failure, timeout, unhealthy target state, or expired TTL.
TTL expiry is an escalation trigger, never a reason to skip cleanup. Before
selecting **Confirm** in Phase 2, load Phase 7's production/Vercel identity
variables and function block plus this entire cleanup function block. The
controller below verifies every required function and captures the fresh
Production deployment before the clone can be confirmed.

```powershell
function Invoke-DrCleanupStep {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][scriptblock]$Action
  )
  $started = (Get-Date).ToUniversalTime()
  try {
    & $Action
    [void]$cleanupLedger.steps.Add([ordered]@{
      name = $Name
      status = 'passed'
      started_at_utc = $started.ToString('o')
      ended_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    })
  } catch {
    $failure = [ordered]@{
      name = $Name
      status = 'failed'
      started_at_utc = $started.ToString('o')
      ended_at_utc = (Get-Date).ToUniversalTime().ToString('o')
      error = $_.Exception.Message
    }
    [void]$cleanupLedger.steps.Add($failure)
    [void]$cleanupLedger.errors.Add($failure)
  }
}

function Resolve-DrTargetCleanupIdentity {
  $projects = Get-CurrentSupabaseProjects
  $source = @($projects | Where-Object id -eq $sourceRef)
  if ($source.Count -ne 1 -or
      $source[0].name -ne $sourceProjectName -or
      $source[0].organization_id -ne $expectedOrganizationId -or
      $source[0].region -ne $expectedRegion) {
    throw 'Source identity drifted during cleanup.'
  }

  $matches = if ($cleanupLedger.target_ref) {
    @($projects | Where-Object id -eq $cleanupLedger.target_ref)
  } else {
    @($projects | Where-Object name -eq $targetName)
  }
  if ($matches.Count -eq 0) { return $null }
  if ($matches.Count -ne 1) {
    throw 'Disposable target did not resolve uniquely during cleanup.'
  }

  $target = $matches[0]
  $createdUtc = [DateTimeOffset]::Parse($target.created_at).UtcDateTime
  if ($target.id -eq $sourceRef -or
      $target.name -ne $targetName -or
      $target.organization_id -ne $expectedOrganizationId -or
      $target.region -ne $expectedRegion -or
      $createdUtc -lt $sessionStartUtc -or
      $createdUtc -gt $targetCreationDeadlineUtc) {
    throw 'Disposable target cleanup identity mismatch.'
  }
  $script:targetRef = $target.id
  $cleanupLedger.target_ref = $target.id
  $script:targetOrigin = "https://$targetRef.supabase.co"
  $target
}

function Get-VercelCleanupProjectIdentity {
  if (-not $cleanupLedger.vercel_project_name) { return $null }
  $expectedName = ("sunnyseat-dr-$sessionId").ToLowerInvariant()
  if ($cleanupLedger.vercel_project_name -ne $expectedName) {
    throw 'Disposable Vercel project name is outside the session namespace.'
  }
  $lookup = if ($cleanupLedger.vercel_project_id) {
    $cleanupLedger.vercel_project_id
  } else {
    $cleanupLedger.vercel_project_name
  }
  $project = Get-VercelApiJson (
    "/v9/projects/$lookup" + "?teamId=$stagingVercelTeamId"
  )
  $createdUtc = ConvertFrom-VercelTimestamp $project.createdAt
  if (-not $project.id -or
      $project.id -eq $productionVercelProjectId -or
      $project.name -ne $expectedName -or
      $project.accountId -ne $stagingVercelTeamId -or
      $createdUtc -lt $sessionStartUtc -or
      $createdUtc -gt (Get-Date).ToUniversalTime().AddMinutes(5)) {
    throw 'Disposable Vercel cleanup identity mismatch.'
  }
  $cleanupLedger.vercel_project_id = $project.id
  $script:stagingVercelProjectId = $project.id
  $project
}

function Remove-ExactVercelApiResource {
  param([Parameter(Mandatory)][string]$Path)
  $project = Get-VercelCleanupProjectIdentity
  if ($null -eq $project) {
    throw 'Disposable Vercel project identity is required before DELETE.'
  }
  $escapedTeam = [Regex]::Escape($stagingVercelTeamId)
  $escapedProjectId = [Regex]::Escape($project.id)
  $allowedDeletePaths = @(
    "^/v13/deployments/dpl_[A-Za-z0-9]+\?teamId=$escapedTeam$",
    "^/v9/projects/$escapedProjectId/env/[A-Za-z0-9_]+\?teamId=$escapedTeam$",
    "^/v9/projects/$escapedProjectId\?teamId=$escapedTeam$"
  )
  if (-not ($allowedDeletePaths | Where-Object { $Path -match $_ })) {
    throw "Vercel DELETE path is outside the DR cleanup allowlist: $Path"
  }
  if ($Path -match '^/v13/deployments/([^?]+)\?') {
    if ($matches[1] -ne $cleanupLedger.preview_deployment_id) {
      throw 'Vercel DELETE deployment does not match the ledgered preview deployment.'
    }
  } elseif ($Path -match '^/v9/projects/[^/]+/env/([^?]+)\?') {
    if ($matches[1] -notin @($cleanupLedger.preview_environment_ids)) {
      throw 'Vercel DELETE environment does not match a ledgered preview env.'
    }
  } elseif ($Path -notmatch "^/v9/projects/$escapedProjectId\?") {
    throw 'Vercel DELETE path did not match an exact cleanup resource.'
  }
  & npx --yes vercel@59.1.3 api $Path `
    --method DELETE `
    --dangerously-skip-permissions `
    --scope $stagingVercelTeamSlug | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Vercel DELETE failed: $Path" }
}

function Get-TargetCleanupVerification {
  $target = Resolve-DrTargetCleanupIdentity
  if ($null -eq $target) { return $null }
  Assert-DrTargetCleanupIdentity
  $raw = @(
    Invoke-DrRestoreVerifier -ProjectRef $targetRef
  )
  if ($LASTEXITCODE -ne 0) { throw 'Target cleanup verifier failed.' }
  $text = $raw -join "`n"
  $jsonStart = $text.IndexOf('{')
  if ($jsonStart -lt 0) { throw 'Target verifier JSON missing.' }
  $document = $text.Substring($jsonStart) | ConvertFrom-Json
  $summary = @(
    $document.rows | Where-Object section -eq 'verification_summary'
  )
  $counts = @(
    $document.rows | Where-Object section -eq 'storage_auth_counts'
  )
  $feedback = @(
    $document.rows | Where-Object {
      $_.section -eq 'representative_rows' -and
      $_.details.relation -eq 'app_feedback'
    }
  )
  if ($summary.Count -ne 1 -or
      [long]$summary[0].details.hard_failure_count -ne 0 -or
      $counts.Count -ne 1 -or
      [long]$counts[0].details.total_storage_objects -ne 0 -or
      [long]$counts[0].details.venue_media_objects -ne 0 -or
      [long]$counts[0].details.auth_users -ne 0 -or
      [long]$counts[0].details.auth_identities -ne 0 -or
      [long]$counts[0].details.auth_sessions -ne 0 -or
      $feedback.Count -ne 1 -or
      [long]$feedback[0].details.row_count -ne 0) {
    throw 'Target exact-resource cleanup postconditions failed.'
  }
  $document
}

function Assert-VercelDisposableProjectAbsent {
  if (-not $cleanupLedger.vercel_project_id) { return }
  $result = @(
    & npx --yes vercel@59.1.3 api (
      "/v9/projects/$($cleanupLedger.vercel_project_id)" +
      "?teamId=$stagingVercelTeamId"
    ) --include --raw --scope $stagingVercelTeamSlug 2>&1
  )
  if ($LASTEXITCODE -eq 0) {
    throw 'Disposable Vercel project still exists.'
  }
  if (($result -join "`n") -notmatch '(?i)(404|not[_ -]?found)') {
    throw 'Could not prove disposable Vercel project absence.'
  }
}

function Assert-SupabaseTargetAbsentAndSourceHealthy {
  $projects = Get-CurrentSupabaseProjects
  $source = @($projects | Where-Object id -eq $sourceRef)
  if ($source.Count -ne 1 -or
      $source[0].status -ne 'ACTIVE_HEALTHY' -or
      $source[0].name -ne $sourceProjectName -or
      $source[0].organization_id -ne $expectedOrganizationId -or
      $source[0].region -ne $expectedRegion) {
    throw 'Source is not exactly bound and healthy after cleanup.'
  }
  if ($cleanupLedger.target_ref -and
      @($projects | Where-Object id -eq $cleanupLedger.target_ref).Count -ne 0) {
    throw 'Disposable Supabase target still exists.'
  }
  if (@($projects | Where-Object name -eq $targetName).Count -ne 0) {
    throw 'Session-named Supabase target still exists.'
  }
}

function Assert-ProductionApplicationSmoke {
  Assert-ProductionVercelBinding
  $response = Invoke-WebRequest -Uri (
    "$productionUrl/api/venues?lat=57.7089&lng=11.9746&radiusKm=3"
  )
  $payload = $response.Content | ConvertFrom-Json
  if ($response.StatusCode -ne 200 -or
      @($payload.venues).Count -ne 42 -or
      @($payload.venues.id | Sort-Object -Unique).Count -ne 42 -or
      @($payload.venues.slug | Sort-Object -Unique).Count -ne 42) {
    throw 'Production 200/42 uniqueness smoke failed after cleanup.'
  }
  foreach ($venue in $payload.venues) {
    if (@($venue.sunDaySeries).Count -ne 61) {
      throw 'Production exact 61-step smoke failed after cleanup.'
    }
    for ($index = 0; $index -lt 61; $index++) {
      if ([int]$venue.sunDaySeries[$index].minutes -ne 360 + 15 * $index) {
        throw 'Production ordered minute series drifted.'
      }
    }
  }
}

function Clear-DrSecretsAndLocalFiles {
  foreach ($name in @(
    'DR_TARGET_ANON_KEY',
    'DR_TARGET_SERVICE_ROLE_KEY'
  )) {
    Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
  }
  foreach ($name in @(
    'drAuthPassword',
    'drAuthAccessToken',
    'authenticatedHeaders',
    'anonHeaders',
    'serviceHeaders'
  )) {
    if (Get-Variable -Name $name -Scope Script -ErrorAction SilentlyContinue) {
      Set-Variable -Name $name -Scope Script -Value $null
    }
  }
  foreach ($name in @(
    'probePath',
    'smokeScriptPath',
    'previewBindingEvidencePath',
    'previewTargetBindingEvidencePath'
  )) {
    $variable = Get-Variable -Name $name -Scope Script -ErrorAction SilentlyContinue
    if ($variable -and $variable.Value -and
        (Test-Path -LiteralPath $variable.Value -PathType Leaf)) {
      Remove-Item -LiteralPath $variable.Value -Force
    }
  }
  if ($cleanupLedger.local_root) {
    Assert-DrLocalRoot
    if (Test-Path -LiteralPath $cleanupLedger.local_root) {
      Remove-Item -LiteralPath $cleanupLedger.local_root -Recurse -Force
    }
  }
}

function Invoke-DrCleanup {
  Invoke-DrCleanupStep 'production-binding-before-cleanup' {
    Assert-ProductionVercelBinding
  }

  Invoke-DrCleanupStep 'vercel-preview-deployment' {
    $project = Get-VercelCleanupProjectIdentity
    if ($null -eq $project -or
        -not $cleanupLedger.preview_deployment_id) { return }
    $deploymentId = $cleanupLedger.preview_deployment_id
    if ($deploymentId -notmatch '^dpl_[A-Za-z0-9]+$') {
      throw 'Invalid ledgered deployment ID.'
    }
    $deployment = Get-VercelApiJson (
      "/v13/deployments/$deploymentId" + "?teamId=$stagingVercelTeamId"
    )
    if ($deployment.id -ne $deploymentId -or
        $deployment.projectId -ne $project.id -or
        $deployment.target -eq 'production') {
      throw 'Ledgered preview deployment identity mismatch.'
    }
    Remove-ExactVercelApiResource (
      "/v13/deployments/$deploymentId" + "?teamId=$stagingVercelTeamId"
    )
  }

  foreach ($ledgerEnvironmentId in @(
    $cleanupLedger.preview_environment_ids
  )) {
    $environmentId = "$ledgerEnvironmentId"
    Invoke-DrCleanupStep "vercel-preview-env-$environmentId" {
      $project = Get-VercelCleanupProjectIdentity
      if ($environmentId -notmatch '^[A-Za-z0-9_]+$') {
        throw 'Invalid ledgered environment ID.'
      }
      $environment = Get-VercelApiJson (
        "/v10/projects/$($project.id)/env" +
        "?teamId=$stagingVercelTeamId"
      )
      $match = @($environment.envs | Where-Object id -eq $environmentId)
      if ($match.Count -ne 1 -or
          @($match[0].target).Count -ne 1 -or
          @($match[0].target)[0] -ne 'preview') {
        throw 'Ledgered environment identity/scope mismatch.'
      }
      Remove-ExactVercelApiResource (
        "/v9/projects/$($project.id)/env/$environmentId" +
        "?teamId=$stagingVercelTeamId"
      )
    }
  }

  Invoke-DrCleanupStep 'vercel-disposable-project' {
    $project = Get-VercelCleanupProjectIdentity
    if ($null -eq $project) { return }
    Remove-ExactVercelApiResource (
      "/v9/projects/$($project.id)?teamId=$stagingVercelTeamId"
    )
  }

  Invoke-DrCleanupStep 'target-feedback-row' {
    $target = Resolve-DrTargetCleanupIdentity
    if ($null -eq $target -or -not $cleanupLedger.feedback_id) { return }
    if ($cleanupLedger.feedback_id -notmatch
        '^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$') {
      throw 'Invalid ledgered feedback ID.'
    }
    Assert-TargetOriginBinding -Cleanup
    $response = Invoke-WebRequest -Method Delete -Uri (
      "$targetOrigin/rest/v1/app_feedback?id=eq." +
      $cleanupLedger.feedback_id
    ) -Headers ($serviceHeaders + @{ Prefer = 'return=representation' })
    $deleted = @($response.Content | ConvertFrom-Json)
    if ($deleted.Count -ne 1 -or
        $deleted[0].id -ne $cleanupLedger.feedback_id) {
      throw 'Exact feedback cleanup failed.'
    }
  }

  foreach ($ledgerStoragePath in @($cleanupLedger.storage_paths)) {
    $storagePath = "$ledgerStoragePath"
    Invoke-DrCleanupStep "target-storage-$storagePath" {
      $target = Resolve-DrTargetCleanupIdentity
      if ($null -eq $target) { return }
      $escapedSession = [Regex]::Escape($sessionId)
      if ($storagePath -notmatch (
        "^dr/$escapedSession/(?:probe|anon-denied|auth-denied)\.webp$"
      )) {
        throw 'Invalid ledgered Storage path.'
      }
      Assert-TargetOriginBinding -Cleanup
      $response = Invoke-WebRequest -Method Delete -Uri (
        "$targetOrigin/storage/v1/object/venue-media/$storagePath"
      ) -Headers $serviceHeaders -SkipHttpErrorCheck
      if ($response.StatusCode -notin 200, 204, 404) {
        throw "Exact Storage cleanup failed: $storagePath"
      }
    }
  }

  Invoke-DrCleanupStep 'target-auth-user' {
    $target = Resolve-DrTargetCleanupIdentity
    if ($null -eq $target -or -not $cleanupLedger.auth_user_id) { return }
    if ($cleanupLedger.auth_user_id -notmatch
        '^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$') {
      throw 'Invalid ledgered Auth user ID.'
    }
    Assert-TargetOriginBinding -Cleanup
    $response = Invoke-WebRequest -Method Delete -Uri (
      "$targetOrigin/auth/v1/admin/users/$($cleanupLedger.auth_user_id)"
    ) -Headers $serviceHeaders -SkipHttpErrorCheck
    if ($response.StatusCode -notin 200, 204, 404) {
      throw 'Exact Auth user cleanup failed.'
    }
  }

  Invoke-DrCleanupStep 'target-clean-state-verifier' {
    [void](Get-TargetCleanupVerification)
  }

  Invoke-DrCleanupStep 'supabase-disposable-project' {
    $target = Resolve-DrTargetCleanupIdentity
    if ($null -eq $target) { return }
    Assert-DrTargetCleanupIdentity
    npx --yes supabase@2.114.0 projects delete $targetRef `
      --yes `
      --agent no
    if ($LASTEXITCODE -ne 0) {
      throw 'Disposable Supabase project deletion failed.'
    }
  }

  Invoke-DrCleanupStep 'vercel-project-absence' {
    Assert-VercelDisposableProjectAbsent
  }
  Invoke-DrCleanupStep 'supabase-target-absence-and-source-health' {
    Assert-SupabaseTargetAbsentAndSourceHealthy
  }
  Invoke-DrCleanupStep 'production-binding-and-42x61-smoke' {
    Assert-ProductionApplicationSmoke
  }
  Invoke-DrCleanupStep 'local-secrets-and-probes' {
    Clear-DrSecretsAndLocalFiles
  }

  if ($cleanupLedger.errors.Count -ne 0) {
    throw (
      "DR cleanup failed in $($cleanupLedger.errors.Count) independent step(s). " +
      'Remove connectivity, quarantine exact remaining resources, and escalate.'
    )
  }
}
```

The controller must surround the Dashboard confirmation and every target/preview
operation. The ledger exists before it is armed; a failed resource cleanup never
prevents later resource attempts or final provider/source postconditions:

```powershell
if (-not $cleanupLedger) {
  throw 'Cleanup ledger is not initialized; do not confirm the clone.'
}
foreach ($command in @(
  'Get-VercelApiJson',
  'ConvertFrom-VercelTimestamp',
  'Assert-DrLocalRoot',
  'Assert-DrApplicationWorkspace',
  'Start-ProductionVercelBaseline',
  'Assert-ProductionVercelBinding',
  'Assert-DrTargetCleanupIdentity',
  'Assert-TargetOriginBinding',
  'Invoke-DrCleanupStep',
  'Resolve-DrTargetCleanupIdentity',
  'Get-VercelCleanupProjectIdentity',
  'Remove-ExactVercelApiResource',
  'Get-TargetCleanupVerification',
  'Assert-VercelDisposableProjectAbsent',
  'Assert-SupabaseTargetAbsentAndSourceHealthy',
  'Assert-ProductionApplicationSmoke',
  'Clear-DrSecretsAndLocalFiles',
  'Invoke-DrCleanup'
)) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Cleanup prerequisite missing: $command"
  }
}
Start-ProductionVercelBaseline
$cleanupArmed = $true
try {
  # Execute Phase 2 confirmation through Phase 7 exactly as written.
  # Interactive pauses occur inside this controller session.
} finally {
  if ($cleanupArmed) { Invoke-DrCleanup }
}
```

A dedicated Vercel project is the final containment unit: deleting its exact
session-bound project ID removes even a deployment or environment record created
in the narrow interval before its child ID reached the ledger. Never substitute
a shared project, variable name, prefix, wildcard, or Production target.

Retain a sanitized copy of every ledger step and provider absence proof. If any
step or postcondition fails, the rehearsal is **FAIL** even if a later full
project delete succeeds. Retry only this exact guarded cleanup, keep all
application connectivity removed, quarantine any identified remainder, and
escalate. A target or disposable Vercel project pending after the four-hour TTL
is a failure, but identity-proven cleanup continues after that deadline.

## Unexercised and partial areas

As of this revision:

- provider clone, cost confirmation, target verification, preview smoke,
  rollback, and cleanup are **NOT EXERCISED**;
- production failover/traffic switch is excluded;
- PITR cannot be tested because disabled;
- exact achieved RPO cannot be inferred from backup record time;
- real Auth recovery cannot be sampled because source counts are zero;
- real Storage-byte recovery cannot be sampled because source has zero objects
  and clone excludes bytes/settings;
- local Compose is PostgreSQL/PostGIS, not full Supabase, so it cannot prove
  Auth, Storage API, PostgREST, Realtime, backup, or provider clone;
- provider-owned Auth/Realtime settings and newly issued keys require target
  inspection;
- Vercel/Supabase management API shape drift is a manual stop condition;
- clone cost and duration exist only at confirmation and require fresh evidence
  and approval.

## Acceptance record

Do not mark complete without evidence for every row:

| Gate | Required |
| --- | --- |
| Provider | New-project clone only; displayed cost freshly approved |
| Source safety | Source and production Vercel bindings unchanged |
| Identity | Hashed source/org/region/session/target bindings; guards pass |
| Verifier | Pinned CLI; read-only on; post-Storage hard failures zero |
| Schema | Statement history and enumerated schema/security signatures match |
| Data | All relation manifests compared; mutable lag classified; unexplained reference delta fails |
| Geometry/weather | 42 complete per-date cohorts; exact 61-step/current-hash geometry; valid weather; raw counts/checksums compared |
| Security | Full relation/RPC matrices and anon/auth denial tests pass |
| Storage/Auth | Closed policy; service transport; browser denial; cleanup |
| App | 200; 42 unique; exact 61; detail/reviews/fallback/Swedish clean |
| Attribution | Three measured paths; no unattributed/Met.no/shadow RPC |
| Timing | Restore/application/cleanup measured; RPO limitation stated |
| Rollback | Feedback/object/user/session/preview/target all removed |

Final outcome is PASS, PASS WITH DOCUMENTED LIMITATIONS, or FAIL. While provider
execution remains pending, the only valid outcome is **NOT EXERCISED**.

## Official references

- [Supabase CLI introduction](https://supabase.com/docs/reference/cli/introduction)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Migrating within Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase)
- [Supabase Storage object management](https://supabase.com/docs/guides/storage/management/download-objects)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel deployments](https://vercel.com/docs/deployments)
