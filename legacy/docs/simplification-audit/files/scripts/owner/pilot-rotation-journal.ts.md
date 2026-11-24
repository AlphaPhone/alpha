# scripts/owner/pilot-rotation-journal.ts
- Lines: 136 | Kind: release tooling (crash-safe intent/result journal and install lock for a pilot device's signing rotation) | Verdict: KEEP (D17), MOVE beside `scripts/pilot-update.ts`
- Covers: at most one rotation attempt per device: owner-only, fsync'd, exclusive-create intent and result files; lock dir; no replay; classification of the observed install. Duplicates: `sha256` and hex regex (C3); `syncDirectory`/exclusive write pattern likely duplicated in other journaled scripts. Callers/importers: `scripts/pilot-update.ts`; `test/pilot-rotation-journal.test.mjs`, `test/pilot-update-export.test.mjs`; Quint `specs/quint/refinement/services/pilot-update.mjs:25` (imports the real module) and `pilot-update.md`, `specs/quint/services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Product release tooling in the owner-incident folder. | Move with `pilot-rotation.ts` to `scripts/pilot/` or beside `pilot-update.ts`; update Quint `pilot-update.mjs` pins/imports and manifest. | Low |
| 2 | 6-7 | C3 | Local `sha256`, `hex64`. | Shared `scripts/lib/hash.ts`. | None |
| 3 | 32-48 | B3 | Re-validates owner/mode/size of its own journal files: this is the security boundary for a file on disk another process could have created; keep. | Keep. | — |
| 4 | 85-88 | B5 | fsyncs every ancestor directory up to the anchor on every claim. Durable-ordering requirement is modelled in Quint `pilot-update`; keep. | Keep. | — |

## Proposed end state
Unchanged logic, relocated, shared hash helper. It is part of a Quint-modelled release procedure, so any change regenerates the `pilot-update` traces.
