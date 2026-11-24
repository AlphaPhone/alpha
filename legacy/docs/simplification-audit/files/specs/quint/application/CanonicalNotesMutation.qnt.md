# specs/quint/application/CanonicalNotesMutation.qnt
- Lines: 133 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness (inherited)
- Covers: NotesEditor remove/restore continuations: dirty delete saves first, queued save blocks delete, restore revision, lost owner cannot publish. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/canonical-notes-mutation.mjs` (+ `.md`), `test/quint-canonical-notes-mutation.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 5 | T10 | Reuses `compileCanonicalNotesEditor` from canonical-notes-draft.mjs, so it inherits the `this.saving = true;` marker injection into upstream notes-editor.ts. | Fixed by the CanonicalNotesDraft port. | — |
| 2 | manifest sources | — | Lists `prototype/agent-adapter.ts` as a source; the harness does not load it. Any agent-adapter change re-selects this model in `quint:changed`. | Drop agent-adapter.ts from sources (P1 noise). | Low. |
| 3 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Unchanged model; sources narrowed to what the harness loads; one runner.
