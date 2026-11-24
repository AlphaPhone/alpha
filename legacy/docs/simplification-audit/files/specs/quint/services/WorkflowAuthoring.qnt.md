# specs/quint/services/WorkflowAuthoring.qnt
- Lines: 130 | Kind: Quint model (live; product workflow authoring) | Verdict: KEEP; PORT harness (`workflow-local-source.mjs#checkWorkflowAuthoring`) from text transplant to import
- Covers: draft save under one stored mutation identity: review-then-send, lost reply recovered by receipt read, explicit confirmed resend with the original identity, typed refusal unlocks, pending blocks edit/discard, compiler change blocks resend. Duplicates: the authoring part of `WorkflowExecution.qnt` (`validate`/`edit`/`save`) is a coarser view of the same review step; `workflow.mjs` (WorkflowExecution harness) also exercises validate/save. Callers/importers: `quint:check`; `refinement/services/workflow-local-source.mjs` (aggregate `services/index.mjs:73`, `test/quint-workflow-local-source.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `workflow-local-source.mjs:120-123` | T2 / T10 | Reads `apps/app/src/prototype/workflow-authoring.ts` as text, requires the literal seam `' return {get active(){return active;},open,close,render,flushForAppUpdate};'`, strips every `import` line, rewrites `export function`, injects `globalThis.observeAuthoring=…` reading closure variables `draft,busy,unreceipted,resendReview,storage,discard,review`, strips types and runs it in `vm` with ~15 fake globals (`connectionController`, `developmentWorkflowDraftStore`, `testMocksEnabled`, `crypto.randomUUID` …). Any reformat breaks it. | PORT: have `createWorkflowAuthoring(...)` accept its ports (storage, client provider, id minting) as parameters and return an `inspect()`/state getter (or expose the state through `render()` which already carries most of it); the harness then `import`s the module with tsx and passes ports. | Medium (needs a small product-side signature change) |
| 2 | harness `:46-48` / test | T5 | Mutation canary `'pending-edit'` replaces the literal `if(locked()||!draft)return;run();`; `test/quint-workflow-local-source.test.mjs:6` asserts the canary fails. A test of the harness. | Delete the mutation option and the canary test. | Low |
| 3 | manifest | T10 | 13 symbol pins including `committed`, `recover`, `resend`, `locked`, `refused`. | Drop `symbols`. | Low |
| 4 | 1-130 | — | Model is compact and readable; witnesses are meaningful. | None. | — |

## Proposed end state
Model unchanged. Harness imports `prototype/workflow-authoring.ts` and drives it through explicit ports and its
public `render()`; no seam string, no `vm`, no mutation canary. Manifest pins files only.
