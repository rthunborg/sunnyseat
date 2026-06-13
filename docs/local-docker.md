# Local Docker / WSL

SunnySeat uses project-local Docker Compose files for local database infrastructure. The Next.js app still runs from `nextjs-app/`; Compose only provides direct PostGIS services for local development, schema/import checks, and future DB-backed integration tests.

## Prerequisites

- Docker Desktop with WSL2 integration enabled.
- Docker Compose v2 (`docker compose version`).
- For Docker-heavy work, keep the checkout under the Linux filesystem, for example `/home/rasmus/repos/sunnyseat`, not `/mnt/c/...` or `/mnt/d/...`.
- Copy `.env.example` to `.env` only when overriding ports, credentials, or project names. The defaults are safe local placeholders, not production secrets.

## Services

| File | Service | Host port | Container address | Storage |
| --- | --- | --- | --- | --- |
| `compose.yaml` | `postgres` | `127.0.0.1:${POSTGRES_PORT:-15432}` | `postgres:5432` | Persistent named volume |
| `compose.test.yaml` | `postgres` | `127.0.0.1:${TEST_POSTGRES_PORT:-15433}` | `postgres:5432` | Disposable `tmpfs` |

Both databases run PostgreSQL 15 with PostGIS. The init script also creates local `anon`, `authenticated`, and `service_role` roles so the existing Supabase SQL handoff can be smoke-tested against local Postgres when needed.

## Development Database

Start the persistent dev database from the repository root:

```powershell
docker compose -f compose.yaml up -d --wait
```

Connection defaults:

```text
DATABASE_URL=postgresql://sunnyseat:sunnyseat_dev_password@127.0.0.1:15432/sunnyseat_dev
DATABASE_URL_IN_COMPOSE=postgresql://sunnyseat:sunnyseat_dev_password@postgres:5432/sunnyseat_dev
```

Stop without deleting data:

```powershell
docker compose -f compose.yaml down
```

Reset the dev database completely:

```powershell
docker compose -f compose.yaml down -v
docker compose -f compose.yaml up -d --wait
```

## Test Database

Start the disposable test database:

```powershell
docker compose -f compose.test.yaml up -d --wait
```

Connection defaults:

```text
TEST_DATABASE_URL=postgresql://sunnyseat_test:sunnyseat_test_password@127.0.0.1:15433/sunnyseat_test
TEST_DATABASE_URL_IN_COMPOSE=postgresql://sunnyseat_test:sunnyseat_test_password@postgres:5432/sunnyseat_test
```

The current unit/component tests mock Supabase and do not require this database. When a story adds DB-backed tests, run the app checks from `nextjs-app/` with the test database URL exported as needed:

```powershell
cd nextjs-app
$env:DATABASE_URL = "postgresql://sunnyseat_test:sunnyseat_test_password@127.0.0.1:15433/sunnyseat_test"
npx vitest run
```

Tear down the disposable test database:

```powershell
docker compose -f compose.test.yaml down -v
```

## Supabase Notes

`compose.yaml` is a direct PostGIS database, not a full local Supabase API stack. The live Next.js Supabase client still expects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `nextjs-app/.env.local` when real Supabase API access is needed.

For local SQL contract checks, review the manual SQL first, then pipe it into `psql`:

```powershell
Get-Content _bmad-output\implementation-artifacts\3-0-2-shadow-caster-schema-rpc-contract.sql |
  docker compose -f compose.yaml exec -T postgres psql -U sunnyseat -d sunnyseat_dev -v ON_ERROR_STOP=1
```

## Port Overrides

Override host ports in `.env`:

```text
POSTGRES_PORT=25432
TEST_POSTGRES_PORT=25433
```

For concurrent agents in the same checkout, prefer per-session project names and ports instead of a shared `.env` override:

```powershell
$env:COMPOSE_PROJECT_NAME = "sunnyseat-agent-a"
$env:POSTGRES_PORT = "25432"
docker compose -f compose.yaml up -d --wait
```

Services inside Compose should use `postgres:5432`; host processes should use the loopback URLs above. Do not add fixed `container_name`, fixed low host ports, global networks, or global volumes unless a story explicitly requires it.
