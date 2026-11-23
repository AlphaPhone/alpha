# test/browser/home-workflows.spec.ts
- Lines: 61 | Kind: Playwright spec (chromium, `?mode=dev&workflows=agent`) with `WorkflowProtocol.prototype` patched in-page | Verdict: MERGE into `journeys/workflows.spec.ts` (Home card section)
- Covers: the Home workflows card shows real names/states (+N more, no removed rows, Paused), opens the list; empty/failed/loading states offer explicit refresh; no refetch on rerender; snapshot retained and refreshed on list visit; disconnect retires names and a late old-owner result cannot refill; leaving foreground causes one fresh list on resume; no writes ever. Duplicates: `home-daily-overview.spec.ts:429-458` (same card, same prototype patch). Callers/importers: chromium; imports `workflow-navigation` (`installWorkflowListFixture`, `workflowCard`), `calendar-draft-readiness` (`guardCalendarFixture` aliased `guardNoMedia`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D11 | Imports a calendar helper and renames it `guardNoMedia`: the helper is generic (blocks media) but lives in a calendar file. | Move the guard into the harness under its real name. | Low |
| 2 | 9-16 | T6 | Replaces `WorkflowProtocol.prototype.list/lifecycleSupported/detail/executions` and the write methods. `installWorkflowListFixture` already routes `/api/automations`; two fixture layers on one boundary. | One workflow fixture at the HTTP/bridge boundary in the harness (rows, hold/release, error, write counter). | Medium |
| 3 | 20 | T6 | Connects via `connectionController.startDevelopment('local')` in-page. | Harness `connectDevelopmentAgent(page)` that clicks the real connection UI. | Low |
| 4 | 22-26 | T7 / D8 | Light/dark loop and a 22 px icon-inset assertion on one 900-character line. | One theme; format. | Low |
| 5 | 59 | T6 | Fakes `document.hidden` via `defineProperty` to simulate backgrounding. | Acceptable; harness helper `background(page)`. | Low |

## Proposed end state
`journeys/workflows.spec.ts` › "Home workflows card": names/states/+N/opens list; empty and failure with explicit refresh and no rerender reads; retained snapshot refreshed on list visit; disconnect + late result; resume refresh; zero writes. ~45 lines on a shared workflow fixture. The duplicate in `home-daily-overview` is deleted.
