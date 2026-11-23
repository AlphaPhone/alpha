# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaVoiceCloudPlugin.java
- Lines: 349 | Role: Alpha's speech bridge: subclass of shared LocalSpeechBridgePlugin plus Cloud voice, own-key Cartesia, paired-agent speech, browser read-aloud, Notes recording methods and a second plugin `AlphaCloudSpeechStream`. | Verdict: SPLIT
- Importers: Registered in `MainActivity` (both plugins); `AlphaLocalAgentPlugin` (`retireProviderAuthority`), `AlphaBrowserPlugin` (`cancelBrowserSpeech`); renderer `runtime/live-voice.ts`, `cloud-voice.ts`, `local-voice.ts`, `paired-voice.ts`, `native-reading-voice.ts`, `note-recorder-driver.ts`, `workflow-presentation.ts`; `scripts/native-voice-latency.ts`, `scripts/android-cloud-voice-timing.ts`. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{NoteBridgeSourceProbe.java,NotePermissionTraces.java,main-activity-platform,note-bridge-platform,note-bridge,resident-platform}.mjs`; host tests that read/slice this file: `test/cloud-voice-limit.test.mjs`, `cloud-voice-profile`, `live-voice`, `native-cloud-control-jvm`, `native-plugin-teardown`, `native-voice-listener-rules`, `notes-recorder`, `plugin-worker-guard`, `power-cold-native-pin`, `browser-tab-host-identity`, `legacy-cloud-recovery`, `streaming-speech`, `fixtures/jvm-tools.mjs`; androidTest CloudVoice/LocalSpeechBridge/NativeVoiceLatency/Paired*/SpeechNoNetwork/VoiceWorkerSettlement; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 83-143 | D1 | Notes recording (`startNoteRecording` ... `saveNoteRecording`, `noteRecorderEvents`, `callActive`, `noteForeground`) - 60 lines that drive `AlphaNoteRecorder`/`AlphaNoteRecordingService` and already delegate saving to `AlphaNoteAudioPlugin`. | Move to `AlphaNoteAudioPlugin` (or a new `AlphaNoteRecordingPlugin`). Renderer `note-recorder-driver.ts` calls these methods on `AlphaVoiceCloud`, so the plugin name in the renderer must change in the same commit. Keep `recording().selectAlso(...)` hook here (segment lookup for transcription). | medium (renderer plugin name, permission callback `noteMicrophonePermission`) |
| 2 | 324-347 | D11/D1 | Second `@CapacitorPlugin` `AlphaCloudSpeechStream` as nested `Streaming` class. | Move to `AlphaCloudSpeechStreamPlugin.java`; `MainActivity` registration and `test/streaming-speech.test.mjs` path updated. | low |
| 3 | 268-300, 310-323 | A3/P15 | Paired-agent speech: `connectPaired`, `pairedVoiceStatus`, `pairedTranscriptionStatus`, `transcribePairedRecording`, `synthesizePaired` and the `paired` branch of `synthesizeAudio`. `connectPaired` throws unless `ELIZA_DEV_ALLOW_TEST_MOCKS` (272), so it is a developer surface; PRD says no hosted-agent pairing. | Owner decision: delete (with `PairedAgentCredential`, `PairedSpeechContract`, renderer `runtime/paired-voice.ts`, androidTest Paired*). If kept as dev surface, move to the testMocks source set. Either way `synthesizeAudio` loses its `paired` flag. | medium |
| 4 | 272, 274 | B4 | `if(!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS)throw...` then `boolean local=BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS&&...` re-ANDs the flag already known true. | Drop the second check (moot if deleted). | none |
| 5 | 56-58, 196-197, 205 | D6 | `instrumentationBaseUrl`, `instrumentationCredentialSlot` fields set by the test APK, guarded only by `ELIZA_DEV_ALLOW_TEST_MOCKS` checks in production code. | Move the override to testMocks (e.g. a `CloudVoiceEndpoint` interface whose testMocks impl reads them) or delete with `CloudVoiceInstrumentedTest`'s local server mode. | medium |
| 6 | 42-44, 327-331 | C5 | `PasswordSurfaces` listener, `sensitiveSurfaceActive()`, add/remove in load/destroy duplicated verbatim between `AlphaVoiceCloudPlugin` and `Streaming`. | Small shared helper `SpeechAuthority.bind(plugin)` or base mixin; or push the `PasswordSurfaces` retire into the upstream speech base classes. | low |
| 7 | 49-54, 335-342 | C5 | Provider-selection + Cloud credential read under `withCredentialAuthority` duplicated (`requireCloudSpeechAuthority` vs `Streaming.readCredential`); `connect` re-reads the credential via `AlphaConnectionPlugin.readCredentialSlot` (195-203). | One `CloudVoiceCredential.read(context, environment, expectedId, epoch)` returning token/expiry, used by both plugins and `connect`. | medium (lock order) |
| 8 | 52, 249, 254, 338 | C6 | Literal `"local-agent-provider:v1"` four times (13× repo-wide) although `LocalAgentProviderAdmission.PROVIDER_SLOT` exists. | Use the constant. | none |
| 9 | 241, 264, 300, 305 | C3 | `if(Boolean.FALSE.equals(call.getBoolean("replace",true))&&speakerBusy()){call.reject("Speaker is in use","playback-busy");return;}` four times. | `private boolean refuseBusy(PluginCall)` helper. | none |
| 10 | 217, 259 | C3 | Empty-window silence result built twice (`text:"",local:false,emptyWindow:true`). | Helper `emptyWindowResult()`. | none |
| 11 | 161-167 | C3 | Bounded error-body read loop (16 KiB) - one of 7 bounded-stream copies. | Use shared `BoundedIo.read(in,limit)` (or the inherited `read(in,limit,request)`). | low |
| 12 | 165, 182 | B1 | `catch(Exception ignored){/* ... leaves only Retry-After. */}` x2. | Specified fallback; keep, but narrow to `IOException`/`JSONException`. | none |
| 13 | 176-187 | D10 | `limitOf(retryAfter,body)` + `jsonText` + `limitData` parse the 429 body; they belong to `CloudVoiceLimit` (pure, host-tested). | Move into `CloudVoiceLimit.fromResponse(retryAfter, body, now)` and `toJs()`; `Streaming.limitData` and `rejectFailure` call it. | low (update `test/cloud-voice-limit.test.mjs`) |
| 14 | 206-207, 280-281 | C3 | HttpURLConnection setup (no redirects, timeouts, no cache, POST, bearer) twice in this file (repo: 8 copies). | Shared `Http.post(url, token, connectTimeout, readTimeout)` helper. | low |
| 15 | 76 | A7? | `workflowPresentationCapabilities` returns constant `{protocol:2}`; caller `apps/app/src/runtime/workflow-presentation.ts:46`. | Keep while the renderer negotiates; owner may fold the constant into renderer if Android always ships protocol 2. | none |
| 16 | whole file | D8 | Single-line method bodies of 300-700 chars (81, 96, 236, 305, 312-320). | Formatter commit. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| VoiceHttpException | class | 148-151 | CartesiaSpeech.HttpFailure (upstream) similar | stay or CloudVoiceLimit |
| limitOf / jsonText / limitData | helpers | 161-187 | none (Streaming calls limitData) | CloudVoiceLimit |
| OwnSpeech | inner class | 244-256 | - | stay |
| secretSurface listener | field | 42, 328 | duplicated in Streaming | shared helper |
| AUDIO_LIMIT | const | 59 | - | stay |
| CALL_ACTIVE_CODE | const | 89 | - | move with Notes methods |

## Proposed end state
`AlphaVoiceCloudPlugin` keeps Cloud batch STT/TTS, own-key Cartesia, local audio, browser read-aloud and the shared-bridge overrides (~190 lines). Notes recording methods move to `AlphaNoteAudioPlugin` (~60 lines), `Streaming` to its own file (~25 lines), 429 parsing to `CloudVoiceLimit`, paired speech deleted (~45 lines) or moved to testMocks, instrumentation fields to testMocks. Estimated lines after: 190.

## Verification
androidTest CloudVoice/LocalSpeechBridge/NativeVoiceLatency/VoiceWorkerSettlement/NoteRecorder; host tests listed above (many slice the file and will need rewrite); Quint note-bridge refinements; `scripts/android-cloud-voice-timing.ts` for a device run.
