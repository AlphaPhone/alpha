# specs/quint/refinement/native/note-recording-platform.mjs
- Lines: 226 | Kind: Android stub set for the Notes recorder harnesses (no product text read) | Verdict: KEEP content; MERGE into a shared Android stub library
- Covers: Controlled `MediaRecorder` (segment rollover, failure injection), `AtomicFile` journal commits, `MediaExtractor`/`MediaMuxer` join, Service foreground/stopSelfResult, notifications, Handler timers driven by `NoteRecordingPorts`. Duplicates: `Intent`, `Context`, `Service`, `Notification`, `PendingIntent`, `AtomicFile` stand-ins also in `navigation-service-platform.mjs`, `reset-orchestration.mjs` (AtomicFile), `resident-platform.mjs`. Callers/importers: `native/note-recording.mjs`, `native/note-recording-service.mjs`, `native/note-bridge-platform.mjs`, `native/shared-recording-platform.mjs`, `native/voice-draft.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-222 | C5 | Generic Android stand-ins re-written per harness. The media and journal ports are recorder-specific and worth keeping. | Move generic classes to the shared stub library; keep media/journal ports here. | Medium |
| 2 | 41, 11-21 | T10 (stub coupling) | `note-bridge-platform.mjs:9-11` rewrites this file's `Context`, `Handler.post` and `MediaRecorder.start` text; formatting here is load-bearing for another harness. | Route through one configurable port class so no one rewrites text. | Medium |
| 3 | 224-225 | C5 | Temp-dir boilerplate. | Shared helper. | None |

## Proposed end state
Recorder-specific ports only (MediaRecorder, AtomicFile, media join), built on the shared stub set; no other file edits its text.
