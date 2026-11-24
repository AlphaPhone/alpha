# specs/quint/refinement/application/workflow-request-recovery-admission.mjs
- Lines: 120 | Kind: Quint refinement harness, `sourceContext` transplant of `runtime/workflow-request-recovery.ts` with controlled document and dialog ports | Verdict: PORT
- Covers: `WorkflowRequestRecoveryAdmission` — `createWorkflowRequestRecovery` admits recovery reads and dialog loads only for the current visit; successors revoke predecessor callbacks; a settled reset cannot publish to a retired visit; only a current failure reports unavailable. Product: `apps/app/src/runtime/workflow-request-recovery.ts` (dialog is `browser/domain-recovery.ts` `openDomainRecovery`). Duplicates: the mounted Workflows fixture/spec covers the real management card and dialog (per assumptions). Callers: `test/quint-workflow-request-recovery-admission.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | T2 | `sourceContext` type-strips the file and deletes its two `import type` lines; trivially replaceable. | `sourceModule('apps/app/src/runtime/workflow-request-recovery.ts')` (type-only imports vanish in esbuild). | L |
| 2 | 7-9 | B5 | Hashes `automations-adapter.ts`, `domain-recovery.ts`, `workflow-intents.ts`, `template.html` though not executed. | Drop. | L |
| 3 | 102-103 | D3 question | The "backup" half (`capture` → `Download … backup` in `domain-recovery.ts`) is the damaged-document recovery download. D3 deletes backup/import/export and native recovery backup; if the owner counts this download as backup, the capture step goes and the model loses `captured`. | Owner question; keep until decided. | M |
| 4 | 66-67 | B1 | Swallows non-Abort errors via `.catch(() => {})` on capture. | Assert the outcome instead. | L |

Product file read as text: `apps/app/src/runtime/workflow-request-recovery.ts` (via `sourceContext`).

## Proposed end state
Real bundled import, seven schedules unchanged, provenance list removed; capture step follows the D3 decision.
