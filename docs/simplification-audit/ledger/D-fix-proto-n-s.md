# D-fix-proto-n-s: Notes document transfer review fixes

## 1. [medium] NotesDocumentTransfer harness and model still drove the removed import path

Re-checked: confirmed. `node --test test/quint-notes-document-transfer.test.mjs` failed all three
tests with `TypeError: Cannot read properties of undefined (reading 'render')` because the harness
called `installNotesDocumentAdapter({prototype:{api}}, views)` against the new
`installNotesDocumentAdapter(views)`. Removing import is covered by a decision, so the model,
harness and manifest entry are made export-only (the follow-up recorded in A3.md:62).

- `specs/quint/application/NotesDocumentTransfer.qnt`: dropped the import kind, `imported`/`reads`
  state, the `stored` pick, `choose(kind)` (now `choose`, always export), the import branch of
  `settles`, `ImportNeedsCompletedRead`, `ImportedWitness` and `unsavedImportShowsNoReceiptTest`;
  `resultAfterLeavingNotesIsDroppedTest` now exports and expects no receipt.
- `test/quint-notes-document-transfer.test.mjs`: calls `installNotesDocumentAdapter(views)`; no
  `../build-flags` stub, no `importText` port, `api.set(){}`, no `saveImportedNote` or counters;
  `choose` always exports; `settles` resolves `{status:'exported'}`; `busy` observed as
  `pending !== undefined`; import reach condition removed; first test renamed.
- `specs/quint/application/manifest.json`: removed the import test, invariant and witness, the
  `importText` and `testMocksEnabled` source symbols (gone from the adapter, so the registry load
  refused the entry), and the import state mapping and abstractions.
- `specs/quint/application/README.md`: row reads "One document export at a time".

Verified: `node --test test/quint-notes-document-transfer.test.mjs` 3/3 pass (both mutation tests
reject with a `trace N step M` divergence). `quint typecheck`, `quint test` (5 passing),
`quint run --invariant safety` (no violation) and each remaining witness reached.
`bun scripts/check-quint.ts check --models=NotesDocumentTransfer` gets past this entry, but the
registry load then stops on an unrelated entry: `VoiceTurnReview` symbol `reviewConversationTurn`
is missing from apps/app/src/prototype/voice-adapter.ts (not owned here).

Pre-existing, unchanged: a thrown export shows the receipt 'Import failed' (same on a247c0175).

## 2. [low] Unused `alphaNoteDocuments` singleton in apps/app/src/native/alpha-note-documents.ts

Re-checked: confirmed. When this fix ran the file already had no `registerPlugin` import and no
singleton (a concurrent edit), keeping only `DocumentExportResult` and `AlphaNoteDocumentsPlugin`
with a comment naming the two registering slices. No further edit was needed; both callers use
`import type`. `npx tsc --noEmit` exits 0.
