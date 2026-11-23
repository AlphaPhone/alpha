# test/browser/dev-workflow-execution.spec.ts
- Lines: 15 (11 KB) | Kind: Playwright, chromium; product Workflows UI against the development agent workflow protocol (`?workflows=agent`), with in-page workflow-client calls | Verdict: MERGE into `journeys/workflows.spec.ts`
- Covers: a reviewed agent workflow runs from "Run now" and shows durable output and history; manual edit ("Change") preserves steps and restores paused state; metadata/pause/removal/restore keep versioned history; a waiting phone step cancels durably; execution receipts for skip/model modes. Duplicates: `workflow-presentation-execution.spec.ts`, `workflow-run-context.spec.ts`, `workflow-retirement.spec.ts`, `workflows.production.spec.ts` (production lane). Callers: chromium only. Helpers: `connection-diagnostics.ts`, `workflow-navigation.ts`, `calendar-draft-readiness.ts` (as `guardNoMedia`), `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 13-14 | — | Run now → output → history and rendered manual editing: product renderer on a fake agent. | Carry both. | None. |
| 2 | 8 | P2 | `seed()` creates the workflow by calling `getWorkflowClient().client.phoneCatalog/validatePhone/save` in-page. | Harness `seed.workflow(spec)` that writes through the dev protocol fake (same boundary the app reads). | Low. |
| 3 | 10-12 | T6 | Three tests only call the workflow client and `developmentWorkflowRequest` in-page and compare receipts: tests of the dev fake protocol (`browser/development-workflows.ts`). | Delete. | Low (dev fake). |
| 4 | 6 | C3 | `page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/, abort)` copied in authoring/execution/phone. | Harness no-external-traffic fixture. | None. |

## Proposed end state
Two cases in `journeys/workflows.spec.ts`: "reviewed workflow runs and its output and history are visible" and "Change keeps steps and a paused workflow stays paused". The client-only cases go.
