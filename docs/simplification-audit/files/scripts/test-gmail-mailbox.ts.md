# scripts/test-gmail-mailbox.ts
- Lines: 133 | Kind: mixed: unit (`setGmailReadState`, `disconnectGmailAccount`, `classifyGmailFailure` with stub clients) + integration at the transport boundary (real `CloudProtocol` parsing against an in-process `CloudNativeRequest`) | Verdict: MERGE the protocol half into `test/integration/cloud-protocol.test.ts` (with the Gmail parts of `scripts/test-cloud-protocol.ts` and the live half of `test-google-calendar-protocol.ts`); delete the duplicated unit tables
- Covers: reviewed read-state dispatch happens once and only for the reviewed digest; disconnect is never retried and its outcome comes from a readback; Gmail response parsing (safe links, `hasAttachments`, capabilities, drafts cursor, opaque attachment digest, unsafe MIME → octet-stream, unsafe file names) and session revocation (local sign-out always). Duplicates: disconnect outcomes = `specs/quint/refinement/services/google-accounts.mjs:22` and `test-google-accounts.ts:34-54`; `classifyGmailFailure` rows = `test-inbox-cloud-flow.ts:179-180`. Callers: `test/adapter-contracts.test.mjs:6`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-54 | T4 | Six disconnect outcome rows duplicate the Quint refinement `google-accounts.mjs` (same four outcomes through `createGoogleAccounts`, which calls `disconnectGmailAccount`). | Delete here. | L |
| 2 | 55-61 | T3/T4 | `classifyGmailFailure` table: pure mapping, also asserted in `test-inbox-cloud-flow.ts:179-180` and implicitly by every inbox failure journey (`gmail-grant-recovery.spec.ts`). | Delete. | L |
| 3 | 12-43 | T3 | Read-state prepare/dispatch with a stub client. The "tampered review is never dispatched" and "unknown outcome is reported, never repeated" cases are safety rules with no other host coverage. | Keep these 3 cases in the merged file. | — |
| 4 | 63-132 | — | Real protocol parsing at the network trust boundary: the right level. | Keep as is (split into named cases). | — |
| 5 | 107 | C3 | Inline SHA-256→hex. | Use the shared `lib/hash` helper. | L |
| 6 | 6-7 | D13 | Deep `.eliza` imports. | Alias. | L |

## Proposed end state
`test/integration/cloud-protocol.test.ts` gets: Gmail read parsing (links, attachments flag, older server), capabilities, drafts + repeated cursor refusal, draft content refusal, opaque attachment digest + name/MIME review, session revocation (4 outcomes), reviewed read-state dispatch (once / tamper / unknown). This file is deleted, as is its row in `adapter-contracts.test.mjs`.
