# specs/quint/refinement/application/canonical-calendar-draft.mjs
- Lines: 88 | Kind: Quint refinement harness (esbuild bundle of the real adapter, codec and durable draft store with ported imports) | Verdict: KEEP
- Covers: canonical Calendar draft binding per owner/lifetime: old reads/writes stay with their captured slot, foreign rows are kept without resume, discard/commit clear only their own slot (`apps/app/src/prototype/canonical-calendar-drafts.ts`, `runtime/canonical-calendar-draft.ts`, upstream `durable-draft.ts`). Duplicates: none at this depth; `canonical-calendar-editor-close.mjs` covers the mounted UI side. Callers: `test/quint-canonical-calendar-draft.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 70 | — | Real module through `test/fixtures/canonical-calendar-draft-owner.mjs` (esbuild bundle; four imports replaced by ports keyed on import specifier `./calendar-confirmation`, `../runtime/assistant-draft-store`, `./agent-calendar-adapter`, `../browser/domain-recovery`). No text slicing. Port keys break if those modules move (stage F). | Keep; when foldering, update the port map or make the adapter take these as constructor deps. | L |
| 2 | 9-22 | — | `observe()` projects 18 fields from the fixture's own observer; fine. | None. | — |
| 3 | 49-67 | D9 | `drive()` if/else chain for operations. | Table `{bind, edit, commit, discard, synchronize, failRead, retire}` when touched. | L |
| 4 | — | T4 | Also run via the application aggregate. | Remove aggregate. | L |

## Proposed end state
Unchanged campaign; operation table; runs only from its per-model test when the adapter, codec, durable draft or model change.
