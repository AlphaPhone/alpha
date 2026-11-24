# test/fixtures/notes-trash-read.mjs
- Lines: 103 | Kind: transplant (esbuild-transform of `notes-trash-adapter.ts` run in `vm` with stubbed `require`) | Verdict: DELETE
- Covers: the legacy Notes Trash read publication: in `notesSourceMode==='legacy'` a Trash read publishes rows only for the current epoch/source and never writes. Duplicates: none live. Callers/importers: `test/notes-trash-read.test.mjs:3`, `specs/quint/refinement/application/notes-trash-read-publication.mjs:2` (registered in `specs/quint/refinement/application/index.mjs:57,139`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 47-52 | T2 | Transforms `apps/app/src/prototype/notes-trash-adapter.ts` and runs it with nine hand-written import ports, including deep `.eliza/client-features/...` paths. | Delete. | — |
| 2 | 56, 73, 76-80 | A1 | The behaviour exercised is legacy-source-only (`notes-trash-adapter.ts:48,51,57` return unless the source mode is `legacy`). `notes-trash-adapter.ts` and `legacy-notes-access.ts` are whole-file deletes in `delete-candidates.md` A99 / C1 (DECISIONS D1). | Delete the fixture, `test/notes-trash-read.test.mjs`, `notes-trash-read-publication.mjs`, its index entry and its Quint model together with the adapter. | Low: no product path remains. |

## Proposed end state
File deleted with the legacy Notes Trash adapter, its host test, its refinement harness and model. Canonical Notes Trash is covered by `specs/quint/application/` canonical models and the Notes journey spec.
