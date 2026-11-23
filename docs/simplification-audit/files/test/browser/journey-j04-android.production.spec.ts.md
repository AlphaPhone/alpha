# test/browser/journey-j04-android.production.spec.ts
- Lines: 152 | Kind: Playwright journey, `production` (flag-off bundle + `flag-off-android.ts` bridge harness), 2 tests | Verdict: MERGE test 1 into `journeys/maps.spec.ts`; DELETE test 2
- Covers: test 1, an event location opens unconfigured Maps, offers an installed-map-app hand-off performed only on tap, and Back to event re-reads the same event. Test 2, a note-origin Calendar draft under the retained native Calendar authority shows/hides the "Not linked to note" notice. Duplicates: test 1 shares setup and the Back-to-event assertion with `journey-j04-cloud-maps.production.spec.ts` test 1. Callers/importers: none; imports `openRetainedCalendarSource`, `installCanonicalCalendarFixture`, `flag-off-android`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-22, 107-152 | A1 | Test 2 runs only under `openRetainedCalendarSource(page,'android-native')`, a seeded legacy Calendar authority from older installations (D1 deletes it). | Delete test 2 and `openAndroidCalendars`. | Low; the note-link notice under Agent Calendar should be checked in `journeys/calendar.spec.ts` if the product still shows it (owner question). |
| 2 | 114-145 | T6 | Test 2 walks the React fiber tree to call `shell.vset('calendar',…)` to plant a draft. | Gone with the test. | - |
| 3 | 26-41 | T7 | `mapsApp` patches `PluginHeaders` and `nativePromise` by hand; `journey-j04-cloud-maps` `devicePorts` does the same for other plugins. | One `bridge.add(plugin, methods, handler)` in `flag-off-android.ts`. | Low. |
| 4 | 47 | C3 | "two hours ahead, but today" begin-time IIFE duplicated in `journey-j04-cloud-maps.production.spec.ts:83`. | Harness helper `todayInTwoHours()`. | Low. |
| 5 | 81 | D8 | Calendar-feed URL predicate inline, duplicated in cloud-maps:150. | Helper `readEventAgain(page, begin)`. | Low. |

## Proposed end state
Test 1 becomes the "no Maps provider: hand off to an installed map app" case in `journeys/maps.spec.ts` (production project), sharing event fixture, begin-time and Back-to-event helpers with the Cloud Maps case. File deleted.
