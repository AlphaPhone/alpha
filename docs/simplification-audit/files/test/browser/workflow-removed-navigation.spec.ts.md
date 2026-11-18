# test/browser/workflow-removed-navigation.spec.ts
- Lines: 54 | Kind: Playwright spec, chromium, 1 test; real UI after in-page seeding | Verdict: MERGE into `journeys/workflows.spec.ts` (lifecycle section)
- Covers: with only a removed workflow, a fresh Workflows visit shows No automations and a Removed workflows entry; the removed workflow shows its history read-only, and Restore needs a confirmation, restores it inactive and keeps its runs. Duplicates: removal flows in `workflow-outcome-unknown.spec.ts` and `workflow-interruption-recovery.spec.ts` (remove, not restore). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-30 | T6 | Seeds by calling `connectionController.initialize/startDevelopment` and the workflow client in the page. | Seed through `harness/workflow-agent.ts` (a removed workflow with one run) and connect via `harness/connection.ts`. | Low. |
| 2 | 5-10, 42-53 | T6 | `savedState` reads `development-execution-document` to prove nothing changed before confirmation. | Use the agent fake's post log (no lifecycle POST before Confirm). | Low. |
| 3 | 2 | C5 | Calendar helper used as a media guard. | `harness/app.ts` guard. | None. |

## Proposed end state
Lifecycle step: removed-only list → Removed workflows → open → Removed status and history → Restore → Confirm restore →
inactive, runs kept. File deleted.
