# scripts/test-cloud-voice-flow.ts
- Lines: 104 | Kind: source transplant (same `cloud-voice-view.mjs` vm fixture; `NoteRecorderSession` from the sandbox) | Verdict: DELETE; REWRITE into `test/browser/journeys/notes.spec.ts` (recording) and, for the consent rule, an integration test importing `prototype/note-recorder.ts`
- Covers: Notes voice recording: Stop saves audio locally, a failed local save keeps the stopped recording with "Save recording", no Cloud upload happens without explicit transcription consent, retrying a local save sends no more audio. Duplicates: `test/note-recorder-permission-recovery.test.mjs`, `test/quint-browser-note-recording-journal.test.mjs` (journal model replay), Lemma contracts on `note-recorder` (`LemmaScript-files.txt`); no Playwright journey records a note today. Callers/importers: `test/adapter-contracts.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 38, 73 | T2 | Runs the renderer through the vm transplant fixture. | Delete. | L |
| 2 | 71-103 | — | The consent block drives `NoteRecorderSession` directly; this is the only check that remote transcription needs consent after Stop. The live-transcription feature is an open owner decision (RECOMMENDATIONS A3: "note recorder live transcription only if decided (it is open: skipped)"). | Keep as an integration test importing `NoteRecorderSession` with the typed native fake, or delete with the feature if the owner retires it. | M |
| 3 | 6-12 | T8 | `until()` polls every 2 ms for 400 ms. | `expect.poll` in the journey. | L |

## Proposed end state
Journey: record -> Stop -> save fails -> "Save recording" -> save succeeds -> note with audio, zero uploads. Integration: consent required after Stop, approved transcript retained on failed save, retry sends no audio. Script deleted.
