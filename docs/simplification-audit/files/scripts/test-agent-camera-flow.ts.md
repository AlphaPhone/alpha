# scripts/test-agent-camera-flow.ts
- Lines: 109 | Kind: transplant (slices `apps/app/src/prototype/camera-adapter.ts` and `apps/app/src/runtime/connection-ui.tsx` into `vm` contexts with fake globals) + integration of real `DeviceActions` | Verdict: REWRITE as `test/browser/journeys/camera-photos.spec.ts` (agent-requested capture) and `test/device-actions.test.ts` (journal/receipt); delete with its shim `test/agent-camera-capture.test.mjs`
- Covers: an agent device-action request captures exactly one photo bound to the current message and visible Camera view; lost server receipt resends evidence without re-capturing; failed/invalid capture becomes `unknown` and is not retried; concurrent capture refused without clearing the lock; hidden/aborted/owner-changed refuse; Home continuation after navigation refuses stale/expired/ask-first/changed-view cases. Duplicates: partial in `scripts/test-device-actions.ts` (DeviceActions journal) and camera host tests (`camera-resume`, `camera-preview-recovery`, also transplants). Callers: `test/agent-camera-capture.test.mjs:4` via `runChildSuite` (T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-19, 36-38, 82-90 | T2 | Cuts code between literal markers (`'  let lastCapture:'`, `'  let accessPanel:'`, `'  async function saveCameraPhoto('`, `'  /** A busy preview retains one shutter press'`, `'  /** An agent capture asked for while Camera starts'`, `'  requestedPhoto=takeRequestedPhoto;'`, `'  const waiters = new Set'`, `'  /** Set when the native size'`, `'/** A saved still'`, `'/** The chat sheet may cover Camera'`, `'  let requestedCaptureHolds=0;'`, `'  /** The one photo being written natively'`, `'  async continueRequestedCamera('`, `'  voiceRendererClientId()'`) and strips/concats `plugin-native-camera` `host-ports.ts` + `session.ts`. Every refactor of those files breaks it. | Delete the transplant. | Coverage gap until the journey exists. |
| 2 | 44-79 | T3→integration | The `DeviceActions` part uses the real class with an in-memory journal. | Move the lost-receipt non-replay, unknown-outcome no-retry, capability and view-binding cases to `test/device-actions.test.ts` with a stub `perform` (no camera code). | Low |
| 3 | 85-108 | T2 | Home continuation guards from `connection-ui.tsx`. | Journey: agent asks for a photo from Home, app navigates to Camera, one capture, receipt applied; plus one stale-message case. Needs the typed Capacitor camera bridge fake (`AlphaCamera` capture) in the shared harness. | Medium |

## Proposed end state
No `scripts/` suite. Journey `camera-photos.spec.ts`: "agent-requested capture from Home captures once
and closes chat"; "hidden page refuses capture". Integration `device-actions.test.ts`: lost receipt never
recaptures; failed capture reports unknown and is not repeated; missing capability/other view shows no
proposal.
