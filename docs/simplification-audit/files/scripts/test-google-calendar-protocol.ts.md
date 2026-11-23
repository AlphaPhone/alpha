# scripts/test-google-calendar-protocol.ts
- Lines: 71 | Kind: integration at the transport boundary (real `CloudProtocol` and `managedServiceRequest` against an in-process request function) | Verdict: MERGE the live half into `test/integration/cloud-protocol.test.ts`; DELETE the Calendar list/feed half with C3 (D4)
- Covers: Google consent capability sets for `initiateGoogle` (read/write, send/drafts/mailbox/modify) and refusal of an unknown permission before dispatch; `initiateGmail`; calendar list/feed parsing and refusal of malformed/partial/truncated responses; account-changed and 409; managed-service route admissions for the calendar feed/list paths. Duplicates: consent sets are also driven through `test-google-accounts.ts:24-33`. Callers: `test/adapter-contracts.test.mjs:5`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-63 | A2/A7 | `googleCalendars` is a C3 delete symbol and `googleCalendarFeed` has no caller outside `cloud-protocol.ts:547` (grep over `apps/` and `android/`). Both belong to the client-side linked-sync stack retired by D4. | Delete these assertions with the methods. | L |
| 2 | 65-70 | A2 | Managed route admissions for `/google/calendar/feed` and `/calendars` are the sync-v1 admissions listed as "open" in C3. | Delete with the routes if the owner closes C3's open item; otherwise keep in the merged file. | M |
| 3 | 51 | A7 | `initiateGmail` has no product caller (only tests). | Delete the method and the assertion. | L |
| 4 | 40-50, 56 | — | Consent capability sets, unknown permission never dispatched, foreign `authUrl` refused: live security rules at the network boundary. | Keep in the merged file. | — |
| 5 | 57-58 | — | Account-changed and revoked (409) are asserted through `googleCalendars`. | Re-point to `gmailAccounts` when moving. | L |
| 6 | 5-7 | T9 | Self-respawn under tsx, a second copy of the pattern in `test-device-actions.ts`. | Delete. | L |

## Proposed end state
About 15 lines survive inside `test/integration/cloud-protocol.test.ts`: consent sets, invalid permission refusal with zero requests, foreign authorization URL refusal, account-changed and 409 through a live method. The file and its `adapter-contracts` row are deleted.
