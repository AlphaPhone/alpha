# specs/quint/refinement/native/workflow-notice-delivery.md
- Lines: 16 | Kind: harness documentation | Verdict: MERGE into `specs/quint/refinement/native/README.md`
- Covers: boundary table for the WorkflowNoticeDelivery JVM campaign. Duplicates: assumptions in `workflow-notice-delivery.mjs:67-77`. Callers/importers: none (grep outside the audit folder: no references).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7,14 | – | Says the bridge methods are "extracted" — true until the PORT; update then. | Rewrite with the port. | L |
| 2 | all | – | One doc per harness. | Move the table into the folder README; delete the file. | L |

## Proposed end state
A "WorkflowNoticeDelivery" section in the native refinement README.
