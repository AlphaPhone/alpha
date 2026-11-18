# specs/quint/refinement/native/shared-recording-platform.mjs
- Lines: 94 | Kind: refinement fixture (derived Android/voice ports) | Verdict: SIMPLIFY (KEEP)
- Covers: ports for the upstream `LocalSpeechBridgePlugin` recording/cancellation paths. Builds on `noteBridgePlatform()` (which builds on `noteRecordingPlatform()`), deletes three generated files and string-patches others. Callers/importers: `shared-recording.mjs`, `speech-warmup.mjs` (only for `AudioTrackSpeechOutput.java`), and transitively `live-capture.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | C5/T10 (fixture) | Three-level fixture inheritance with `.replace('public class Context {', …)` / `.replace(' public void load(){}', …)` / `.replace(' public final JSObject data;', …)` on another fixture's generated text, and `unlinkSync` of files the base wrote. A wording change in the base fixture silently drops a member (replace is not asserted). | One stub set with the union of members (Context callbacks, `requestPermissions`, `getCallbackId`, `getInt`) in `refinement/native/support/`; no replace chains. At minimum assert each replace hit (as `text-scale-platform.mjs:28` does). | M |
| 2 | 16-91 | – | Throwing "Unexercised …" stubs for MediaPlayer, live capture, latency probe: correct closed-port style. | Keep. | – |
| 3 | 9 | D11 | Deletes `ai/alphacompute/alphaphone/AlphaNoteAudioPlugin.java` from the base platform: the model drives upstream code only. | Keep; note in `shared-recording.mjs` that the model is upstream-only. | – |

## Proposed end state
Flat stub module (~70 lines) built from shared support stubs plus voice-specific throwing stubs; `speech-warmup.mjs`
gets its single `AudioTrackSpeechOutput` stub from the same module without generating the whole note-bridge tree.
