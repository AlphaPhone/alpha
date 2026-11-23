# test/browser/dev-digest-delegation.spec.ts
- Lines: 19 (5 tests) | Kind: Playwright `chromium`, dev build; UI in the Scheduled digests panel plus `HostedDigestProtocol.prototype.delegation` surgery and module calls | Verdict: **DELETE** (owner question Q-HOST-5)
- Covers: "Cloud read access" delegation in the development digest simulator: review, approve, choose account and source, schedule, read granted mail, revoke; revocation awaiting Cloud; cancel; lost completion response; expiry and retired connection. Duplicates: none. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-19 | P7, Q-HOST-5 | Every test runs against `browser/development-digests.ts`, a simulation of the agent's hosted delegation API. The PRD does not name hosted digests or read delegation (Q-HOST-5 open). | Delete. If the owner keeps Cloud reads, carry lines 5-8 (approve → source → schedule → result → revoke) into `journeys/workflows.spec.ts`. | Medium if Q-HOST-5 says keep: the delegation UI loses its only e2e. |
| 2 | 10, 14 | P3 | Patches `HostedDigestProtocol.prototype.delegation` to fake `retry_required` and a lost response. | Delete. | none |
| 3 | 4, 6 | P2 | Opens the panel by dispatching `alpha:hosted-digests` instead of navigating. | Gone. | none |
| 4 | 17-18 | T6 | Calls `developmentDigestRequest` in-page and rewrites the selection key to retire the connection. | Gone. | none |

## Proposed end state
Deleted, pending Q-HOST-5. If kept, one delegation journey in the workflows file, navigated through visible controls.
