# apps/app/src/runtime/paired-voice.ts
- Lines: 46 | Role: speech operations (status, transcription, synthesis, page reading) against a paired/hosted agent through `AlphaVoiceCloud`. | Verdict: DELETE (owner; test-mocks-only feature)
- Importers: `prototype/voice-adapter.ts:30` (L183, L317 under `route==='agent'`), `runtime/native-reading-voice.ts:5` (after `if(!testMocksEnabled)return null`), `runtime/note-recorder-driver.ts:4` (unreachable `'agent'` branch).
- Text/path pins: `test/live-voice.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-46 | A3/A4 | `connectionController.getPairedVoiceBinding()` returns null unless `testMocksEnabled` (`connection-ui.tsx:2533`); paired sessions come only from test-mocks remote pairing (PRD: no hosted-agent pairing). | Delete the file, `getPairedVoiceBinding`, voice-adapter's `pairedVoice` state and the branches in `native-reading-voice.ts:28-30` and `note-recorder-driver.ts:89-93`. | Medium (owner; dev harness may use paired speech) |
| 2 | 6 | C1 | `Binding` duplicates `getPairedVoiceBinding()`'s inline return type. | Moot after delete. | None |
| 3 | 7-17 | C2 | inline `AlphaVoiceCloud` typing (paired methods). | Moot; if kept, `native/plugins.ts`. | None |
| 4 | 37-39 | D8 | three 250-char one-line methods repeating `if(signal.aborted)void native.cancel({requestId})` and `Promise.race([pending, interrupted])`. | Moot; if kept, one `issue(pending)` helper. | None |
| 5 | 22-24 | C4/P11 | binding JSON compare + hidden + open fence. | Moot. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Binding` | type | 6 | `connection-ui.tsx:2531` return type, `native-reading-voice.ts:17` | delete |
| plugin interface | type | 7-17 | 16 `AlphaVoiceCloud` typings | delete / `native/plugins.ts` |

## Proposed end state
Deleted (with Android `pairedVoiceStatus`/`synthesizePaired`/`transcribePairedRecording`/`synthesizeBrowserReading` bridge methods after an Android-side review).

## Verification
`test/live-voice.test.mjs`, voice-adapter browser specs (`voice-route-preference`), `npm run verify`, production bundle audit.
