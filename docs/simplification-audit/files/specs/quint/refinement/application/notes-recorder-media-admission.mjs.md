# specs/quint/refinement/application/notes-recorder-media-admission.mjs
- Lines: 115 | Kind: Quint refinement replay in real Chromium against the mounted app (integration; good shape) | Verdict: KEEP
- Covers: canonical Notes recorder (button and agent-facing `notes_record` control) waits for the saved-audio stop before capture; refused stop fails the attempt; leaving Notes or replacing the canonical owner retires the attempt. Sources live: `note-recorder.ts`, `notes-recorder-control.ts`, `canonical-notes-ui.ts`, `voice-adapter.ts`, `browser/audio-capture.ts`, `note-audio-store.ts`. Model `NotesRecorderMediaAdmission.qnt`.
- Duplicates: the five schedules run twice, via `test/notes-recorder-media-admission.test.mjs` and the aggregate `index.mjs:31` (T4). Playwright `test/browser/browser-speech.spec.ts` records notes but does not hold the playback stop. Importers: the two tests; fixtures `test/fixtures/calendar-mounted-editor.mjs` and `test/fixtures/notes-recorder-media.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 29 | D11 | Uses `startMountedCalendar` from `calendar-mounted-editor.mjs`, which is a generic mounted-app fixture (Vite dev server + Chromium). | Rename the fixture to `test/fixtures/mounted-app.mjs` when tests are consolidated. | Low. |
| 2 | 10-14, 27-33 | B5 | Hashes ten source paths plus every module Vite serves (`onSource`). | Drop with the receipt ceremony review of `check-traces.mjs`. | Low. |
| 3 | runtime | cost | Starts Vite and Chromium per run (240 s test timeout). | Run in the browser/formal lane only, path-filtered on the Notes recorder sources. | — |

## Proposed end state
Keep the five schedules; one test entry; fixture renamed. This is the model for how other text-slicing harnesses should look (real mounted app, controlled ports).
