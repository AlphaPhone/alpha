# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarCreationRecoveryInstrumentedTest.java
- Lines: 72 | Role: creation-journal recovery on real provider rows (committed marker recovers, ambiguous/stripped marker never replays) | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts:63` (`calendarCreationRecovery=1`) and `scripts/ci/pending-recovery-ui.py`. Text/path pins: those runners, `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-60 | D4 | Calls main-source `CalendarCreationStore` (three static forwards to upstream, "Compatibility entrypoint for installed-state acceptance tests"). Other callers: `AlphaCalendarPlugin.java:97` (`pendingCreations`), `CalendarUpgradeInstrumentedTest` (by reflection on the class name). | Use `new ai.eliza.plugins.calendar.CalendarCreationStore(AlphaCalendarPlugin.CONFIGURATION)` (or a `static final` on `AlphaCalendarPlugin`) here and in the plugin; then delete `CalendarCreationStore.java` and its entries in `specs/quint/application/manifest.json:5853,5925-5933` and `test/support/feature-parity.mjs:93`. | Medium (manifest edits) |
| 2 | 33, 48 | C6 | `"alpha-calendar-creations-v1"` and `"alphaphone://calendar-creation/"` literals = `AlphaCalendarPlugin.CONFIGURATION.journalName/creationUriPrefix` (`CalendarAgentCrud:72` already uses the field). | Read from `CONFIGURATION`. | Low |
| 3 | 36-38, 63-66 | C3 | Owned calendar creation and exact-row cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 4 | 43, 47, 54 | C3 (local) | "Reset journal record to unknown" (`put("status","unknown").remove("eventId")` + commit) written 3×. | `private void forgetReceipt(id)`. | Low |
| 5 | — | T5 | Exercises upstream `CalendarCreationStore` recovery semantics. | Keep (needs a real provider; Alpha owns the configuration), note as upstream-owned behaviour. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `count(context,calendarId)` | helper | 71 | `CalendarUpgrade.assertOne:60`, `CalendarCrud.ids:25` | `CalendarProviderFixture.events(calendarId)` |

## Proposed end state
Same scenario against the upstream store instance, constants from `CONFIGURATION`, shared fixture, one
`forgetReceipt`. Est. ~60 lines; enables deleting `CalendarCreationStore.java` (12 lines).

## Verification
`node scripts/test-calendar-regression.ts --case=CalendarCreationRecoveryInstrumentedTest`; quint application manifest check (`npm run verify` lane that validates `specs/quint/application/manifest.json`); `node --test test/feature-parity*.test.mjs`.
