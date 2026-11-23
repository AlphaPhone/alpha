# specs/quint/refinement/services/workflow-engine/README.md
- Lines: 43 | Kind: harness documentation | Verdict: SIMPLIFY (shrink to about 12 lines)
- Covers: explains the `WorkflowEngineAdmission` refinement harness. It runs upstream `EmbeddedWorkflowService` and `createWorkflowDispatchService` on PGlite, maps model fields to observations, and lists the executed boundaries and remaining obligations. Duplicates: the "Remaining obligations" bullets repeat the `assumptions` and `obligations` arrays in `workflow-engine/index.mjs:334-346` almost word for word. Callers/importers: none (documentation). Nothing links to it (`git grep workflow-engine/README` finds nothing outside the audit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-41 | C5 | Obligations are duplicated in the README and in the harness receipt, so they drift. | Keep them in one place: the harness `obligations` array, or the README. Not both. | None |
| 2 | 43 | B5 | Describes the "discover graph, capture hashes, rebuild, reject byte changes" ceremony. That ceremony goes away under the `ports.mjs` simplification. | Replace with: "Run `node --test test/quint-workflow-engine-refinement.test.mjs`." | None |
| 3 | 3, 5 | A8 | "PGlite 0.4.6 and Drizzle 0.45.4" pins versions in prose (they will drift from `package-lock.json`). "The earlier `WorkflowExecution` helper model retains its existing narrower scope" narrates history. | Drop the version numbers and the history sentence. | None |
| 4 | 9-19 | — | The field-to-observation table is the useful part. | Keep. | — |

## Proposed end state
A short README: one paragraph saying what runs for real (upstream service, dispatch and compiler on PGlite) and what is a port (Smithers run/control, approval reader, hosted sources). It keeps the observation table and gives the run command. Obligations live only in the harness receipt. The file moves with the harness if the upstream-only models move upstream (see `index.mjs` report).
