# test/browser/unified-automations.spec.ts
- Lines: 143 | Kind: Playwright chromium, 6 tests; real Workflows UI against a routed synthetic `/__unified_api` agent API, injected by overwriting `connectionController` methods in-page (s2 r92 clk) | Verdict: MERGE into `journeys/workflows.spec.ts`
- Covers: unified list of workflows, prompt triggers, schedules and reminders with type filters; new prompt automation is created paused; Enable and Run now need confirmation; a 404 reminders capability shows an explicit source error and disables Reminder creation; an aborted run shows "Unconfirmed" and "Allow another" asks before releasing; schedule edit sends the exact cron/instructions only after confirmation; a UTC schedule keeps its clock when edited from another time zone; a confirmed schedule run fires once. Duplicates: `automations-unified.test.mjs`, `automations-transport.test.mjs` (host); other `workflow-*` specs on the same list. Callers/importers: chromium; imports `helpers/browser-calendar`, `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-44 | P2 / P3 | Replaces `connection.getSnapshot`, `getAutomationsClient`, `getWorkflowClient` on the live controller to point at a routed fake API. | Harness fixture "development agent with automations API" that answers at the network/native boundary, not by patching the controller. | Medium |
| 2 | 34 | — | `openBrowserCalendar(page)` then `returnToApps` before Workflows, with no Calendar assertion: unexplained setup step (probably initialises calendar state the list reads). | Find the dependency; remove or name it. | Low |
| 3 | 81-127 | T4 | "Schedule edit" and "another clock" cases drive the same editor; the second adds the time-zone note and an instructions-only edit. | One parameterised case (UTC and Los Angeles). | None |
| 4 | 54-55, 60 | — | Three screenshots without assertions. | Drop. | None |
| 5 | 9-33 | T7 | 25-line route handler re-implements the agent API shapes. | Move to `harness/agent-api.ts` shared with other workflow specs. | None |

## Proposed end state
`journeys/workflows.spec.ts` keeps: unified list and filters; paused creation and confirmed Enable (no execute/fire without confirmation); missing reminders capability is an explicit source state; unconfirmed run and "Allow another"; schedule edit after confirmation (parameterised over time zone); confirmed schedule run fires once. All on a shared agent-API fixture with no controller patching. Delete this file.
