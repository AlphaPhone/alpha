# apps/app/src/runtime/native-live-voice.ts
- Lines: 41 | Role: binds upstream `createNativeLiveVoice` (`packages/voice/src/native-live-voice.ts`) to the `AlphaVoiceCloud` bridge and the resident session from `connectionController`. | Verdict: SIMPLIFY (small)
- Importers: `prototype/voice-adapter.ts:37` (`nativeLiveVoiceReady`, `openNativeLiveStream`, `nativeAssistantListener`, `createNativeLiveDictation`, type `NativeLiveDictation`). `native-voice-turn.ts:4` imports the same upstream module, not this file.
- Text/path pins: `test/live-voice.test.mjs`, `test/voice-assistant.test.mjs`, `test/diagnostics-export.test.mjs` read the source text; `test/native-live-start-cancellation.test.mjs`, `test/native-resident-capture.test.mjs`, `test/browser/live-voice.spec.ts`; `specs/quint/application/manifest.json`, `specs/quint/native/manifest.json`; `feature-parity.mjs`. (`scripts/prepare-client-features.ts:223,386` names the upstream module, not this file.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | C2 | `registerPlugin<NativeLiveCapturePort>('AlphaVoiceCloud')` — one of 16 registrations of this plugin with different shapes. | Import a typed `alphaVoiceCloud` from `native/plugins.ts`. | Low |
| 2 | 16 | C3 | `const available=()=>Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('AlphaVoiceCloud')` duplicated verbatim in `native-voice-turn.ts:13`. | Export once from `native/plugins.ts` (`voiceCloudAvailable`). | None |
| 3 | 27-40 | D4 | Four one-line forwards (`return voice.ready(signal)`, `voice.assistantListener(options)`, `voice.dictation(options)`) with re-declared option types. | `export const {ready:nativeLiveVoiceReady,open:openNativeLiveStream,…}=voice` is not safe if methods use `this`; instead export `nativeLiveVoice=voice` and let voice-adapter call `nativeLiveVoice.dictation(...)`. Option types come from upstream. | Low (tests read text) |
| 4 | 7-14 | A8 | 8-line comment for 3 lines of binding. | Shorten to 2 lines. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `available` | helper | 16 | `native-voice-turn.ts:13` (identical) | `native/plugins.ts` |
| `resident()` | helper | 18-23 | `native-reading-voice.ts:14` reads the same binding | keep here |
| inline options types | type | 31, 38 | upstream `createNativeLiveVoice` option types | import upstream |
| `NativeLiveDictation` | type | 41 | — | keep (used by voice-adapter) |

## Proposed end state
~15 lines: typed plugin + availability from `native/plugins.ts`, `resident()` binding, `export const nativeLiveVoice=createNativeLiveVoice({...})` and the `NativeLiveDictation` type. Optionally merge with `native-voice-turn.ts` into `voice/native-live.ts` (both bind the same upstream module to the same bridge).

## Verification
`test/live-voice.test.mjs`, `test/voice-assistant.test.mjs`, `test/diagnostics-export.test.mjs` (text readers: update together), `test/native-live-start-cancellation.test.mjs`, `test/native-resident-capture.test.mjs`, `test/browser/live-voice.spec.ts`, Quint application/native manifests.
