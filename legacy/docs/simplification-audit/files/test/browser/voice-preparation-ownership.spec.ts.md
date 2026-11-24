# test/browser/voice-preparation-ownership.spec.ts
- Lines: 21 | Kind: Playwright spec, chromium, 3 tests (loop over development flag) | Verdict: MERGE into `journeys/voice.spec.ts` and `journeys/notes.spec.ts`
- Covers: an unsigned Talk opens the voice sheet with the mic disabled, no Notes recorder and no fallback route buttons, and Settings → Account offers email sign-in; the Cloud Notes recorder pauses, resumes and saves without a transcription request. Duplicates: unsigned voice also in `chat-voice-mode.spec.ts`; pause/resume/save overlaps `voice-save-ownership.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T4 | Same unsigned journey runs twice, normal and `development` browser. The development variant only proves the dev surface does not change this path. | Keep the normal variant; development parity belongs to `journeys/dev-surface.spec.ts` if anywhere. | None. |
| 2 | 5-11 | ok | Sign-in status answered at the `__alpha-browser-cloud` route boundary. | Keep; move to `harness/cloud.ts` (`signedIn:false`). | None. |
| 3 | 18-21 | ok | Recorder pause/resume/save is a real UI journey. | Move to the voice-note recording section of `journeys/notes.spec.ts`. | None. |
| 4 | 15-16 | T6 | Reads `window.cloudNotesVoice.starts` and `f.foreign`; acceptable boundary counters. | Keep via the harness fixture's typed counters. | None. |

## Proposed end state
`journeys/voice.spec.ts`: "signed-out Talk" step (sheet, disabled mic, no fallback buttons, Account shows email sign-in,
no capture started). `journeys/notes.spec.ts`: recorder Pause/Resume/Save with zero uploads. Needs `harness/cloud.ts`,
`harness/voice.ts`. File deleted.
