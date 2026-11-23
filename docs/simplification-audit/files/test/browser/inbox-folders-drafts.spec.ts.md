# test/browser/inbox-folders-drafts.spec.ts
- Lines: 141 | Kind: Playwright journey (chromium) on an in-page fake Cloud client | Verdict: MERGE into `journeys/inbox.spec.ts` (folders, provider drafts, send review, wide layout, thread)
- Covers: capability-gated folders (Archive only on older servers; Drafts/Archive/Trash with `draftsList`/`searchTrash`), 44 px folder targets, reply drafts stay in Gmail, editing a Gmail draft prepares a `draft-replace` review with the expected digest and dispatches nothing until confirmed, Send opens the exact review and closing it sends nothing, wide layout keeps the message beside the list and collapses on resize, real threads load automatically and the message actions menu stays compact and in-bounds. Duplicates: `inbox-folders-compatibility.production` (folder menu keyboard), `journey-f-reviewed-send.spec.ts` (review-before-send), `inbox-owner-fence.spec.ts` (review dialog). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-32 | T6 / T7 | In-page fixture replaces `connectionController` methods and `inboxLocalStore`; full capability object is the most complete copy in the suite. | Make this the basis of `harness/gmail.ts` (capabilities, folders, drafts, prepare/dispatch counters). | Low |
| 2 | 14 | C3 | Local SHA-256 hex helper (also `inbox-owner-fence.spec.ts:8`). | Harness `sha256Hex`. | — |
| 3 | 91 | T8 | `waitForTimeout(200)` then asserts no dispatch. | Assert after the dialog is gone plus one frame; the counter is synchronous. | Low |
| 4 | 76-93 | T4 | "Send opens the exact review" overlaps `journey-f-reviewed-send.spec.ts`. | Keep one (prefer the journey-f one if it also confirms); here keep only "closing the review sends nothing". | Low |
| 5 | 48 | A8 | Comment cites `#411`. | Remove the issue reference. | — |
| 6 | 130, 134 | B5 | Screenshot artefacts. | Drop. | — |

## Proposed end state
`journeys/inbox.spec.ts` sections: "folders follow server capabilities", "a Gmail draft is edited and saved only through review", "closing the send review sends nothing", "wide layout keeps the message open", "threads load and actions stay compact". The fixture becomes the shared Gmail harness. File deleted.
