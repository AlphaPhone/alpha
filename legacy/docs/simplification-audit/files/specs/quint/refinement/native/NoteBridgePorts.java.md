# specs/quint/refinement/native/NoteBridgePorts.java
- Lines: 24 | Kind: Quint refinement support (static ports: audio mode, mic permission state, held main-queue, recorder start count) | Verdict: MERGE into `specs/quint/refinement/native/NoteRecordingPorts.java`
- Covers: external lifecycle/permission/UI-queue inputs for the Notes bridge and shared speech-bridge harnesses. Duplicates: `NoteRecordingPorts.post/flushPosts/holdPosts` is a second held-queue with the same job (C5).
- Callers/importers: `NotePermissionTraces.java`, `PipedCaptureTraces.java`, `NoteBridgeSourceProbe.java` (DELETE), and other-chunk files `LiveCaptureTraces.java`, `LiveCaptureProbe.java`, `SharedRecordingTraces.java`, `SharedRecordingProbe.java`; `.mjs`: `note-bridge.mjs`, `note-bridge-platform.mjs` (rewrites the generated `Handler.post` to call `NoteBridgePorts.post`, `Context.getSystemService` to return `NoteBridgePorts.audio`, `MediaRecorder` to bump `starts`), `shared-recording(.mjs|-platform.mjs)`, `live-capture-platform.mjs`. Survives the DELETE of `NoteBridgeSourceProbe` (seven other importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-22 | C5 | `hold`/`queue`/`post`/`flush` duplicates `NoteRecordingPorts.holdPosts`/`posts`/`post`/`flushPosts`; `note-bridge-platform.mjs:10` string-replaces one `post` target with the other. | One ports class with one held queue (`hold`, `post`, `flush`), used by both platforms; delete the string replacement. Note `flushPosts` clears `holdPosts` while `flush` does not; keep `flush` semantics and set `hold=false` explicitly where the service harness relied on it (`NoteRecordingServiceTraces:71`). | Low |
| 2 | 15-16 | — | `permissionCall`/`permissionCallback` are written by the generated Capacitor stub. | Move with the merge. | None |

## Proposed end state
Folded into `NoteRecordingPorts.java` (renamed `NotePorts.java` if preferred) as one static port bag with a single
held main-queue. The `note-bridge-platform.mjs` string replacements that redirect `Handler.post` disappear.
