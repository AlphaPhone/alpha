# test/browser-note-pending-audio.test.mjs
- Lines: 115 | Kind: transplant (T2; whole `browser/voice.ts` with imports regex-stripped, `export` removed, `import.meta.env.DEV` replaced, run by `new Function` with 13 injected fakes) + real `NoteRecorderSession` and `createNoteRecordingJournal` | Verdict: DELETE; REWRITE as `test/browser/journeys/notes.spec.ts` (recording recovery)
- Covers: a browser voice-note recording persists bytes before a canonical note create can be claimed; reload recovers a stopped/claimed recording and settles the existing note once; ambiguous creation never creates twice or discards bytes; segment boundaries and late segment text survive reload; commit/discard retire segment bytes. Duplicates: `test/quint-browser-note-recording-journal.test.mjs` + its harness (journal transitions); Playwright `notes-browser-segments.spec.ts` (bounded segments), `voice-save-ownership.spec.ts`, `note-audio-lifecycle.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T2 | Source rewriting by regex (`/^import .*;\n/gm`, `/^export /gm`, `import.meta.env.DEV`→`false`). Any multi-line import breaks it. | Delete. | none |
| 2 | 16-25 | T3 | Pending-audio store, IndexedDB documents, capture, BroadcastChannel, decoder all faked; the test proves voice.ts against its fakes. | Delete. | none |
| 3 | 78-93 | A1 (partial) | "old pending rows ... without a segment journal": `voice.ts:51-57` keeps a branch for "Older pending rows contain no completion markers". The same branch also handles a crash between the audio write and the journal write (test comment line 83). | Owner question: keep the branch only as crash recovery; drop the "older version" wording/case if the crash path cannot occur. | medium |
| 4 | 43-62 | — | Reload recovery and no-double-create are the valuable, journey-reachable behaviours. | Carry. | none |

## Proposed end state
Delete. `journeys/notes.spec.ts` (real IndexedDB in Chromium, fake mic via `--use-fake-device-for-media-stream`, dev agent note-create route that can fail after commit) carries:
1. Stop with storage failing shows an error and creates no note; retry Stop saves;
2. note create response lost after commit, reload: the recording is recovered and saved to the existing note once, no second note;
3. reload after Stop keeps segment texts and transcribes only the unfinished segment;
4. Save and Discard leave no pending recording after reload.
