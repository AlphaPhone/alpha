# scripts/reminder-recovery-fixture.ts
- Lines: 112 | Kind: device campaign driver (emulator instrumentation + adb observation) | Verdict: KEEP, SIMPLIFY (absorb its two 3-line wrappers)
- Covers: a reminder alarm that fires while POST_NOTIFICATIONS is revoked is recorded `permission-denied` without a notification, retries after re-grant, and after a real emulator reboot posts exactly once for the same occurrence (one-off and recurring variants). Duplicates: none at host level (the instrumented Java tests `ReminderRecoveryInstrumentedTest` / `ReminderRecurrenceRecoveryInstrumentedTest` are its device half, not a duplicate). Callers/importers: `scripts/test-reminder-recovery.ts`, `scripts/test-reminder-recurrence-recovery.ts` (3-line wrappers, reached from `test/fixtures/isolated-native-campaign.mjs` and named in the Java `assumeTrue` messages); listed as a file name in `scripts/android-instrumentation.ts:311`. No npm script or workflow runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file + `test-reminder-recovery.ts`, `test-reminder-recurrence-recovery.ts` | T9 / C5 | Two separate 3-line wrapper scripts exist only to call `runReminderRecovery(false|true, …)`. | Give this file a CLI (`node scripts/reminder-recovery-fixture.ts [--recurring] APP TEST OUT`) and delete both wrappers; update `isolated-native-campaign.mjs` and the two Java `assumeTrue` messages. | Low |
| 2 | 50-57, 58-67 | B3 | Re-validates the envelope shape (`version===1`, `records` is a plain object, `typeof raw==='string'`) before `JSON.parse` already fails on bad data; `envelope?.version` after a non-null parse. | Keep one assertion on `version` and the fixture row id; drop the structural re-checks. | Low |
| 3 | 26-111 | D8 | Dense one-line statements (`assert…;assert…;sameOccurrence(…)`), closures nested four deep inside an options literal. | Lift `witness`, `observe`, `records` to module functions taking `(observer, fixtureId, recurring)`; one statement per line. | Low |
| 4 | 74 | T8 | Budget of up to 13 min per phase is inherent (inexact alarms), documented in the comment. | Keep; it is the specified behaviour. | — |
| 5 | 42-43 | D13 | Dynamic imports of `vendor/eliza/packages/app/scripts/lib/*.mjs` by deep relative path. | Use the `@eliza/*` alias once it exists. | Low |

## Proposed end state
One self-contained campaign script with a `--recurring` flag, no wrapper files, flat helper functions.
It stays a manual/emulator campaign (not CI): AGENTS.md separates emulator evidence from APK builds, so
it is not folded into host tests. Owner question: is this campaign still run before releases? If not,
delete it with both wrappers, the two Java instrumented tests and the `isolated-native-campaign`
entries; reminder reboot recovery would then have no automated coverage at all.
