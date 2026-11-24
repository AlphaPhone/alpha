# test/fixtures/quint/NotesViewComparison.qnt
- Lines: 19 | Kind: Quint alias module over a historical design model (legacy comparison) | Verdict: DELETE (with `specs/quint/legacy/`)
- Covers: replay names/initialisers so a legacy harness can replay the current UI (Notes trash/restore/folders/recording) against `specs/quint/legacy/NotesView.qnt`, a translated 2026-11 design whose "current" profile is historical source `ef9fbf7cd7`. Duplicates: live application models `specs/quint/application/CanonicalNotesView.qnt` model the same surfaces against today's code. Callers/importers: only `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs:16` (grep of the repo for the file name finds nothing else; not in any manifest).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 | Historical-evidence retention: the module only exists to compare the current renderer with a superseded design. DECISIONS D11 retires `specs/quint/legacy` once live harnesses stop importing helpers from it; this fixture is used by nothing live. | Delete together with its legacy harness and `test/quint-legacy-*` test; no helper to move (it imports only the legacy model). | Low: the harness is one of the slow legacy tests (27-45 s each per ci-and-formal §2.10). |
| 2 | 1-3 | A8 | Header comments narrate history ("historical current design", "original current profile"). | Goes with the file. | — |

## Proposed end state
File deleted. `test/fixtures/quint/` becomes empty once all seven comparison modules go, and the directory is removed.
