# specs/quint/application/CameraFocusWrites.qnt
- Lines: 74 | Kind: Quint model (live, 6 runs, 5 invariants, 4 witnesses, 5 symbol pins) | Verdict: KEEP
- Covers: tap-to-focus over the browser camera preview: one driver write per track at a time, a tap retired while waiting never reaches the driver, the target reads as applied only for the latest tap. Duplicates: Playwright `dev-camera-focus.spec.ts`; host tests `browser-camera-storage.test.mjs`, `camera-preview-recovery.test.mjs` touch the same class. Callers/importers: manifest (source `apps/app/src/browser/camera-focus.ts`); harness `camera-focus-writes.mjs` (75 lines) bundles the real `BrowserCameraFocus` (`loadProductModule`) into JSDOM; only `test/quint-camera-focus-writes.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T9 | `replayCameraFocusWrites({rewrite})` lets the wrapper rewrite product text to prove the replay notices a broken guard (mutation test). | Delete the mutation case in the wrapper and the `rewrite` option. | None |
| 2 | manifest | T10 | Pins `writes`, `epoch`, `applyConstraints` are common words. | Drop `symbols`. | None |
| 3 | — | D6 | Web-build (getUserMedia) camera only. | Chunk owner question. | — |

## Proposed end state
Unchanged model; harness keeps importing the real class; no mutation test, no word pins.
