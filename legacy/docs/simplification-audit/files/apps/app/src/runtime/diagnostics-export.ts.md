# apps/app/src/runtime/diagnostics-export.ts
- Lines: 309 | Role: builds the redacted support-diagnostics JSON by copying allowlisted fields (app/OS facts, crashes, voice and inference timing). | Verdict: SIMPLIFY (allowlists stay allowlists)
- Importers: 5 product (`prototype/agent-adapter.ts`, `prototype/settings-adapter.ts` – the only `buildDiagnostics` caller besides `runtime/native-voice-turn.ts`, `prototype/voice-adapter.ts`, `runtime/connection-ui.tsx`, `runtime/voice-timing.ts`). Text/path pins: `test/diagnostics-export.test.mjs` (source text + import), `test/live-voice.test.mjs`, `test/subscription-entitlement.test.mjs`, `test/voice-turn-routes.test.mjs`, `test/browser/chat-voice-mode.spec.ts`, `test/support/feature-parity.mjs`; output format read by `scripts/aggregate-voice-latency.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-27 | A1/A4 | `CONNECTIONS=['starting','recovering','offline','resident','remote','local','cloud']` with comment "'offline' only parses older exports". `buildDiagnostics` only ever receives live state (`settings-adapter.ts:533` passes `connection.kind`); no code parses old exports. `remote/local/cloud` exist only for the test-mocks hosted path. | Drop `'offline'` now; drop `'remote','local','cloud'` when `connection-ui.tsx` removes those kinds (cross-file). | Low |
| 2 | 31 | C6 | `VOICE_ROUTES` is the third copy of the route list (`voice-timing.ts:43` `voiceTimingRoutes`, `scripts/aggregate-voice-latency.ts:39`). It still carries `'paired-agent','development-agent'`, which `voice-states.ts:55` and `note-recorder-driver.ts:92` emit only on dev/paired paths. | Export one `VOICE_TIMING_ROUTES` (as const) from `voice-timing.ts`; import it here and in the aggregator. Route pruning follows the hosted-path deletion. | Low |
| 3 | 39, 55 | B1 | Whole `sanitizeNativeInferenceTiming` body in `try{…}catch{return;}`; nothing inside can throw on plain data. | Remove the try/catch. | None |
| 4 | 40, 48, 132, 138, 160, 164, 167, 175, 183, 203, 208, 215, 219, 224, 241, 254, 259, 294, 296 | C3 | ~19 inline plain-object tests (`x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null`). | One local `record(value): Record<string,unknown>|null` (or shared `isRecord`). | None |
| 5 | 43-44, 135, 170, 179, 190, 226, 257, 262 | C3 | Bounded-number checks re-written per field (`typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max`). | One `boundedInt(value,min,max)` and one `boundedMs(value,max)`. | None |
| 6 | 128-129 | C3 | `text`/`one` twin `crash-log.ts:37` `member`. | Shared `oneOf`. | None |
| 7 | 23, 29, 62, 65 | A7 | `RUNTIME_ASSETS`, `VOICE_TIMING_FORMAT`, `NATIVE_VOICE_TIMING_FORMAT`, `NATIVE_CLOUD_STREAM_TIMING_FORMAT`, `DiagnosticsInput`, `DiagnosticsReport`: 0 references outside this file. `DIAGNOSTICS_FORMAT`: only `test/diagnostics-export.test.mjs`. | Un-export. | None |
| 8 | 14-15, 26, 182 | A8 | Issue/decision citations "(issue #395 …)", "(P-43)", "(#423; …)". | Delete the citations, keep the one-line *why*. | None |
| 9 | 171-196, 220-234 | D8 | Many statements per line (`const entry=…;if(entry)out.entry=entry;`). | Formatter pass; optional `copyEnum(out,key,row[key],values)` helper removes 12 repeated two-statement lines. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `VOICE_ROUTES` | const | 31 | `voice-timing.ts:43`, `scripts/aggregate-voice-latency.ts:39` | `voice-timing.ts` export |
| `VOICE_MARKS` | const | 30 | `voice-timing.ts` mark list (same doc "same allowlists as its validator and the aggregator") | `voice-timing.ts` export |
| `NATIVE_MARKS` | const | 63 | aggregator native marks list | shared constant module read by both |
| `text`, `one` | helper | 128-129 | `crash-log.ts:37` `member` | `runtime/parse.ts` |
| `uuid` | const | 73 | many UUID regexes | shared |
| `CONNECTIONS` | const | 27 | `ConnectionSnapshot['kind']` union in `connection-ui.tsx` | derive from that union |

## Proposed end state
Same report format `alpha-diagnostics/v1` and same output fields. Shared route/mark lists, `record`/`boundedInt`/`oneOf` helpers, no retired enum values, no try/catch, private constants. ~250 lines.

## Verification
`test/diagnostics-export.test.mjs` (privacy assertions: must stay green), `test/voice-turn-routes.test.mjs`, `test/live-voice.test.mjs`, `scripts/aggregate-voice-latency.ts` against a fresh export, `test/browser/chat-voice-mode.spec.ts`.
