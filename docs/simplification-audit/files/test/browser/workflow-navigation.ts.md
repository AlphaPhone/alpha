# test/browser/workflow-navigation.ts
- Lines: 33 | Kind: Playwright support (navigation + read-model fixture) | Verdict: KEEP, split into `harness/nav.ts` and `harness/workflow-agent.ts`
- Covers: `newWorkflow` (New automation → More options → Steps), `workflowCard` locator, and `installWorkflowListFixture`, which answers `/api/automations` and lifeops routes from the development workflow store. Duplicates: navigation helpers in `app-navigation.ts`, `inbox-draft-navigation.ts`, `scan-review-navigation.ts`. Callers/importers (12): `workflow-notice-taps`, `workflow-scope-refusal`, `dev-workflow-authoring`, `home-workflows`, `workflow-generation`, `dev-workflow-execution`, `workflow-interruption-recovery`, `workflows.production`, `workflow-removed-navigation`, `workflow-presentation-execution`, `home-daily-overview`, `dev-workflow-phone`. Survives: yes.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-25 | T6 | `installWorkflowListFixture` patches `connectionController.getAutomationsClient` in the page. | Fold into `harness/workflow-agent.ts` as the `/api/automations` projection of its store. | Low. |
| 2 | 26-33 | ok | `newWorkflow`/`workflowCard` use visible controls only. | Move to `harness/nav.ts`. | None. |
| 3 | 3-4 | ok | Comment explains the read projection. | Keep with the moved code. | None. |

## Proposed end state
`harness/nav.ts` exports `newWorkflow` and `workflowCard`; the automations projection lives in the workflow agent
fake. This file is deleted after the 12 importers switch.
