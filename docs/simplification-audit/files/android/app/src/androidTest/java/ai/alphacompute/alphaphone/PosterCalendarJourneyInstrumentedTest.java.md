# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PosterCalendarJourneyInstrumentedTest.java
- Lines: 204 | Role: J01 poster -> Camera "Scan mode" OCR -> event draft -> Calendar save -> Home card journey. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:325` `NOT_RUN_BY_A_RUNNER.PosterCalendarJourney` ("drives the removed Camera Scan mode (decision C1) ... needs a rewrite"); `test/android-instrumentation-runner.test.mjs:203-205` fails if that entry outlives the class, so both go together.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-204 | A7 / T9 | Never run: gated on `-e posterJourney 1` (`:96`); grep `posterJourney` in scripts/, test/, .github: 0 hits outside this file. The runner itself records it as unrunnable because it clicks `"Scan mode"` (`:116`), a mode removed by decision C1. | Delete the file and the `NOT_RUN_BY_A_RUNNER.PosterCalendarJourney` entry. A J01 journey, if wanted, is rewritten against the agent scan path (new class). | none (no run exists) |
| 2 | 54 | D7 | Instantiates another test class (`new SelectedDocumentInstrumentedTest()`) to borrow `fixtureBytes`/`selectDocument`. | Goes with the deletion; those helpers stay used by `CameraScan`, `NotesDocument`, `BrowserFlow`. | none |
| 3 | 105-110 | T6 | Monkey-patches `window.confirm` in the page. | Goes with the deletion. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until(js,ms)` / `click` / `button` / `set` / `value` | helper | 57-74 | `WebViewTestDriver`-style polls in ~42 files; `set` = the React value-setter idiom also in `PhotosTrash.albumName`, `PrototypeFlow.fill`, `RealClock :84`, `ReminderNoticeQuestion.editExcerpt`, `RemoteAgent.message` | deleted (future: `WebViewTestDriver.setValue`) |
| `poster(...)` | helper | 79-87 | none | deleted |

## Proposed end state
File removed; `NOT_RUN_BY_A_RUNNER` loses one entry. 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (reachability and stale-entry checks). No instrumentation run covers it today.
