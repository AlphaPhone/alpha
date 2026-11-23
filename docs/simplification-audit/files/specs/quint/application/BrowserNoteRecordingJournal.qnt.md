# specs/quint/application/BrowserNoteRecordingJournal.qnt
- Lines: 90 | Kind: Quint model (live, 7 runs) | Verdict: KEEP
- Covers: the web build's pending voice-note segment journal: clip bytes are written before the manifest is published, retirement fences a prepared save, partial retirement is unreadable, a retired read cannot return deleted bytes. Duplicates: `test/browser-note-pending-audio.test.mjs` reads the same source as text (T1, delete there). Callers/importers: manifest (source `apps/app/src/browser/note-recording-journal.ts`); harness `browser-note-recording-journal.mjs` (238 lines) **imports** `createNoteRecordingJournal` directly (the target shape for every harness); `test/quint-browser-note-recording-journal.test.mjs` **and** aggregate (index.mjs:48).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-42 | — | `changedBytes`, `wrongBinding`, `wrongOwner` all set `outcome: "error"` with identical guards; they exist as trace labels for three distinct rejection paths the harness drives. | None (labels are how traces name the product path). | — |
| 2 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
Unchanged. This model and harness are the reference pattern (real import, no text anchors).
