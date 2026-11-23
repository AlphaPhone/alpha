# apps/app/src/runtime/local-voice.ts
- Lines: 89 | Role: on-device speech facade over `AlphaVoiceCloud` (readiness, transcribe recording/audio, speak via `speakLocalText`), bound to the current connection and cancelled on binding/mode/visibility change through upstream `createNativeSpeechRequests`. | Verdict: SIMPLIFY
- Importers: 7 (`maps/navigation-voice.ts`, `prototype/local-speech-playback.ts`, `prototype/voice-adapter.ts`, `runtime/app-speech.ts`, `runtime/native-reading-voice.ts`, `runtime/note-recorder-driver.ts`, `runtime/voicemail-transcription.ts`). Text/path pins: `test/local-conversation-cleanup.test.mjs:16`, `test/local-speech-text.test.mjs:77`, `test/navigation-voice-pause.test.mjs:20`, `test/support/feature-parity.mjs:548`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 38 | C3 | `binding = () => [connectionController.getSnapshot().session?.sessionId, connectionController.getCloudClient()?.sessionId, document.documentElement.dataset.connectionMode].join(':')` written twice. | One module-level `voiceBinding()`. | None. |
| 2 | 32, 49 | B2 | `typeof MutationObserver !== 'undefined'` guards in browser-only code (exist for Node tests). | Call `new MutationObserver(...)` directly. | Low once Node imports go. |
| 3 | 21-24 | B4 | `releaseWatcherInstalled` once-flag around a function called from the factory. | Install the watcher at module init (the module is only imported where voice is used) or keep the flag but drop the separate function; ~4 lines. | Low. |
| 4 | 36, 41 | D5 | `document.documentElement.dataset.connectionMode === 'mock'` checked twice in production code (mock mode is test-mocks only, set at `main.tsx:119`). | Read the mode once through a `build-flags`/mock module export (`mockModeActive()`), constant-folded false in production. | Low. |
| 5 | 58, 60, 63, 70, 82 | C3 | `Capacitor.isNativePlatform()?'device':'browser'` five times. | `const execution = Capacitor.isNativePlatform() ? 'device' : 'browser';` once. | None. |
| 6 | 58-60 | C5 | `ready` and `playbackReady` differ only in the predicate (`ready===true` vs `ready===true||playback===true`). Comment says native never reports `playback`. | One private `status(signal, accept)` used by both. Keep both public names: `playbackReady` has 4 callers (maps/navigation-voice.ts:33, prototype/local-speech-playback.ts:95,196, app-speech.ts:26, native-reading-voice.ts:20) and `browser/voice.ts:186` reports `playback`. | Low. |
| 7 | 61-72 | C5 | `transcribe` and `transcribeAudio` repeat the execution/local/text validation. | Shared `checkTranscript(result)`; `transcribe` adds the empty-text `no-speech` rule. | None. |
| 8 | 7-15 | C2 | Fourth-or-so typing of `AlphaVoiceCloud` (17 in src). | Shared `runtime/voice-plugin.ts`. | Low. |
| 9 | 29 | B1 | `void native.releaseLocalSpeech().catch(() => {})` — best-effort release on binding change; specified. | Keep with comment. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `native` (AlphaVoiceCloud slice) | const | 7-15 | 16 other typings (see local-reply-speech report) | `runtime/voice-plugin.ts` |
| `LocalTranscript` | type | 20 | `browser/voice.ts` produces the same shape | `runtime/voice-plugin.ts` |
| `binding` | helper | 25, 38 | `maps/navigation-voice.ts:50-54` builds a similar session/cloud/mode tuple | local `voiceBinding()` (shared with navigation-voice if it adopts it) |

## Proposed end state
~70 lines: one binding helper, one execution constant, merged readiness/transcript validation, unguarded `MutationObserver`, mock check via the flag module, typed shared plugin. Behaviour unchanged.

## Verification
Voice/Listen/voicemail/navigation-voice Playwright journeys; `test/navigation-voice-pause.test.mjs` and `test/local-conversation-cleanup.test.mjs` (rewrite or delete per T2/T3); on-device transcription on Android.
