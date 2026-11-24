# test/browser/chat-continuity.spec.ts
- Lines: 691 | Kind: Playwright, `chromium` project; UI journeys over a hand-written Capacitor bridge emulating a **remote paired agent** (`{kind:'remote'}`), plus in-page imports of `connection-ui.tsx`, `assistant-draft-store.ts`, `alpha-client.ts` | Verdict: **MERGE** unique cases into `journeys/chat.spec.ts` (production harness); DELETE the rest
- Covers: draft and in-flight-message continuity against a remote agent: restart during send, first-message restart (Replace and Restore), assistant surface and app sharing one draft through Close, offline / hanging / rate-limited conversation create keeps the text, Stop before and after post, confirmed cancel, retire/overtake of the stop check, double Send, disconnect mid-reply, history restore with older pages and scroll to first message, identity-admission draft isolation (held `/api/auth/me`, owner A to owner B). Duplicates: 7 titles identical to `chat-continuity.production.spec.ts` (lines 293, 334, 354, 379, 550, 608-634, 636); restart-during-send is the same journey as production `restartDuringSend`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-26, 66, 689 | A3 (D5) | The whole fixture is a remote paired agent selected by `localStorage alpha.connection.selection.v1 = {kind:'remote'}` and paired with `connectionController.pair('remote', …)`. PRD: no hosted-agent pairing. | Run the carried cases on the resident stub; delete the remote fixture with this file. | Medium: depends on whether D5 keeps the remote kind for the e2e harness (owner question). |
| 2 | 293-318, 334-352, 354-377, 379-393, 550-569, 608-634, 636-657 | T4 | Seven tests duplicate production tests by title and journey. | Delete. | none |
| 3 | 142-169, 175-210 | T4 | Restart-during-send and first-message Replace duplicate production lines 182-256. | Delete; production already covers Replace for both. | none |
| 4 | 212-223 | none | First-message Restore moves the text into the new conversation's own draft slot and clears the "no conversation yet" slot. Production covers Restore only for an existing conversation. | Carry into `journeys/chat.spec.ts` (restart section) on the resident stub. | Low. |
| 5 | 228-250 | none | ACTION_ASSIST surface and the app share one draft through Close. Only here. | Carry (needs `DailyApps.surfaceInfo assistant:true` in the harness). | Low. |
| 6 | 252-291, 480-490 | none | Offline create failure, hanging create + Stop, 429 create: the text stays, no unknown-outcome notice, one later post. Only here. | Carry; the resident stub needs `createFails/createHangs/createLimited` options. | Low. |
| 7 | 320-332, 510-548 | none | Confirmed cancel ("The agent stopped this reply."), confirmed stop not repeated for a later stop, check result kept when another message is sent. Only here. | Carry; resident stub needs an `abortResult` option. | Low. |
| 8 | 395-413 | none | Disconnecting mid-reply shows one "Request cancelled" notice and never the old reply. | Carry as sign-out mid-reply on the resident/Cloud harness, or fold into `cloud-account-replacement.production.spec.ts`. | Medium: the trigger changes (sign-out rather than disconnect). |
| 9 | 415-475 | none | History restore with an older page (232 rows), scroll to the first message, draft survives reload. Production covers anchor preservation but not paging. | Carry the paging and scroll-to-first case; drop the duplicate draft-through-HOME part. | Low. |
| 10 | 571-598 | T6 | `alphaClient.attachVerifiedTransport` attaches a silent transport below the shell; the comment admits it bypasses dispatch tracking. | Delete; production's held stream covers Stop before the first chunk. | none |
| 11 | 660-691 | A3, T6 | Identity-admission tests hold `/api/auth/me` of the remote agent and seed drafts through `assistantDraftStore` imports; the owner switch calls `c.disconnect()` and `c.pair('remote')`. | Delete with the remote kind. If draft isolation per Cloud account must stay covered, add one step to the account-replacement journey: a draft typed as account A is not shown to account B. | Medium. |
| 12 | 167, 208, 221, 316, 372, 567, 631, 655 | T8 | Fixed sleeps, including a 17 s `waitForTimeout` (line 372) instead of `page.clock.runFor`. | Gone with the deletions; carried cases use the production file's `page.clock` pattern. | none |
| 13 | 10-104 | P6 | 95-line inline Capacitor bridge. | Gone with the file. | none |

## Proposed end state
Delete this file. `journeys/chat.spec.ts` gains, on the resident stub: first-message Restore, assistant surface shared
draft, create failure / hang / rate limit keep the text, confirmed cancel and its non-repetition, history paging to the
first message, and (if wanted) a per-account draft isolation step. The resident stub grows `createFails`,
`createHangs`, `createLimited`, `abortResult` options rather than a second bridge.
