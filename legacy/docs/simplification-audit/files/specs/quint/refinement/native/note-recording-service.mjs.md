# specs/quint/refinement/native/note-recording-service.mjs
- Lines: 25 | Kind: Quint refinement driver (host JVM; whole `AlphaNoteRecorder` + `AlphaNoteRecordingService`) | Verdict: MERGE into `native/note-recording.mjs`
- Covers: Recording foreground-service ownership: old owner/start/toggle, blank open, discard, current stop, recreation, pause/resume, foreground refusal, fallback paths, same-id stops. Model `NativeNoteRecordingService`. Duplicates: none for behaviour; code is a near copy of `note-recording.mjs`. Callers/importers: `native/index.mjs:17,188`, `test/quint-native-recording.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-25 | C5 | Same shape as `note-recording.mjs` (platform, temp state dir, `javaTraces(…,[state,'campaign',…])`, `checkTraces`). | One `note-recording.mjs` exporting both checks over a shared `run(model, harness, compiled, scenarios, assumptions)`. | None |
| 2 | 14 | B5 | Hashes harness files. | Trim. | None |

## Proposed end state
Folded into `note-recording.mjs` as a second export (~8 lines there).
