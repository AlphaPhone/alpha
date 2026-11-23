# test/browser/inbox-owner-fence.spec.ts
- Lines: 33 | Kind: Playwright spec (chromium), 4 cases; in-page fake slots + Cloud client, `crypto.subtle.digest` instrumented to drain work | Verdict: MERGE into `journeys/inbox.spec.ts` (account-switch safety case, parametrised)
- Covers: a pending mail-operation receipt review is fenced by owner: switching Cloud owner while a draft read or a receipt clear is in flight never writes the old owner's draft, never overwrites the new owner's receipt, aborts the old read, prepares/dispatches nothing; same-owner completion opens the draft. Also review-dialog focus trap (Tab/Shift+Tab). Duplicates: owner-change cases in `home-inbox.spec.ts:49-52,161-174` (Home card), Quint models of inbox operations if any. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | C6 / T6 | Re-derives the product's storage key (`'inbox-operation:v1:'+sha256(JSON.stringify([owner,grant]))`) in the test to seed a slot. This pins the persisted key format (G5, legitimate) but duplicates the product function. | Import nothing from product; instead create the pending receipt through the UI flow (prepare + close) in the harness, or keep one explicit key-format assertion and seed through it. | Medium |
| 2 | 13-16 | T6 | Monkey-patches `crypto.subtle.digest` to track in-flight hashes and drain them. | Replace with polling on the observable outcome (slot contents / dialog state) with `expect.poll`. | Medium |
| 3 | 2-33 | D8 | Whole scenario on ~10 very long lines. | Rewrite readable. | — |
| 4 | — | — | Unique safety rule (no cross-owner writes of pending mail operations) with no other browser coverage. | Keep the four modes. | — |

## Proposed end state
`journeys/inbox.spec.ts` › "a pending mail operation stays with its owner" parametrised over read-switch / same-owner / clear-delete / clear-receipt on the shared Gmail harness (with slot inspection helpers), without patching `crypto.subtle`. File deleted.
