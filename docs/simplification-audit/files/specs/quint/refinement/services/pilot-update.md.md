# specs/quint/refinement/services/pilot-update.md
- Lines: 26 | Kind: harness documentation | Verdict: KEEP (trim)
- Covers: maps `PilotApkUpdate` model boundaries to executed functions in `scripts/pilot-update.ts`, `scripts/owner/pilot-rotation-journal.ts`, `scripts/android-instrumentation.ts`. Duplicates: assumptions in `pilot-update.mjs:197-206`. Callers: README.md links it (`README.md` grep hit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17 | A1 (owner) | "missing legacy export" scenario: an installed APK without the integrity export provider. See `pilot-update.mjs` finding 1. | Remove with the scenario if the owner confirms no pilot unit runs such an APK. | Low |
| 2 | 22 | T9 | Points at `test/quint-pilot-update-refinement.test.mjs`, which the host-test review deletes. | Point at the manifest-driven runner. | Low |

## Proposed end state
Same table, updated run command, no legacy-export line if decided.
