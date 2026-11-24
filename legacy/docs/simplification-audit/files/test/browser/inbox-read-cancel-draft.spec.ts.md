# test/browser/inbox-read-cancel-draft.spec.ts
- Lines: 103 | Kind: Playwright journey (chromium), 6 parametrised + 1; in-page fake Cloud client and slot store | Verdict: MERGE into `journeys/inbox.spec.ts` (draft-retention case, 3 params; Compose admission case)
- Covers: cancelling Refresh / Search, or a late account revalidation after leaving Inbox, never drops unsaved or edited-saved local draft fields (To, Subject, body, Cc, Bcc), shows no stale results, writes nothing, aborts explicit reads; Compose stays disabled until the selected account's draft read finishes and does not reuse another account's draft. Duplicates: `inbox-unsaved-recovery.spec.ts` (retained editor through reload/update), `inbox-compose-layout.spec.ts` (Cc/Bcc retained). Callers/importers: chromium; imports `flag-off-android` (`seedCompletedAccessSetup`), `app-navigation` (`returnToApps`), `inbox-draft-navigation` (`localDraftRow`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 103 | — | Two `beforeEach` hooks, one at the end of the file; one seeds `alpha.startup-permissions.v1` by hand, the other calls `seedCompletedAccessSetup` — two mechanisms for the same thing. | One harness fixture option. | Low |
| 2 | 8 | T7 | 3 requests x saved/unsaved = 6 runs; saved/unsaved differ only in a held save step. | Keep 3 (one per request), each with the edited-saved variant (the harder case). | Low |
| 3 | 10-21, 69-83 | T6 / T7 | Two more copies of the in-page Cloud fixture. | Shared `harness/gmail.ts`. | Low |
| 4 | 53 | T8 | `setTimeout(0)` inside evaluate as a settle step. | `expect.poll` on the outcome. | Low |
| 5 | 74 | C6 | Parses the product's draft slot key shape (`inbox-drafts:v1:[...]`, index 3 = grant). | Expose via harness helper (`holdDraftRead(grant)`). | Low |

## Proposed end state
`journeys/inbox.spec.ts` › "cancelled reads never drop a draft" (Refresh, Search, account revalidation) and "Compose waits for the selected account's drafts". ~50 lines. File deleted.
