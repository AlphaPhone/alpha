# scripts/owner/emulator-campaign-check.ts
- Lines: 270 | Kind: owner planning aid / static source check (issue #676 H-31 emulator campaign inventory and dispatch plan) | Verdict: DELETE (after the owner confirms #676 no longer needs it)
- Covers: for the classes #676 lists, whether an `*InstrumentedTest` source exists, how `scripts/android-instrumentation.ts` registers it, which hosted suite runs it (by regex over `scripts/ci/resident-native.py`, `scripts/ci/pending-recovery-ui.py` and the emulator-suite plan text), plus a printed `gh workflow run` dispatch plan. Duplicates: the class registry in `scripts/android-instrumentation.ts` (`CLASS_REGISTRY`, `CAMPAIGN_RUNNERS`, `NOT_RUN_BY_A_RUNNER`) and `scripts/ci/emulator-suite.ts` are the source of truth this re-reads. Callers/importers: only `test/owner-emulator-campaign-check.test.mjs`. Imports `./input.ts` and dynamically `../android-instrumentation.ts`, `../ci/emulator-suite.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Planning report for one issue; nobody runs it except its test. | Delete with `test/owner-emulator-campaign-check.test.mjs`. | Low |
| 2 | 108, 172 | T1 | Determines "hosted coverage" by regex-matching class names in Python/TS source text. | n/a after delete; if a coverage report is wanted, make `android-instrumentation.ts` export it. | — |
| 3 | 39-69 | A1/A8 | Hard-coded issue text, including items about upgrades "from earlier installs that saved mock state" (legacy, D1) and classes such as `PasswordBrowserFill`. Goes stale with every class rename. | n/a after delete. | — |
| 4 | 196-225 | — | The dispatch plan pins a SHA to `ci/h31-*` and checks `headSha`; that procedure belongs in a CI how-to document if still wanted. | Move the 10-line procedure into `docs/` (owner choice). | None |
| 5 | 75-98 | C3 | Another directory walker. | n/a after delete. | — |

## Proposed end state
Deleted. No product behaviour or CI gate depends on it. If the owner still wants the "which class runs where" view, `scripts/android-instrumentation.ts --list` can print it from the registry it owns.
