# test/fixtures/prepared-worker-producer.mjs
- Lines: 29 | Kind: fixture (closed producer port substituted for the workflow-worker build) | Verdict: KEEP
- Covers: a stand-in `buildWorkflowArtifact` that waits on a per-source-root port (`Symbol.for('alpha.quint.preparedWorkerPorts')`) and then produces a complete, failed, partial or corrupt worker artifact, so the real product wrapper and artifact verifier can be checked under interleavings. Duplicates: the five-file worker layout is repeated in `test/fixtures/product-character-host.mjs:29` and `test/fixtures/workflow-worker-assets.mjs`. Callers/importers: `specs/quint/refinement/services/prepared-workflow-worker.mjs:13,61,82` (copied into the fixture tree as the producer; registered in `services/index.mjs:64`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-19 | C6 | The worker file list (`node_modules/smthrs`, `zod`, `effect`, `@smthrs/engine`, `dependencies.json`) is duplicated in at least two fixtures. | Export one `WORKER_FIXTURE_FILES` list from `test/fixtures/workflow-worker-assets.mjs` and import it here and in `product-character-host.mjs`. | Low |
| 2 | 7 | D3 | Global-symbol port lookup; acceptable because the module is loaded by path from a copied tree. | None. | — |

## Proposed end state
Unchanged apart from importing the shared worker file list.
