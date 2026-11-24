# specs/quint/native/NativeNoteRecordingService.qnt
- Lines: 86 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness `note-recording-service.mjs` compiles whole `AlphaNoteRecorder` and `AlphaNoteRecordingService` | Verdict: KEEP (rename one run)
- Covers: Notes recording foreground service: only the current recording owns the notification; stale start/stop/toggle commands for a replaced recording cannot hide or change the live one (8 runs, 3 invariants). Duplicates: none. Callers/importers: manifest; `specs/quint/refinement/native/note-recording-service.mjs` (scenarios incl. `blank-open`, `discard-blank`, `fallback-blank`); `test/quint-native-recording.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 70-71 | A8 naming | `discardedRecordingAcceptsLegacyStopTest` is not legacy: the blank stop is current behaviour (`AlphaVoiceCloudPlugin.java:96` calls `recordingClosed` with the idle status's null `recordingId`, `AlphaNoteRecordingService.java:99-100`). The name invites a wrong A1 deletion. | Rename to `discardedRecordingAcceptsBlankStopTest` in the model and manifest `tests`. | None |
| 2 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |
| 3 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model unchanged apart from the run rename; harness unchanged; one runner; path-filtered to the two Java files.
