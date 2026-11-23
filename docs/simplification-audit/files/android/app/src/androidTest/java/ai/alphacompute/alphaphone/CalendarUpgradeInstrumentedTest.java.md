# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarUpgradeInstrumentedTest.java
- Lines: 103 | Role: two-process baseline→candidate witness that Calendar creation-journal identity survived the extraction of `CalendarCreationStore`/`CalendarEventGuard` from `ai.alphacompute.alphaphone` to upstream `ai.eliza.plugins.calendar` | Verdict: DELETE
- Importers: none. Run only by `scripts/test-installed-upgrade.ts:68-70` (`calendar` kind, `calendarUpgradePhase=seed|verify`), a manual campaign (no package.json/workflow caller; `scripts/owner/emulator-campaign-check.ts:68` lists it). Text/path pins: `scripts/test-installed-upgrade.ts` (class, argument, phases).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27, 48, 74 | A1 | `seed()` requires `type(OLD+"CalendarEventGuard")` (`ai.alphacompute.alphaphone.CalendarEventGuard`) and `absent(NEW+"CalendarCreationStore")`. No `CalendarEventGuard.java` exists under `android/app/src/main` (ls) and the upstream class is present, so the seed phase cannot pass on any APK built from this tree; it needs a pre-extraction baseline. The package was renamed 2026-11-10 and starts with empty data (A1): there is no installed population to upgrade. | Delete the class, the `calendar` kind in `scripts/test-installed-upgrade.ts` (keep `reminder` only if its own report keeps it), and the `--bridge` companion call that runs `CalendarAgentCrudInstrumentedTest` (line 118) if only the calendar kind uses it. | Low |
| 2 | 41-46, 89 | D7 | Builds upstream `CalendarConfiguration` by reflection with hard-coded identity (`"Alpha Phone","alpha-phone-local","On this phone"…`) duplicating `AlphaCalendarPlugin.CONFIGURATION`. | Gone with #1. | — |
| 3 | 88 | A8 | "Compatibility adapters may remain" — refers to the main `CalendarCreationStore` facade, which exists for this test and `CalendarCreationRecovery` ("Compatibility entrypoint for installed-state acceptance tests"). | After #1 and the CalendarCreationRecovery change, delete `android/app/src/main/.../CalendarCreationStore.java`. | Medium (manifest pins) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OLD/NEW/ACCOUNT/NAME/JOURNAL/PREFIX` | consts | 27-30 | `AlphaCalendarPlugin.CONFIGURATION` | delete |
| `field` | helper | 39 | BrowserReadingNavigation:20, BrowserWebFeatures:95 | delete |

## Proposed end state
File deleted (−103 lines); `scripts/test-installed-upgrade.ts` loses its calendar branch; enables deleting the
`CalendarCreationStore` facade (12 lines) plus its `specs/quint/application/manifest.json` and `test/support/feature-parity.mjs:93` entries.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (reachability over `CAMPAIGN_RUNNERS`); any host test of `scripts/test-installed-upgrade.ts` (grep `test-installed-upgrade` under `test/`).
