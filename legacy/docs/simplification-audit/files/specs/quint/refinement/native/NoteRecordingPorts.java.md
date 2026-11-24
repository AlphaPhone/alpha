# specs/quint/refinement/native/NoteRecordingPorts.java
- Lines: 32 | Kind: Quint refinement support (virtual clock, recorder fault switches, service command capture, timers, held posts) | Verdict: KEEP (merge target for `NoteBridgePorts.java`)
- Covers: external inputs for every Notes/shared-recording harness: `now`/`advance`, `failJournal/failOpen/failStop/failRelease/failJoin/failForeground/failConstructor`, service launch failure and newer-start-pending, Android service command list, timer map, notification manager. Duplicates: held-queue part duplicates `NoteBridgePorts` (C5).
- Callers/importers: `NoteRecordingTraces`, `NoteRecordingServiceTraces`, `NotePermissionTraces`, `PipedCaptureTraces`, `NoteBridgeSourceProbe` (DELETE); other chunks `LiveCaptureTraces`, `LiveCaptureProbe`, `SharedRecordingTraces`, `SharedRecordingProbe`, `VoiceDraftTraces`; `.mjs`: `note-recording.mjs`, `note-recording-service.mjs`, `note-recording-platform.mjs`, `note-bridge(.mjs|-platform.mjs)`, `shared-recording.mjs`, `voice-draft.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | C5 | Second held-queue (`holdPosts`/`posts`/`flushPosts`) twin of `NoteBridgePorts`. | Absorb `NoteBridgePorts` here with one queue (see that report). | Low |
| 2 | 15 | A7 (check) | `failRelease`, `failConstructor` are not used by any harness in this chunk. | Grep the live-capture/shared-recording harnesses before removing; keep if used there. | None |

## Proposed end state
One Notes port class for all recording harnesses, with a single held main-queue, the clock and fault switches.
