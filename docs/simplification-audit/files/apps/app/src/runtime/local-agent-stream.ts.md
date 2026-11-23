# apps/app/src/runtime/local-agent-stream.ts
- Lines: 202 | Role: reads the resident agent's SSE chat stream (`token`/`status`/`reply_ready`/`done`/`error` frames) into a `RemoteChatReply`, emits turn-status labels and Batch-voice progress cues, and provides the one-shot spoken acknowledgement controller. | Verdict: SIMPLIFY
- Importers: 6 (`prototype/agent-adapter.ts`, `prototype/voice-adapter.ts`, `runtime/alpha-client.ts`, `runtime/connection-ui.tsx`, `runtime/local-agent-native-stream.ts`, `runtime/local-agent.ts`). Text/path pins: `scripts/fixtures/local-agent-stream.ts:6,9`, `scripts/test-batch-progress-stream.ts:3`, `scripts/test-batch-voice-progress-ack.ts:3`, `scripts/test-local-agent-stream.ts:11,16,23`, `scripts/test-local-redaction.ts:11`, `test/fixtures/cloud-voice-view.mjs:52`, `test/support/feature-parity.mjs:544`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34, 38, 52, 60 | D7 / A7 | `emitBatchReply`, `batchProgressBinding`, `emitBatchProgress`, `genuineBatchProgress` are exported but used only inside this file in src (grep: 1 file each); external users are `scripts/test-batch-progress-stream.ts`, `scripts/test-batch-voice-progress-ack.ts`. | Unexport; delete or fold those script tests into the voice journey (DECISIONS D10). | Low. |
| 2 | 44, (local-agent.ts:183) | C3 | UUID regex `/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i` — another copy (PATTERNS C3 "UUID regex"). | Shared `isUuid` in `lib/`. | None. |
| 3 | 40-45 | B3 | `typeof request.body !== 'string'`, `typeof request.ownerId !== 'string'` on a parameter typed `{path:string;ownerId:string;body:string}` built in-process by local-agent.ts; path regex already restricts to `[a-f0-9-]{36}` and the UUID test re-checks it. | Keep only the path match with the UUID pattern inline (`/^\/api\/conversations\/(<uuid>)\/messages\/stream$/`) and the body parse; drop the `typeof` checks. Keep the 200 000/128 length bounds only if they matter for parsing cost. | Low. |
| 4 | 86-90 | B3 | `progress()` re-checks `genuineBatchProgress(value)` and then again `typeof label!=='string'||!label.trim()||label.length>160` — the second check is what `genuineBatchProgress` already proved for `kind==='thinking'`. | Drop lines 89-90's repeat check (use `value.label!`). | None. |
| 5 | 140, 201 | B1 | `void reader.cancel().catch(()=>{})` / `await reader.cancel().catch(()=>{})` — best-effort release; specified. | Keep. | — |
| 6 | 13, 179 | D8 | 520-char key allow-list and 600-char object literal on one line in `preparedNavigation`. | Name `const NAVIGATION_VALUE_KEYS = new Set([...])`; build the frozen result in steps. | None. |
| 7 | 19, 32-33 | D3 | Three module-level `EventTarget` buses (`localTurnStatus`, `batchVoiceProgressEvents`, `batchVoiceReplyEvents`) consumed by connection-ui.tsx and voice-adapter.ts. | Acceptable (typed singletons); give them a typed event map (`TypedEventTarget<{label:string}>`) when the typed event bus (P16) lands. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BatchProgressCue` | interface | 23-31 | voice-adapter.ts consumer types | stays |
| `StreamTextFrame`, `StreamTextListener` | interface/type | 127-131 | upstream voice session `AssistantTextFrame` (comment 123) | stays, or import upstream type |
| `preparedNavigation` | helper | 7-16 | `prepared-view-navigation.ts` (validation of the same handoff) | stays |
| UUID regex | const (inline) | 44 | local-agent.ts:183, ~10 more in src | `lib/uuid.ts` |

## Proposed end state
~190 lines: internal helpers unexported, shared UUID check, no re-validation of in-process typed inputs, named key set in `preparedNavigation`. Wire handling (frame types, limits, failure kinds, beforeDispatch) unchanged.

## Verification
`scripts/test-local-agent-stream.ts` (or its replacement journey), voice Batch progress journey, chat streaming Playwright specs, Quint `native-stream-bridge` (consumes via local-agent-native-stream).
