# test/browser/dev-hosted-journey.spec.ts
- Lines: 30 (4 tests, serial) | Kind: Playwright `chromium`, dev build against a local hosted-results server (`hosted-harness.ts`), UI driven | Verdict: **MERGE** into `journeys/notifications.spec.ts` (2 cases)
- Covers: a scheduled-digest notice tapped in the shade opens the retained output; the Notifications and Result checks switches persist across reload; disconnect disables background polling; a tap while the simulated device is locked resumes after unlock; notifications off suppresses new notices but keeps output; paused checks stay quiet. Duplicates: `journey-f-hosted-result.spec.ts` (notice tapped after restart reaches its own result once). Callers/importers: `chromium` project; imports `hosted-harness.ts` (also used by `journey-f-hosted-result.spec.ts`, so the helper survives) and `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-17 | — | Real journey: tap notice → retained briefing, toggle both switches, reload keeps them, ack counted once. | Carry; drop the screenshot and the final `browserHostedResults.status()` import (assert "Agent disconnected" only). | none |
| 2 | 18-20 | P7 | Lock/unlock via the simulator's Power/Unlock controls while the server holds the result. | Delete. | Low |
| 3 | 22-25 | T6 | Notifications off: correct, but reads `browserHostedResults.list()` in-page. | Carry, asserting the shade has no new notice and the panel shows the second result. | none |
| 4 | 27-30 | — | Paused "Result checks" with `page.clock.runFor(16000)` (proper fake time). | Fold into case 1 as a step. | none |
| 5 | 5 | T8 | `mode:'serial'` with a shared server across tests. | One server per worker as a harness fixture. | none |
| 6 | 3, 9 | Q-HOST-1, Q-HOST-5 | The hosted-result path (`HostedTransport`, hosted digests) is an open owner question. | If the owner removes hosted digests, delete this file instead. | — |

## Proposed end state
Two cases in `journeys/notifications.spec.ts` ("digest result notices"): tap a notice to open the retained output, toggle Notifications and Result checks, reload, checks paused stay quiet until re-enabled; with notifications off a new result shows in the panel but posts no notice. Journey F's restart case sits beside them. Delete the file.
