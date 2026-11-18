# specs/quint/application/CloudPlanRecheck.qnt
- Lines: 35 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Cloud plan recheck clock: outages keep the retry clock, one immediate check on real network return, visibility gating, scope change voids permits. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/cloud-plan-recheck.mjs`, `test/quint-cloud-plan-recheck.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 120-135 | T2/T10 | Reads `connection-ui.tsx`, slices the recheck scheduler, strips types, writes a temp file, runs in `vm`. | Extract the recheck scheduler into its own module during the connection-ui split (D1) and import it. | Depends on stage F split. |
| 2 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; scheduler lives in `runtime/connection/plan-recheck.ts` (or similar) and is imported.
