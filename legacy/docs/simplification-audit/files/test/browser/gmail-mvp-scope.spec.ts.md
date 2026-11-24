# test/browser/gmail-mvp-scope.spec.ts
- Lines: 396 | Kind: Playwright (`chromium`, dev build), real UI journeys with backdoor setup (T6/P2) and product-object patches (P3) | Verdict: **REWRITE** as the basis of `journeys/inbox.spec.ts`
- Covers: Gmail Inbox read/paging/Sent/unread badge, reviewed mark-read/unread and archive (prepare → confirm → dispatch), stale review, read failures, Settings disconnect, compose From picker, local drafts, and Notes → "Share note → Email" draft preservation, all against an in-page fake Gmail client. Duplicates: `inbox-owner-fence`, `owner-gmail-read-state-absent` (read-state absent = test at :142), `gmail-grant-recovery`, `mail-preview`, `inbox-save-attachment` overlap the same fake; `photo-email`/`use-in-email` overlap the share-to-email path. Callers/importers: imports `helpers/legacy-notes` (`openLegacyNotes`), `app-navigation` (`returnToApps`), `calendar-draft-readiness` (`guardCalendarFixture` aliased as `guardNoMedia`). 26 tests (two loops).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-61 | T6, P2 | `setup()` imports `/src/runtime/connection-ui.tsx`, `inbox-local-store.ts` and `cloud-protocol.ts` in the page, replaces `connectionController.getCloudClient` and `getSnapshot` with a fixed object, and replaces `inboxLocalStore.read/compareExchange` with an in-memory map. The real Cloud transport and the real durable store are never exercised. | Fake Gmail at the bridge boundary (`AlphaConnection.request` for `/api/v1/google/...` routes and `secureRead/secureCompareExchange` for slots) in `harness/plugins/cloud.ts` + `harness/plugins/mail.ts`; seed the signed-in cloud account through the bridge's credential slot, not `getSnapshot`. Throw `CloudProtocolError`-shaped failures by returning HTTP status codes. | Medium: the fake must speak the real wire format; today it speaks the in-process client interface. |
| 2 | 80, 227, 340, 360, 388 | A1 (D1) | Five tests (nine cases) reach "Share note → Email" through `openLegacyNotes` ("Previous notes"). That source is deleted by D1, so these cases break with stage A2. | Reach Notes through the canonical Notes fixture (`harness/plugins/notes.ts`, from `helpers/canonical-notes.ts`). | Low once the fixture exists. |
| 3 | 72-77, 362-365, 390 | P3 | Monkey-patches `serviceReadCache().get` and `inboxLocalStore.compareExchange` in the page to hold/conflict a write. | Hold/conflict at the bridge (`secureCompareExchange` answer `{status:'conflict'}` or a held promise in the fake). | Low. |
| 4 | 293 | T8 | `waitForTimeout(200)` before asserting that only one `mark-read` was dispatched (absence by sleeping). | `page.clock.runFor` or poll the fake's operation ledger until idle. | Low. |
| 5 | 3, 5 | B4/D10 | `guardCalendarFixture` is imported under the alias `guardNoMedia`; the network fence is re-written inline (69 copies repo-wide, P13). | Harness auto-fixture does both. | none |
| 6 | 67-105 | T4 | Four readiness scenarios (`connected/empty/error/restored`) each re-drive the whole Notes share flow. | Keep `empty` and `error` as steps of one share-to-email test; `restored` (cache read gate) only if the owner wants offline-cache coverage. | Low. |
| 7 | 201-223, 240-265 | T7 | Two disconnect tests and two From-picker tests are near-twins (single vs multi account). | One "Settings disconnect" test with two accounts; one compose test that checks the picker and its single-account absence. | none |
| 8 | 10, 16-61 | D8 | Minified one-line fixture (several 300-char lines). | Formatter; the fake moves to the harness anyway. | none |

## Proposed end state
`journeys/inbox.spec.ts` (production bundle, bridge harness) takes these cases: open + Load more + Sent + unread badge;
reviewed mark-read once (including during an unconfirmed outcome) and mark-unread; read-state capability absent;
left-swipe archive with review and confirm; stale review retry never dispatches; read failure (offline/409/503) with
explicit Refresh; Settings disconnect with cancel and confirm (two accounts); compose From picker incl. the
"other account already has a draft" refusal; failed Load more drops the cursor; Share note → Email opens a prefilled
local draft and preserves the earlier draft (saved, unsaved, conflict, retired-on-leave). Delete this file when the
journey lands. Needs: `harness/plugins/cloud.ts` (Gmail routes + operation ledger), `harness/plugins/notes.ts`,
`harness/nav.ts` (`openApp`, `chooseMailAction`, `returnToApps`).
