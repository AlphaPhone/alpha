# apps/app/src/runtime/workflow-presentation.ts
- Lines: 57 | Role: workflow-device protocol negotiation — probes the native bridges for "foreground presentation" support (protocol 2 → device protocol 3), and registers the device with a 409 fallback from protocol 3 to 2 for agents that predate the selected-reminders read. | Verdict: SIMPLIFY (owner check on the native probe)
- Importers: `runtime/connection-ui.tsx:35` (`registerWorkflowDevice`, `workflowDeviceProtocol`; three enrollment paths at 1151/1171, 1479/1493, 1543/1569). `workflowPresentationProtocol` is used only by `test/workflow-presentation-probe.test.mjs`, `test/fixtures/workflow-device-bindings.mjs`, `test/workflow-device-bindings-fixture.test.mjs`, `test/resident-explicit-panel-startup.test.mjs`, `scripts/test-connection-history.ts`. Tests for registration: `test/workflow-device-registration.test.mjs`.
- Text/path pins: `test/support/feature-parity.mjs:627` (exact inventory). Wire: `workflowProtocol` values 1/2/3 sent to `/api/client-devices/register` must stay.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-57 | B2 / A1 | The native probe exists for "Older APKs, whose bridge lacks the method" — but the renderer ships inside the same APK as the bridge: `AlphaVoiceCloudPlugin.java:76` and upstream `NotificationsHostPlugin.java:150` (base of `AlphaNotificationsPlugin`) both answer `{protocol:2}`. On the browser host it returns 2 without probing. So every shipped build answers 2 and `workflowDeviceProtocol` is always 3; the stall/retry/`presentationReady` cache only matters if a bridge call hangs at startup. | Owner check (does a stalled bridge at boot need to downgrade?). If not: delete `workflowPresentationProtocol`, `probePresentation`, `presentationReady` and make `workflowDeviceProtocol` return 3 (or inline the constant `3` at the three connection-ui call sites and delete the function). Delete `test/workflow-presentation-probe.test.mjs` and the probe parts of the bindings fixture. | Medium: changes what a hung bridge does (today: registers protocol 1). |
| 2 | 41-57 | C2 | `registerPlugin<{workflowPresentationCapabilities(): …}>(name)` imported straight from `@capacitor/core`, bypassing `platform-plugins.ts`'s shared proxy cache, for two plugins also typed in `startup-permissions.tsx:15,21` and elsewhere. | If kept, use `platform-plugins.registerPlugin` and the typed plugin modules (`apps/app/src/native/alpha-notifications.ts`, `alpha-voice-cloud.ts`). | Low. |
| 3 | 47-51 | C3 | Hand-rolled timeout + abort race (`new Promise<never>((_,reject)=>{cancel=()=>reject(signal.reason); signal.addEventListener('abort',cancel,{once:true}); if(signal.aborted)cancel();})`). Twins listed in voice-timing.ts report. | `raceAbort` from `apps/app/src/lib/abort.ts` + a timeout. | Low. |
| 4 | 55 | B1 | `catch { signal.throwIfAborted(); return 1; }` — any bridge error silently means protocol 1 (research P13 flags the silent downgrade). | Goes with finding 1; if the probe stays, catch only the "method not implemented" Capacitor error (`code === 'UNIMPLEMENTED'`) and rethrow others. | Low. |
| 5 | 20 | B3 / C3 | `error && typeof error === 'object' ? Reflect.get(error, 'status') : undefined` — status extraction twin of `definiteNoticeFailure` (upstream workflow-approval-poster) and many `(error as {status?:unknown}).status` reads. | `error instanceof WorkflowHttpError && error.status === 409` if `register` always throws that type; otherwise a shared `httpStatus(error)` helper in `apps/app/src/lib/parse.ts`. | Low. |
| 6 | 16-24 | KEEP | `registerWorkflowDevice` 409 fallback (agent-side compatibility with a remote agent version) is real wire negotiation. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| inline plugin type `{workflowPresentationCapabilities()}` | type | 46 | `AlphaNotifications`/`AlphaVoiceCloud` typings in `startup-permissions.tsx:15,21`, `workflow-adapter.ts:144`, 16 `AlphaVoiceCloud` sites | `apps/app/src/native/` plugin modules |
| abort race | helper | 47-51 | voice-timing.ts:126-129, native-connection.ts, local-speech-playback.ts, native-network.ts | `apps/app/src/lib/abort.ts` |
| `presentationReady` | module state | 40 | — | delete with finding 1 |

## Proposed end state
~15 lines: `registerWorkflowDevice` (unchanged behaviour) and the protocol constant 3 — or, if the owner keeps the probe, ~35 lines using `raceAbort`, the shared plugin proxies and a narrow catch.

## Verification
`node --test test/workflow-device-registration.test.mjs test/workflow-device-bindings-fixture.test.mjs test/resident-explicit-panel-startup.test.mjs` (and `workflow-presentation-probe.test.mjs` if kept); `scripts/test-connection-history.ts`; Android emulator enrollment showing `workflowProtocol: 3` in the register request; feature-parity inventory.
