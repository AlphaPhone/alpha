# test/browser/agent-camera-capture.spec.ts
- Lines: 81 | Kind: Playwright integration (`chromium`, dev server). It pairs the local development agent through Settings > Connection diagnostics, against a fake `AlphaConnection` HTTP bridge and a fake `AlphaActionJournal`, then types in the composer. 4 tests (modes `capture`, `lost-ack`, `old-message`, `ask-first`). | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (`agent-requested photo`)
- Covers: an agent's "take a photo" turn opens Camera through the navigation handoff, captures exactly one photo, and posts an `applied` receipt carrying the media id without base64. It does not capture when the navigation acknowledgement is lost, when the proposal belongs to an older message, or when "ask before agent actions" is on. Duplicates: `test/agent-camera-capture.test.mjs` and `scripts/test-agent-camera-flow.ts`, a host transplant run with `vm` + `stripTypeScriptTypes` over `prototype/camera-adapter.ts` / `runtime/device-actions.ts` (T2, same name, T4). This spec is the stronger of the two. Importers: none. It imports `helpers/connection-diagnostics` and `app-navigation` (`returnToApps`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61-67 | T6 | After the UI is set up it imports `/src/prototype/browser-camera.ts` and replaces `startPreview`, `stopPreview` and `capturePhoto` on the singleton. It also imports `/src/browser/device-preferences.ts` to flip `askBeforeAgentActions`. | Camera: put a harness camera fixture (`getUserMedia` canvas stream, as `accessibility-lifecycle.spec.ts:211-220` does) at the browser media boundary. Preference: switch "Ask before agent actions" in Settings through the UI. | Medium. Capture output then comes from a canvas, so assert the media id shape and not a fixed id. |
| 2 | 8-51 | T7 | A 40-line hand-written Capacitor bridge serves both the agent HTTP API (`/api/auth/*`, `/api/conversations`, `/api/views/*`, `/api/client-devices/*`) and the journal plugin. | Move it to `harness/plugins/connection.ts` (HTTP router keyed by path) and `harness/plugins/action-journal.ts`. Other agent-turn specs reuse the same router. | Low |
| 3 | 53-60 | D5 | It connects through the "Local development agent" pairing form (address + pairing code) in Connection diagnostics. This is a developer surface. It stays under D5/D6 while retained e2e specs drive it. | Use a harness `connection: 'local-dev'` fixture that does this once, so each journey does not repeat the form. | Medium. If C4 removes this pairing surface, the spec needs the remaining agent-connection fixture. |
| 4 | 7 | D8 | Minified style with one-space indentation, and the whole bridge on a few long lines. | Reformat when moving. | none |
| 5 | – | T4 | Host twin `test/agent-camera-capture.test.mjs` → `scripts/test-agent-camera-flow.ts` (T2 transplant). | Delete the host twin (owned by another chunk). Keep the cases worth carrying (`lost-ack`, `old-message`, receipt without base64) here. | Low |

## Proposed end state
One `describe('agent-requested photo')` in `journeys/camera-photos.spec.ts` is parametrised over the four modes. It uses
harness fixtures for the local agent connection, the agent HTTP router, the action journal and the camera stream. Ask-first
is set through Settings. It asserts receipts, the capture count and the visible "Saved" message. Nothing in the page is
monkey-patched.
