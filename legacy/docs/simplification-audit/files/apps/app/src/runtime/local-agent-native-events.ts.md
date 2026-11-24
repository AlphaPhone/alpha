# apps/app/src/runtime/local-agent-native-events.ts
- Lines: 30 | Role: subscribes to live `alphaVoiceEvent` frames from the native `Agent` plugin for one owner, filtering to `voice-transcript` agent events, with race-safe unsubscribe. | Verdict: KEEP
- Importers: 1 (`runtime/local-agent.ts:17`). Text/path pins: `specs/quint/native/manifest.json:11`, `test/local-agent-native-events.test.mjs:5`, `test/support/feature-parity.mjs:541`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C3 / B1 | `const quiet=(work)=>{void work.catch(()=>{});}` — fire-and-forget cleanup; same helper named `cleanup` in `local-agent-native-stream.ts:29`. Swallow is specified (best-effort native cleanup). | One exported `settleQuietly(promise)` in `lib/` (or in local-agent-native-stream.ts) used by both. | None. |
| 2 | 3 | C2 / C1 | `addListener(name:'alphaVoiceEvent', listener:(value:any)=>void)` — one slice of the `Agent` plugin interface; the other slices are `NativeStreamPort`, `NativeRequestPort`, `NativeViewEventPort` and `LocalAgentBridge`, intersected at `local-agent.ts:64`. `value:any`. | One `runtime/agent-plugin.ts` declaring the full `Agent` plugin interface with a typed `AgentVoiceEventFrame`; this file takes `Pick<AgentPlugin,…>`. | Low. |
| 3 | 27 | B1 | `catch{close();}` — specified: a failed subscription ends it. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `NativeVoiceEventPort` | interface | 2-6 | `NativeStreamPort` (local-agent-native-stream.ts:3), `NativeRequestPort` (local-agent.ts:20), `NativeViewEventPort` (native-view-events.ts) | `runtime/agent-plugin.ts` |
| `quiet` | helper | 10 | `cleanup` in local-agent-native-stream.ts:29 | shared helper |

## Proposed end state
~28 lines, same logic; port type from the shared Agent plugin module and the shared quiet-settle helper.

## Verification
Quint native manifest entry; `test/local-agent-native-events.test.mjs` (or the voice Playwright journey that covers transcripts); Android resident voice instrumented tests.
