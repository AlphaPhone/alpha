# test/embedding-library-source.test.mjs
- Lines: 25 | Kind: tooling unit (real `embeddingLibrarySource` from `scripts/stage-embedding-host.ts` on temp files) | Verdict: MERGE into `test/tooling/embedding-host.test.mjs`
- Covers: supplied artifact mapping keeps the original receipt path, refuses traversal and unexpected names, and requires a regular non-symlink file. Duplicates: `embedding-host-admission.test.mjs` "supplied embedding bytes stage only against the exact reviewed source" drives the same function through `stageEmbedding --from`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-25 | T3, T4 | One-function test; the happy path is already covered by the staging case. The symlink and traversal refusals are not. | Carry the symlink and `../` refusals as two assertions in the staging case; drop the rest. | Low. |

## Proposed end state
Two assertions inside the admission staging case of `test/tooling/embedding-host.test.mjs`; file deleted.
