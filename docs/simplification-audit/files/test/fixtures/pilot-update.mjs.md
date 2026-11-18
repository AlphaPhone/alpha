# test/fixtures/pilot-update.mjs
- Lines: 60 | Kind: fixture (scripted adb + integrity-provider export rows for release tooling) | Verdict: KEEP
- Covers: a fake `adb` that models the HOME-role/activity holders, force-stop, `content query` integrity export rows (HMAC per file plus `#end` count row), install, dumpsys and agent log lines, so `scripts/pilot-update.ts` can be run end to end without a device. Duplicates: none. Callers/importers: `test/pilot-update-export.test.mjs:8`; `specs/quint/refinement/services/pilot-update.mjs:11,27` (registered in `specs/quint/refinement/services/index.mjs:40`; test `test/quint-pilot-update-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-57 | — | Fake at the device boundary (adb), real script under test. This is integration shape for owner release tooling; it gates a release step. | Keep. | — |
| 2 | 15-18 | — | `DATA` names `no_backup/connection-credentials/slot.bin` etc.: this is the update-integrity comparison (data unchanged across an APK update), not the deleted backup/export feature (D3). | Keep. | — |
| 3 | 4, 23 | C3 | Local `hmac` helper and literal sha; fine for a fixture. | None. | — |
| 4 | 55 | D8 | One-line conditional wrapper for `pre-update` is dense. | Split into a named function when touched. | — |

## Proposed end state
Unchanged, shared by the pilot-update tooling test and the Quint refinement harness. If `test/pilot-update-export.test.mjs` merges into a release-tooling suite, this fixture moves with it.
