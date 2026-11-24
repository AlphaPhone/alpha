# apps/app/src/runtime/native-reading-voice.ts
- Lines: 31 | Role: page read-aloud voice for the in-app browser: resident on-device playback of an approved reading token, or (test-mocks only) the paired agent. | Verdict: SIMPLIFY
- Importers: `prototype/browser-adapter.ts:8`.
- Text/path pins: `test/browser-reading-capability.test.mjs`, `test/native-reading-voice-profile.test.mjs` (read source text), `test/browser/reading-review.spec.ts`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-30 | A3 | `if(!testMocksEnabled)return null;` then the paired-agent route via `createPairedVoice()` — `getPairedVoiceBinding()` already returns null unless `testMocksEnabled` (`connection-ui.tsx:2533`). Paired agents exist only through retired pairing (PRD: no hosted-agent pairing). | Delete L28-30 and the `createPairedVoice` import; return `null`. | Medium (owner: paired voice harness) |
| 2 | 7 | C2 | `registerPlugin<any>('AlphaVoiceCloud')`. | Typed `alphaVoiceCloud` from `native/plugins.ts` (`synthesizeLocalBrowserReading`). | Low |
| 3 | 18-25 | C4/P11 | Liveness fence: `JSON.stringify` binding compare + `document.hidden` + `getSnapshot().open`, `connectionController.subscribe`, `visibilitychange`, abort link, manual removal — same protocol as `paired-voice.ts:22-35`, `local-speech-playback.ts:30-39`. | One `ownedOperation({signal,watch:[visibility,connection],current})` helper (upstream `createNativeSpeechRequests` already covers most of it). | Medium (per-site semantics) |
| 4 | 22 | B1 | `try{check();}catch{cancel();}` — catch converts a failed check into cancellation; specified. | Keep. | None |
| 5 | 8-12 | A8 | comment mixes current behaviour and the model name "Paradee-8M". | Keep the privacy sentence (page text never leaves the device); drop the rest. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `isCurrent`/`check` fence | helper | 18-19 | `paired-voice.ts:22`, `prototype/local-speech-playback.ts:30`, `text-share.ts:5`, `source-renewal-question.ts:10` | `runtime/owned-operation.ts` |
| `binding` with `expiresAt` | type (inline) | 17 | `paired-voice.ts:6` `Binding` | export one `VoiceBinding` from connection-ui |

## Proposed end state
~18 lines: resident branch only, typed plugin, shared fence helper; returns null when no resident binding.

## Verification
`test/browser-reading-capability.test.mjs`, `test/native-reading-voice-profile.test.mjs` (text readers), `test/browser/reading-review.spec.ts`.
