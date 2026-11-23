# test/browser/dev-cloud-scenarios.spec.ts
- Lines: 11 (4 tests) | Kind: Playwright `chromium`, dev build, UI through the connection-diagnostics backdoor | Verdict: **DELETE**
- Covers: development "Dedicated" hosting setup scenarios (existing instance adoption, insufficient balance, changed quote, failed provisioning). Duplicates: `dev-cloud-setup.spec.ts` (same review/finish flow). Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | A3, D5 | Dedicated hosted-agent provisioning. PRD AP-03: "local-only agent, no provisioning/pairing"; C4 / Q-DEV-2 delete the fixture. | Delete. | none |
| 2 | 3-5 | P11, A8 | `describe.configure({timeout:60_000})` justified by "Hosted WebKit" first-page time; this file is not in the WebKit storage list. | Gone with the file. | none |
| 3 | 9-10 | T6 | Reads `developmentCloudSetupDocument(...).read()` in-page. | Gone. | none |
| 4 | 6-7 | C5 | `setup`/`finish` helpers duplicate `dev-cloud-setup.spec.ts:5-7`. | Gone. | none |

## Proposed end state
Deleted with the development Cloud fixture (C4).
