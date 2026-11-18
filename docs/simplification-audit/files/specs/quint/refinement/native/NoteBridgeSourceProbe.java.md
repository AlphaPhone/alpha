# specs/quint/refinement/native/NoteBridgeSourceProbe.java
- Lines: 41 | Kind: JVM probe of the product Notes bridge (not a Quint replay; prints one JSON object) | Verdict: DELETE
- Covers: start/resume of a Notes recording under closed host, queued call, paused host and permission-return-during-call. Duplicates: `NotePermissionTraces.java` scenarios `resume-retired`, `resume-queued-call`, `queued-paused`, `permission-call`, `queued-call` cover the same inputs and observe more fields, against the model.
- Callers/importers: only `probeNoteBridge()` in `note-bridge.mjs:24-28`. Whole-repo grep (`probeNoteBridge|NoteBridgeSourceProbe` over apps, android, scripts, test, specs, .github, package.json) finds no caller of `probeNoteBridge`; the probe never runs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Dead harness: its only entry point `probeNoteBridge` has no caller. | Delete the file and `probeNoteBridge` from `note-bridge.mjs`. | None (it never executes) |
| 2 | 33 | T10 | Reflects on private `AlphaVoiceCloudPlugin.noteMicrophonePermission` (also used by `NotePermissionTraces`, which stays). | Goes with the file. | None |

## Proposed end state
Gone, together with `probeNoteBridge`. No coverage is lost: every mode is a subset of a `NotePermissionTraces`
scenario that is checked against `NativeNotePermission`.
