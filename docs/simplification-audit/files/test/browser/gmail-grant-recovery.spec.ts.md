# test/browser/gmail-grant-recovery.spec.ts
- Lines: 112 | Kind: Playwright, chromium. A UI journey (Inbox, Reconnect Gmail, Google accounts panel). The Cloud client and snapshot are overridden on `connectionController` (P2), and `inboxLocalStore.read` is patched (P3). The second test has a proper Capacitor `AlphaConnection` fake for `openExternal` (s5/r14, 1 `waitForTimeout`) | Verdict: **MERGE into `journeys/inbox.spec.ts`**
- Covers: on the same grant id, a disconnect or a revoked triage scope clears read availability ("Connect Gmail") with no OAuth start, and recovery reads once on reconnect and again on Refresh. Reconnect Gmail opens the Google accounts panel; opening it authorizes, opens and reads nothing. Add account and Edit events each hand off once to `openExternal` with `['write','send']` and read nothing. A confirmed account change refreshes the list and Inbox once. An abandoned handoff (Escape) leaves nothing pending. Duplicates: `journey-core-loops.production.spec.ts:897` (mail without a grant asks for one) and `gmail-mvp-scope.spec.ts` (Reconnect Gmail copy). Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14, 56-67 | P2 | The Cloud client and `getSnapshot` are replaced on the controller. | Serve the Gmail client through the harness Cloud fake (the `AlphaConnection.request` route, as `flag-off-android.ts:214-250` does). The real `CloudProtocol` validation then runs too. | Low |
| 2 | 10 | P3 | `inboxLocalStore.read=async()=>null`. | Use bridge secure slots. | none |
| 3 | 108 | T8 | `waitForTimeout(300)` after releasing the held handoff, to prove "nothing appears". | Use `settled(page)`, then assert. | none |
| 4 | 37-40, 82-84 | A8 | Commit-hash history comments ("Since the Gmail navigation polish (78ac2d30e)", "Since 10e15eff9"). | Reword them as current behaviour. | none |
| 5 | 98 | P2 | It dispatches `GOOGLE_ACCOUNTS_CHANGED` after an in-page import of `google-accounts.ts`. | Emit the real trigger (the `AlphaConnection` handoff-complete listener, or app resume) from the bridge. | Low |
| 6 | 23, 26 | — | `span:text-is("Connect Gmail")` is a CSS text selector rather than a role. | Use a role query if the control is a button or link. | none |
| 7 | 22-26 | D8 | Assertions repeated verbatim (lines 22-23 = 25-26). | Remove the duplicates. | none |

## Proposed end state
A "Gmail grant recovery" block in `journeys/inbox.spec.ts` with the two-reason recovery test and the one-handoff-per-
authorization test, on the harness Cloud fake and bridge. It uses no controller overrides and no sleeps.
