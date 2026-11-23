# apps/app/src/runtime/local-agent-native-stream.ts
- Lines: 82 | Role: adapts the native `Agent` plugin's event-based streaming (`requestStream` + `alphaAgentStream` frames) into a `Response`/SSE body for `readLocalAgentStream`, with idle (60 s) and turn (600 s) deadlines and cancel on abort. | Verdict: KEEP
- Importers: 1 (`runtime/local-agent.ts:16`). Text/path pins: `scripts/test-local-agent-stream.ts:10,20,23`, `specs/quint/native/manifest.json:12,3496-3524` (8 entries), `specs/quint/refinement/native/native-stream-bridge.mjs:108`, `test/browser/local-agent-native-stream.spec.ts:14,68`, `test/local-agent-native-stream.test.mjs:5`, `test/support/feature-parity.mjs:542`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | C1 / C2 | `addListener(name:string,callback:(event:any)=>void)` — untyped slice of the `Agent` plugin. | Use the shared `AgentPlugin` interface (see local-agent-native-events report) with a typed `AgentStreamFrame` union (`response`/`chunk`/`complete`). | Low. |
| 2 | 29 | C3 | `cleanup=(work)=>{void work.catch(()=>{});}` twin of `quiet` in local-agent-native-events.ts:10. | Shared helper. | None. |
| 3 | 23-27 | B1 | `void completed.catch(()=>{})` / `void response.catch(()=>{})` — unhandled-rejection observers; specified (comment 25). | Keep. | — |
| 4 | 52 | C3 | Base64→bytes `Uint8Array.from(atob(x),c=>c.charCodeAt(0))`; same at local-agent.ts:366,411. | Shared `base64ToBytes` in `lib/`. | None. |
| 5 | 66 | C3 | Hand-written abort race `Promise.race([addition,new Promise<never>((_,reject)=>{…bounded.addEventListener('abort',…)})])` — one of the abort/timeout race copies (`local-agent.ts:239,285`, `alpha-client.ts:321-376`, `abort-signal.ts`). | `raceAbort(addition, bounded)` from `abort-signal.ts`. | Low; listener removal at 78 must be kept by the helper. |
| 6 | 39 | B3 | `if(!event||typeof event!=='object')throw` — native IPC is a trust boundary; keep. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `NativeStreamPort` | interface | 3-7 | other Agent plugin slices | `runtime/agent-plugin.ts` |
| `STREAM_IDLE_MS`, `STREAM_TURN_MS` | const | 9, 11 | Java side 600 s turn limit | stays |
| `cleanup` | helper | 29 | `quiet` (local-agent-native-events.ts:10) | shared |
| abort race | helper (inline) | 66 | local-agent.ts:239,285; alpha-client.ts; abort-signal.ts | `abort-signal.ts` `raceAbort` |

## Proposed end state
~75 lines: typed frames, shared `raceAbort` / `base64ToBytes` / quiet-settle helpers. Protocol semantics (beforeDispatch, 429/401 mapping, byte limits, timeouts) unchanged.

## Verification
Quint `native-stream-bridge` refinement (8 manifest entries), `test/browser/local-agent-native-stream.spec.ts`, `scripts/test-local-agent-stream.ts`, Android resident chat on device (`npm run android:build:local`).
