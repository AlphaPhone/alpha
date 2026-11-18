# test/managed-google-transport-code.test.mjs
- Lines: 54 | Kind: unit-ish of an upstream classifier (`managedGoogleTransportCodes`, `managedGoogleFailureStage` from `.eliza/client-features`) driven through the port/host/broker chain plus direct calls | Verdict: MERGE 2 cases into `test/integration/managed-google-broker.test.mjs`; DELETE the rest
- Covers: only allowlisted transport codes and finite message families reach diagnostics; hostile errors never leak text or run getters. Duplicates: fixture is a copy of `managed-google-stage-diagnostic.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-47 | T5 / T3 | ~30 cases enumerating an upstream classifier's allowlist and message-family table; upstream owns that table. | Delete all but: one allowlisted code + one cause code projected; one unknown/hostile error omitted with no secret in logs/body. | Low |
| 2 | 35-42 | T5 | Getter/proxy hostility on the classifier called directly. | Delete (upstream). | Low |
| 3 | 52-54 | - | Message text outside fetch stage cannot create labels. | Delete (covered by stage table). | Low |

## Proposed end state
File deleted; two cases in the merged broker file. Classifier exhaustiveness is an upstream follow-up (cross-file actions §6).
