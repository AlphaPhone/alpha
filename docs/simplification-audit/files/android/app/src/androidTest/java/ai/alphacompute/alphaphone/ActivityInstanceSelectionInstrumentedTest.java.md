# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ActivityInstanceSelectionInstrumentedTest.java
- Lines: 28 | Role: reflection unit test of `BoundedActivityScenario`'s private lifecycle observer (test harness). | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:266` (`ActivityInstanceSelection: {}`); `test/android-instrumentation-runner.test.mjs` requires every @Test class to be in the registry or `NOT_RUN_BY_A_RUNNER`, so the registry entry must go in the same change.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-28 | T5 | Tests the test machinery: constructs `BoundedActivityScenario` by reflection (`getDeclaredConstructor(Class.class)`, `getDeclaredField("observer"/"activity"/"stage"/"recreating")`) and feeds synthetic lifecycle events. Says so itself: "real lifecycle acceptance is separate". Every instrumentation class that launches MainActivity exercises the real observer. | Delete the file and the registry entry at `scripts/android-instrumentation.ts:266`. | Low. |
| 2 | 17-19 | D7 | Pins private field names of BoundedActivityScenario, blocking its simplification (see BoundedActivityScenario report). | Removed with #1. | — |
| 3 | 10 | — | No `@RunWith`; relies on the default runner. | n/a | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `identity`/`scenario`/`field`/`set` | helper | 12-19 | reflection field get/set also in BrowserExternalHandoff:28-30, BrowserFlow:335 | deleted |

## Proposed end state
File deleted (-28 lines); registry entry removed.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (registry/source reachability) after deleting both.
