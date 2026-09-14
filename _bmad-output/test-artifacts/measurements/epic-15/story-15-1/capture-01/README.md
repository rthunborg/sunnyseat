# Read-only production capture

Captured September 10, 2026 from SunnySeat (`hhnbxrhfhlzxgllxukzj`) following the owner's instruction to proceed with the proposed read-only capture. No production mutations were issued.

`census.sql` and `inputs.sql` are the exact retained SELECT transactions. Census and input capture have separate timestamps/snapshots; they are not one atomic observation. Inputs use REPEATABLE READ, READ ONLY and the existing 200m caster resolver. The resolver definition is embedded in the captured output. All 42 non-deleted venues are public at capture time, with seating present. Zero hidden venues means this snapshot cannot validate a representative hidden-venue workload.

Inputs contain 1,566 distinct resolved casters and 4,278 venue/caster memberships. They are current geometry, not historical inputs for the 1,386 existing stored series. The census reads relation sizes, including system-service schemas, but exports no authentication/user table rows or secrets. Local evidence must not be mistaken for a fresh September 11 production read.

The replay binds these four files by SHA-256. Preserve original captures; a future capture belongs in a new directory. This inventory supports current-cohort observations only, not future 500-venue capacity or all geographical/geometry edge cases.
