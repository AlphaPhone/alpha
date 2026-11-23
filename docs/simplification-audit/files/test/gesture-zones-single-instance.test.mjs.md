# test/gesture-zones-single-instance.test.mjs
- Lines: 79 | Kind: source-text (regex over `model.js` `swipe()`, `template.html`, `MainActivity.java`, `AlphaConnectionPlugin.java`, every androidTest file) | Verdict: DELETE
- Covers: (claims) swipes never open an Alpha shade, Home has no notifications control, and the launcher keeps one `MainActivity` with per-task kind and a non-looping hand-off. Duplicates: `test/browser/notifications-handle.spec.ts` (shade behaviour), `LauncherHomeInstrumentedTest`, `AccessibilityHomeRoleInstrumentedTest` (HOME role starts). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T1 | Its own header says these "stop the source drifting back while no emulator run exists". | Delete. | medium: see 3 |
| 2 | 12-39 | T1 | Shade and swipe pins are covered behaviourally by `notifications-handle.spec.ts`. | None. | low |
| 3 | 41-79 | T1, A8 | Twenty regexes over `MainActivity.java` hand-off code (`FRONT_START_TOKEN`, `moveLiveTaskToFront`, `unackedFrontStarts`). `ActivityInstanceSelectionInstrumentedTest.java` is deleted in the current working tree, so single-instance hand-off may have no behavioural test left. | Owner question: keep an instrumented single-instance test (second HOME start hands off to the live task; no loop) in the emulator lane. | medium |

## Proposed end state
Gone. Single-instance launcher behaviour is covered by one instrumented test in the emulator lane (an emulator
HOME-role result, not an image or device result).
