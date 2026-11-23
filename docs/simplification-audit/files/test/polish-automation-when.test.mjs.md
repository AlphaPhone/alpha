# test/polish-automation-when.test.mjs
- Lines: 42 | Kind: unit (esbuild bundle of real `automations-protocol.ts`, `workflow-local-time.ts`, `locale-time.ts`; one stub client) | Verdict: MERGE into `test/integration/automations.test.mjs`
- Covers: automation/reminder schedule labels render the device-local instant with the device hour-cycle override (Android h12/h23), not the raw locale dump. Duplicates: `specs/quint/refinement/services/automation-request-settlement.mjs` loads the same modules but checks settlement, not formatting. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | C3 | Bundles three modules through esbuild into a `data:` URL instead of importing them (Node strips types natively). | Import the modules directly. | Low |
| 2 | 8-32 | T3 | Pure formatting unit tests of `automationWhen`, `workflowLocalInstant`, `workflowSnoozeTime` across zones and hour cycles. The h12/h23 override is a real Android bug class (vanilla Intl cannot see it). | Keep the two hour-cycle cases and the invalid-input case; fold into the integration file. | Low |
| 3 | 34-42 | keep | Real `AutomationsProtocol.list()` over a stub fetch: prompt and reminder rows share the human instant format. Closest to integration. | Keep as the anchor case of `test/integration/automations.test.mjs`. | Low |

## Proposed end state
Three cases in `test/integration/automations.test.mjs`: protocol rows use `automationWhen`; h12 and h23 device choice
win over the locale default for instants and snoozes; invalid input yields `''`. Direct imports, no esbuild.
The file itself is deleted. A Playwright journey (`journeys/workflows.spec.ts`) could replace case 3 later.
