# test/fixtures/NavigationOpenRequestTest.java
- Lines: 15 | Kind: Java fixture, unit of the 1-field `NavigationOpenRequest` | Verdict: DELETE (with the javac part of `test/maps-notification-open.test.mjs`)
- Covers: a Maps navigation notification tap is consumed once, cleared on demand, and expires after 30 s. Duplicates: Maps notification hand-off on device (MainActivity path) in the instrumentation and the Maps journey. Callers/importers: `test/maps-notification-open.test.mjs:34` (which resolves `JAVA_HOME` itself).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 / D7 | `NavigationOpenRequest` is a separate class mainly so a host javac test can load it; cross-file-actions U-A7 nests it in `MainActivity`, after which this fixture cannot compile. Q-AND-24 asks exactly this. | Delete with the nesting. | Low |

## Proposed end state
Deleted. The one-use/expiry rule is short enough to read in `MainActivity`; device coverage comes from the Maps
notification instrumentation.
