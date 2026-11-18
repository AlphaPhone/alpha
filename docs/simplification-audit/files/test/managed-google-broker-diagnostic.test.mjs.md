# test/managed-google-broker-diagnostic.test.mjs
- Lines: 45 | Kind: integration-ish (real broker + real host from `test/support/managed-google-agent.mjs`, fake Cloud request function, hand-built req/res) | Verdict: MERGE into `test/integration/managed-google-broker.test.mjs`
- Covers: refusal diagnostics are closed categories with no secret, logger failure cannot change the refusal, Calendar writes select the exact scoped owner account and recheck permission, linked-sync goes only through the authenticated broker. Duplicates: `managed-calendar-broker-read-header.test.mjs` (logger failure, unclassified fields). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-21 | - | Diagnostic shape per failure kind (401/403/invalid-response/unknown/invalid-status). | Carry as one table. | Low |
| 2 | 20 | T4 | Logger-failure case duplicated in read-header file. | Keep once. | None |
| 3 | 23-38 | - | Scoped Calendar write account selection among two grants, foreign scope refused, revocation detected on recheck. Real host logic; valuable. | Carry. | Low |
| 4 | 39-45 | A2 / D4 | Linked-sync forwarding through the broker. D4 deletes the renderer linked-sync stack; whether the broker route still has a product caller (`apps/app/src/runtime/cloud-protocol.ts` mentions it) is unresolved. | Carry only if linked-sync survives D4; else delete. Owner question. | Medium |
| 5 | 3, 10-14 | T9 / C4 | tsx re-exec; inline req/res fakes. | Use the merged file's real server helper. | None |

## Proposed end state
File deleted; three or four cases in the merged broker integration file.
