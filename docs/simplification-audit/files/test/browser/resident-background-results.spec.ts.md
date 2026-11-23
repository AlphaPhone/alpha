# test/browser/resident-background-results.spec.ts
- Lines: 153 | Kind: Playwright, chromium (dev server), real Settings/diagnostics UI with `helpers/resident-agent-plugin` plus a 60-line inline bridge (`AlphaHostedResults`, secure slots, Agent requests); 5 generated scenarios | Verdict: **MERGE** ready/rejected/late into `journeys/digests.spec.ts`; **MERGE** the two mock-entry scenarios into `journeys/dev-surface.spec.ts`
- Covers: starting the resident agent binds scheduled-digest background results (`configureBackground` with mode `resident`, no token) and the Scheduled digests dialog shows "Runs on this phone"; a rejected binding falls back to foreground sync with "Background off"; a late binding is discarded after Disconnect; disconnect waits for background retirement; entering mock mode waits for every background pause and refuses if session retirement fails. Duplicates: digest delegation/hosted digest specs (`dev-digest-delegation`, `dev-hosted-journey`, other chunks); `digest-resident-schedule.production.spec.ts` covers the production resident schedule. Callers/importers: imports `helpers/connection-diagnostics`, `helpers/resident-agent-plugin`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-74 | C3 / T7 | Inline bridge on top of `createResidentAgentPlugin`; the second resident fake in the suite besides `resident-stub.ts`. | Use the merged `harness/plugins/agent.ts` with an `AlphaHostedResults` plugin fixture. | Low |
| 2 | 121 | – | Opens the digests dialog by dispatching `alpha:hosted-digests`, the same event the launcher uses. Acceptable. | Keep, or open from Settings if a control exists. | none |
| 3 | 84-110 | D6 | Mock-mode entry rules are development-surface behaviour (D6 keeps mock mode). | Move to `journeys/dev-surface.spec.ts`. | none |
| 4 | 140 | – | Screenshot nothing compares. | Drop. | none |
| 5 | 78 | D5 | Uses "Start local agent" in development diagnostics to start the resident in the dev build. | Keep via a shared `startResidentInDev(page)` helper. | none |

## Proposed end state
Three digest-binding steps in `journeys/digests.spec.ts` and two mock-entry steps in `journeys/dev-surface.spec.ts`, both on the
shared agent + hosted-results fixtures. File deleted.
