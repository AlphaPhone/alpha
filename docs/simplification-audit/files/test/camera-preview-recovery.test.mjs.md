# test/camera-preview-recovery.test.mjs
- Lines: 343 | Kind: transplant (six marker slices of `prototype/camera-adapter.ts` — `const ZOOM_STOPS`…`/** Install after native`, `const SCAN_REQUEST`…`const browserMode`, `  let lastCapture:`…`  let accessPanel:`, `  let requestedCaptureHolds=0;`…`  function askCameraFrame(`, `askCameraFrame`…`/** The reviewed item is still`, the `syncCamera` line — plus type-stripped upstream `.eliza/.../plugin-native-camera/src/{host-ports,session}.ts` and part of `browser/camera-focus.ts`, run in one `vm` context over JSDOM with a fake camera bridge and a hand-written prelude of adapter locals) | Verdict: DELETE; REWRITE the user-visible cases as `journeys/camera-photos.spec.ts`
- Covers: ~28 camera session behaviours: preview-stopped alert latch and retry, frame question, no lost shutter, last-capture tile from album, agent capture queue/cancel/grace, permission denial, video quality, lens receipt/zoom chips, flip reset, failed switch, browser track end, focus never blocks shutter, 0.556 minimum zoom, leave during capture, chat grace and clock set back, scan request words, view presence without a document observer. Duplicates: `test/quint-camera-preview-retirement.test.mjs`, `test/quint-camera-focus-writes.test.mjs`, `test/browser/camera-controls.spec.ts`, `agent-camera-capture.spec.ts`, `dev-camera-focus.spec.ts`, `browser-camera.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-18, 46-51 | T2 / D7 | Six text slices plus a 10-line prelude re-declaring the adapter's closure variables; the test rebuilds a fake adapter scope. Any adapter edit breaks it. | Delete. | Medium until the journey exists |
| 2 | whole file | - | No `test()` calls: about 30 top-level blocks with bare `assert`, so the first failure aborts and reports as one anonymous file failure. | n/a after delete. | - |
| 3 | 122-137 vs 272-287 | T4 | Two blocks with the same comment "An agent capture queued past the chat grace keeps Camera active even when a scan request finishes first". | n/a. | - |
| 4 | 15-17 | T5 | Strips and evaluates upstream camera session/host-ports source text. | Upstream has `host-ports.test.ts`; journey uses the real bundle. | None |
| 5 | 341 | T1 | Regex on adapter source: "no body-wide MutationObserver". | Delete. | None |
| 6 | 95-111, 180-203, 214-229, 254-271, 304-326 | - | User-visible and worth a journey step: shutter during busy session takes one pending shot; flip resets flash/zoom; failed switch offers restart; never-settling focus does not block shutter; no `.5` chip when min zoom is 0.556; leaving during capture; agent capture during start / after leave / past chat grace. | Carry as ~10 steps on a typed Camera bridge fake (`harness/plugins/camera.ts`) with gates for start/capture/mode. | Low |
| 7 | 304-321 | T8 | Chat grace with a fake clock set back. | Playwright `page.clock` with `CHAT_GRACE_MS`. | Low |
| 8 | 54-79 | - | Preview-stopped latch: retry button required, a new visit can bind. | Journey step (bridge `setCaptureMode` throws `PREVIEW_STOPPED`). | Low |

## Proposed end state
Deleted. `journeys/camera-photos.spec.ts` gains a "camera session" section driven through the real UI with a
gateable Camera bridge fake; retirement and focus ordering stay with the two Quint replays. Exact count of carried
steps: about 10 of the ~30 blocks; the rest are internal state assertions (`session.phase`, `capturing`) with no
user-visible effect.
