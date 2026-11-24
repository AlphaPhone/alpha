# test/embedding-host-preparation.test.mjs
- Lines: 36 | Kind: tooling (real `embeddingBuildRemap`; spawns `scripts/prepare-embedding-host.ts` with refused outputs) | Verdict: MERGE into `test/tooling/embedding-host.test.mjs`
- Covers: compiler path remapping is stable; native preparation refuses output inside `vendor/` or `artifacts/`, an existing output, a symlinked parent, and a wrong engine revision, all before writing. Duplicates: `test/strict-build-inputs.test.mjs` also exercises `embeddingBuildRemap` (per `files/scripts/embedding-build-remap.ts.md`). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-17 | T3, T4 | Unit test of an 18-line env builder, also covered by `strict-build-inputs`. The script report merges `embedding-build-remap.ts` into `prepare-embedding-host.ts`. | Drop; keep one assertion in whichever suite owns reproducible-build inputs. | Low. |
| 2 | 18-36 | - | Output-safety refusals of a build step that writes outside the repo: real CLI spawns, cheap (fail fast). | Carry the three cases. | - |

## Proposed end state
Three CLI refusal cases in `test/tooling/embedding-host.test.mjs`.
