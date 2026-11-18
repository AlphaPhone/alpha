# test/browser/connection-activity-presentation.spec.ts
- Lines: 81 | Kind: Playwright UI over inline bridge + `resident-agent-plugin`, chromium | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (1 case)
- Covers: the connection dialog's Actions history lists an uncertain recorded phone action ("Create note", "Review · applying") with Yes/Decline reconcile controls and a pending one, in plain language with no raw JSON. Duplicates: `dev-connection-actions.spec.ts` (queued action review, larger). Callers/importers: none. 1 test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 60, 65 | P2 | Opens the dialog through `openConnectionDiagnostics` (backdoor `connectionController.open()`); the product route is Settings → About → Connection help. | `nav.openSettings('About','Connection help')`. | Low. |
| 2 | 9-58 | P6 | Inline bridge (6 plugins) beside `installResidentAgentPlugin`. | Typed bridge + `plugins/agent.ts` with a `proposals` and `journal` seed. | none |
| 3 | 10 | P12 | `w.androidBridge = {}` marker set by hand (also in `composer-dispatch`, `connection-boundaries`). | Harness option. | none |
| 4 | 77-80 | — | The no-raw-JSON assertions are the product rule worth keeping. | Carry. | none |

## Proposed end state
One case in `journeys/connection-cloud.spec.ts`: seed one uncertain and one pending device action through the agent plugin, open Connection help by visible navigation, assert plain-language rows and reconcile controls, no JSON.
