# test/browser/native-insets.spec.ts
- Lines: 211 | Kind: Playwright layout journeys inside an iframe that models the native WebView rectangle, with a catch-all Capacitor fake; project `chromium`, 11 tests | Verdict: **MERGE** into `journeys/accessibility.spec.ts` (native insets/layout block)
- Covers: standalone navigation stays below native bars and Back to apps works by pointer and keyboard; launcher chat clears three-button navigation and keeps the draft through keyboard resizing; no double inset; long notices scroll between header and multiline composer; a very short window keeps Undo tappable; cutout and large-text resizes keep Back reachable; wide landscape transcript and touch cancellation; overflow-expanded viewport after rotation is ignored. Duplicates: the catch-all bridge is the same as `native-plugin-startup.spec.ts` (C3). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-17 | T7 / C3 | Catch-all bridge: 18 plugins x 33 method names, every call returns one object of empty arrays. Copied in `native-plugin-startup.spec.ts`. | Shared bridge harness with a "quiet Android" preset. | none |
| 2 | 82-97, 119-127 | T6 / D2 | Two tests capture the shell via `Component.prototype.renderVals` and call `shell.toast(...)`/`shell.clear('t')`; one also calls `connectionController.close()`. | Trigger a real Undo toast through a user action (delete a note → "Note deleted, Undo"); for the long notice use a real failing action with a long message from a fake. | Medium |
| 3 | 59, 64, 195-209 | T6 | Sets `--native-bottom-inset` and overrides `innerWidth/innerHeight/visualViewport` to reproduce WebView 124 behaviour. Commented as a model, not emulation. | Keep (only way to reach these branches without a device), in one helper `simulateWebViewResize`. | Low |
| 4 | 154 | — | Records video for the wide-landscape test. | Drop `recordVideo`; trace on failure. | none |
| 5 | 38, 117, 187 | T7 | Width loops (412/360, 412/640, launcher true/false). | Keep the launcher/standalone pair; one width each for the others. | Low |

## Proposed end state
About 8 tests in the native insets block of `journeys/accessibility.spec.ts`, using the shared quiet-Android bridge and
an `iframe` WebView helper (`harness/native-frame.ts`). Toasts come from real actions, with no shell capture through prototype
patching.
