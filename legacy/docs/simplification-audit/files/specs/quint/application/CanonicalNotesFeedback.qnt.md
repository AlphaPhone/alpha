# specs/quint/application/CanonicalNotesFeedback.qnt
- Lines: 49 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: CanonicalNotesUi feedback classifier: when a failed read/commit stays flagged for review and when an accepted read, discard or owned commit clears it. Duplicates: Aggregate re-run (T4). Shares source and fixture with CanonicalNotesView. Callers/importers: `specs/quint/refinement/application/canonical-notes-feedback.mjs`, `test/quint-canonical-notes-feedback.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`); `compileCanonicalNotesUi` reused by canonical-notes-view.mjs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 12 | — | Harness compiles `CanonicalNotesUi` through an esbuild stdin `export {…} from` entry: a real import, no slicing. | None. | — |
| 2 | all | C5 | 49-line model over the same `canonical-notes-ui.ts`/controller as CanonicalNotesView; harnesses already share `compileCanonicalNotesUi`. | Optional: fold into CanonicalNotesView as one `CanonicalNotesUi` model. Not required; separate obligations are clear. | Merging changes trace shapes of two harnesses. |
| 3 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Unchanged model; import-based harness; one runner.
