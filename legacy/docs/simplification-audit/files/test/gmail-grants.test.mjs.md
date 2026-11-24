# test/gmail-grants.test.mjs
- Lines: 58 | Kind: unit (pure functions of `apps/app/src/runtime/gmail-grants.ts`, real import) | Verdict: MERGE into `test/integration/inbox-gmail-google.test.mjs` (only the security-relevant cases), delete the rest
- Covers: read-first then incremental modify scopes, action-to-capability mapping, grant tier and labels, read-cache isolation and withdrawal on revoke/account/session change, the connection access label. Duplicates: `test/browser/gmail-grant-recovery.spec.ts` drives the upgrade prompt; labels appear in the Google settings panel tests. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | One-module unit test. The owner wants none, but the cases at 11-29 and 41-53 decide which Google capabilities are requested and when cached mail must be dropped, a privacy boundary. | Carry: `gmailCapabilitiesFor('read'/'modify')`, `gmailActionGrant` read-only/unreadable cases, `gmailGrantChange` revoke and session change. Exercise them through the integration path that uses them (the inbox adapter over the fake Cloud transport) where possible. | low |
| 2 | 31-39, 55-58 | T1-like | Label strings (`Read access authorized`, `Connected · Gmail: ...`) are copy. | Assert copy in `journeys/settings.spec.ts` (Google accounts) instead. | none |

## Proposed end state
About five cases in the inbox-gmail-google integration (scopes requested, change actions refused without grant,
cache dropped on revoke/session change); labels checked in the settings journey.
