# scripts/pinned-upstream-source.ts
- Lines: 109 | Kind: build gate library | Verdict: KEEP `verifyPinnedUpstream`; MERGE the reachability half (lines 32-109) into `scripts/verify-upstream.ts`
- Covers: (a) authenticates the vendor checkout at the pinned commit before building; (b) judges a recorded GitHub compare of develop vs the pin (`scripts/ci/upstream-reachability.json`). Duplicates: none. Callers/importers: (a) `android-workflow-native.ts`, `build-pinned-voice.ts`, `native-test-fixture.ts`, `test-calendar-regression.ts`, `test-installed-upgrade.ts`, `verify-upstream.ts`, three Quint application harnesses (via `source-snapshot`); (b) only `verify-upstream.ts` and `test/upstream-reachability.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-109 | D4 | Reachability assessment, mode parsing and record reading have one caller (`verify-upstream.ts`). | Move them into `verify-upstream.ts`. | none |
| 2 | 101-108 | B1 | `readReachabilityRecord` turns a JSON parse error into `{}` which then reports "malformed". | Let the parse error throw with the file name. | none |
| 3 | 54-77 | B3 | 20-line structural validator plus consistency check of a record our own `verify-upstream.ts --record-reachability` writes. | Keep a minimal schema check (it is a checked-in file and a CI gate), drop the cross-field consistency block. | low |
| 4 | 7-10 | C3 | Another `upstream.lock.json` reader. | Shared `readUpstreamLock()`. | none |
| 5 | 54-90 | D8 | Mixed 1/4/8-space indentation. | Formatter. | none |
| 6 | 24-27 | A8 | Comment "Temporary until upstream takes a build directory outside the checkout". | Track as upstream follow-up; keep the exclusion. | none |

## Proposed end state
A 30-line `verifyPinnedUpstream(root)` module. `test/upstream-reachability.test.mjs` (unit tests of a pure judge, T3, plus a check of the checked-in record) is deleted; `verify-upstream.ts` runs in CI and is the gate.
