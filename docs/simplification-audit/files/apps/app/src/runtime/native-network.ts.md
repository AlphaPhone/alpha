# apps/app/src/runtime/native-network.ts
- Lines: 23 | Role: bounded read of the native network state (`connected`) with abort and timeout; unknown on failure. | Verdict: SIMPLIFY (small)
- Importers: `runtime/connection-ui.tsx:64`.
- Text/path pins: `test/native-network.test.mjs`, `test/native-network-lifecycle.test.mjs`, `test/connection-presentation-state.test.mjs`, `test/optional-view-channel-chat.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-22 | C3 | Hand-rolled abort+timeout race (`settled`, `finish`, `clearTimeout`, `removeEventListener`), the same mechanism as `native-connection.ts:276-287`, `voice-timing.ts:126`, `workflow-presentation.ts:47`. | Build on `raceAbort`/`withTimeout` in `lib/abort.ts`: `try{value=await withTimeout(read(),timeoutMs,signal)}catch(e){if(signal?.aborted)throw e;return undefined}`. | Low |
| 2 | 21 | B1 | `() => finish()` swallows a native read failure. Specified: "Unknown native state must not turn a stale WebView offline hint into a refusal" (L1-2). | Keep; the header comment already says why. | None |
| 3 | 19 | B3 | `value && typeof value==='object' && 'connected' in value` — correct boundary check on a native reply. | Keep. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| abort/timeout race | helper | 5-22 | `native-connection.ts:276-287,297-301`, `voice-timing.ts:126-129`, `workflow-presentation.ts:47-51`, `local-speech-playback.ts:19-20` | `lib/abort.ts` |

## Proposed end state
~10 lines on `lib/abort.ts`; same signature and the same `undefined` result on timeout or read failure. Could move into `connection-ui` network module when that god module is split.

## Verification
`test/native-network.test.mjs`, `test/native-network-lifecycle.test.mjs`, `test/connection-presentation-state.test.mjs`, `test/optional-view-channel-chat.test.mjs`.
