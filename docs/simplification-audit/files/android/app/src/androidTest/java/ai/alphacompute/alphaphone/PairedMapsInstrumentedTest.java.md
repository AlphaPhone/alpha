# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedMapsInstrumentedTest.java
- Lines: 97 | Role: paired-host agent proposes `maps_read_selected` for a place and a route, phone approves, native journal receipt is checked; stale proposal after leaving Maps | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:334` `NOT_RUN_BY_A_RUNNER.PairedMaps` ("needs a real paired host and an external Maps fixture (pairedMaps=1); no runner pairs one"); `test/android-instrumentation-runner.test.mjs:186-216` requires every @Test class to be registered, campaigned or listed there, and every listed name to exist (so the class and its `NOT_RUN_BY_A_RUNNER` entry must be deleted together).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A7 / P20 / A3 | No runner can run it (recorded in `NOT_RUN_BY_A_RUNNER`); it needs a paired host (PRD forbids pairing) and a `files/paired-maps-fixture.json` that no script writes (grep `paired-maps-fixture`: only this file). | Delete the file and `NOT_RUN_BY_A_RUNNER.PairedMaps`. | None (never executed). |
| 2 | 25-26 | A7 | `voice()` and `field()` declared, never called (grep within file: 1 occurrence each = declaration). | Gone with #1. | — |
| 3 | 18, 27-29 | C3 | `canonical(Object)` JSON canonicaliser and `hash`/`arrayHash` duplicated verbatim in `PairedReminderInstrumentedTest.java:19,27-29`. | Gone with #1. | — |
| 4 | 21-22, 31, 37 | C3 | `until`/`click`/`open`/`send` routed through `NotesSecureFixture.evaluate` (a Notes fixture used as the generic WebView evaluator — D11). | Gone with #1. | — |
| 5 | 66-71 | C3 | "Local development agent" connect + History restore routine identical to `PairedReminderInstrumentedTest.java:47-50`. | Gone with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `canonical` | helper | 18 | PairedReminder:19 (identical) | delete |
| `hash`/`arrayHash` | helper | 27-29 | PairedReminder:27-29 (identical) | delete |
| `activity`/`store`/`voice`/`field`/`credential` | helper | 23-30 | PairedReminder:23-30 | delete |
| `APPROVAL`, `ORIGIN` | const | 20, 39 | PairedReminder:20 (`ORIGIN`) | delete |

## Proposed end state
File deleted (0 lines), together with the `NOT_RUN_BY_A_RUNNER.PairedMaps` entry.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (reachability test must stay green after removing both).
