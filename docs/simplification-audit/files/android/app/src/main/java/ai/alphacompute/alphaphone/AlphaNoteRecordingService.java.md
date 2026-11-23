# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteRecordingService.java
- Lines: 134 | Role: Microphone-type foreground service that keeps an open Notes recording alive with the screen off and shows Pause/Resume. | Verdict: KEEP
- Importers: Manifest `<service .AlphaNoteRecordingService>`; called from `AlphaNoteRecorder`, `AlphaVoiceCloudPlugin` (start/refresh/recordingClosed). Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{note-bridge,note-recording-service}.mjs`, `NoteRecordingServiceTraces.java`; `test/notes-recorder.test.mjs` (source text); androidTest `NoteRecorderInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-34 | D3 | `private static volatile ... foreground/foregroundRecording/activeService` - process-wide state on the service class, read by static `refresh`/`recordingClosed`. | Acceptable for a single-instance Service; keep, but document that `activeService` is the only instance handle. No change unless D3 owner refactor. | low |
| 2 | 38-39, 72 | B1 | `catch(RuntimeException refused){/* The recording continues ... */}` and `catch(RuntimeException\|IOException changed){/* ... */}` | Specified fallback (FGS start refused / closed recording); keep with the existing comment. | none |
| 3 | 111-133 | C5 | Channel creation + `Notification.Builder` with content intent built locally; same shape as `HostedNoticePoster.channel()/post()` and `AlphaNavigationService`. | Leave; differs in channel/importance. Note as a candidate for a shared `Channels.ensure(manager,id,name,importance)` helper if one is introduced. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| CHANNEL / ACTION_* / EXTRA_RECORDING | const | 24-35 | No | stay |

## Proposed end state
Unchanged; ~134 lines. Only optional: extract channel creation to a shared notification helper. Estimated lines after: 134.

## Verification
androidTest `NoteRecorderInstrumentedTest`; Quint note-recording-service refinement; `test/notes-recorder.test.mjs`.
