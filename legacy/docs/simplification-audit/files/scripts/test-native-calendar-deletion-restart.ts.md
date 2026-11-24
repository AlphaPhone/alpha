# scripts/test-native-calendar-deletion-restart.ts
- Lines: 35 | Kind: Android device campaign (instrumentation phases with a real force-stop in between, in an owned secondary emulator user) | Verdict: KEEP as a manual campaign, MOVE to `test/android/campaigns/calendar-deletion-restart.ts`
- Covers: a pending Calendar event deletion survives process death and resolves by Undo or by the original ten-second deadline in another process. Duplicates: none (`CalendarDeletionRestartInstrumentedTest` needs this runner for its external phases). Callers/importers: listed in `scripts/android-instrumentation.ts:308` (campaign list); usage comment in itself. Not run by any workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | B3 | `assert(archive&&output&&!extra.length)` argument checks are fine (CLI boundary). | Keep. | - |
| 2 | 29 | T8 | Fixed 11 s sleep for `expiry` mode. | Specified (product deadline 10 s); keep with a comment naming the deadline constant. | None |
| 3 | 18-21 | C3 | `pm grant` loop and raw `am instrument` command repeat `native-test-fixture.ts` helpers. | Use the fixture's `instrumentPhase('prepare', ...)`. | Low |

## Proposed end state
Same ~30 lines under `test/android/campaigns/`, documented in one campaigns README with the other manual runners; owner decides whether any campaign is wired into `android-emulator.yml`.
