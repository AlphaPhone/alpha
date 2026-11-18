# specs/quint/native/SpeechResources.qnt
- Lines: 167 | Kind: Quint model (live; models upstream Java + renderer playback) | Verdict: KEEP
- Covers: capture reservation tickets (replacement discards a late opening), permission/call admission, PCM queue backpressure and stale-generation rejection, audio focus duck/regain/loss abandoning the request, call handling with and without the Android 12+ mode listener. Duplicates: partly `StreamingPlayback`/`NativeLiveCapture` (adjacent, not the same state). Callers/importers: manifest (`sources`: `apps/app/src/local-speech-playback.ts` + upstream `speech-bridge`/voice Java + `android/upstream-native-sources.json`); `ComponentTraces.java:221` (`speech()` component over `LiveCaptureAdmission`, `SpeechPcmQueue`, `SpeechAudioFocusPolicy`, `index.mjs:111-130`); README 25, 78-79.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 125-128, 159-166 | A1? (no) | `legacyPlatform` / "older platform" models API < 31 without `addOnModeChangedListener`. App `minSdk` is 29 (`AndroidManifest.xml:35` comment; upstream guard `SpeechAudioFocus.java:75`), so the branch is reachable. Not a legacy reader. | Keep; rename `legacyPlatform` → `noModeListener` when touching. | none |
| 2 | 4, 17, 40 | B4 | `engineReady` is initialised `true` and never changed; the guard in `requestSpeech` is constant. `cleared` is only re-asserted by `ClosedQueueEmpty`. | Delete `engineReady`. | low |
| 3 | manifest sources | P6 / B3 | Sources are almost entirely upstream Java; `apps/app/src/local-speech-playback.ts` is listed but `ComponentTraces` replays only the three Java helpers. Renderer-only edits re-run this model. | Drop the renderer file from `sources`; path-scope to the pin/patch set like `SharedRecordingAdmission`. | low |
| 4 | — | — | Tie is compile-and-run of real helper classes (no slicing). Model-level coverage of "combined microphone/engine/focus lifecycle" is declared an open obligation (`index.mjs:212`). | none | — |

## Proposed end state
Model minus `engineReady`; manifest `sources` limited to the Java the component replay compiles plus the native
staging manifest; path-scoped in CI to native pin/patch changes.
