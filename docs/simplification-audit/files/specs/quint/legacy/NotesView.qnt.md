# specs/quint/legacy/NotesView.qnt
- Lines: 217 | Kind: Quint model, historical view-refresh design translation (seven TLA configurations) | Verdict: DELETE (with C17)
- Covers: the 2026-11 notes-view TLA design (recording durability, rename membership, reviewed agent moves, hidden ASR catch-up) at commit `7883110c0a`. Duplicates: live `application/CanonicalNotes*.qnt`, `NotesLifecycle.qnt`, `BrowserNoteRecordingJournal.qnt`, `NotesRecorderMediaAdmission.qnt`. Callers/importers: `legacy/manifest.json` (sources point only at `view-refresh-configurations.json` and `check-view-refresh.mjs`, i.e. it models no product file), `legacy/view-refresh-configurations.json:853`, `test/fixtures/quint/NotesViewComparison.qnt:3`, `legacy/notes-view/check-notes-view-refinement.mjs`, `test/quint-legacy-notes-view-refinement.test.mjs` (~40 s).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-217 | P6 | "Literal translation" of a retired TLA spec; the manifest's `sources` are the legacy runner files themselves and `historicalSourceLinks` only, so nothing ties it to live notes code. | Delete. | Low |
| 2 | — | A1 | Notes legacy engine/"previous notes" is being deleted (D1); any legacy notes refinement replaying it loses its subject. | Delete harness and test with it. | Low |
| 3 | — | T4 | Live canonical-notes models already cover recording durability and folder membership for current code. | None (coverage retained). | — |

## Proposed end state
Removed with `specs/quint/legacy/**`, plus `NotesViewComparison.qnt`, `legacy/notes-view/**`, its refinement test and its entry in `view-refresh-configurations.json` (which itself goes). No coverage loss for current code.
