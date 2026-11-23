# test/browser/journey-f-email-notifications.spec.ts
- Lines: 371 | Kind: Playwright journey, `chromium` dev server, 5 independent tests: 1 on the dev mailbox (`/?mode=dev`), 3 on `/` with a synthetic Gmail provider patched in-page, 1 Calendar reminder notice (`/?mode=dev&tools=1`, fixed clock) | Verdict: MERGE tests 1-4 into `journeys/inbox.spec.ts`; test 5 into `journeys/notifications.spec.ts`
- Covers: dev mailbox read, local draft survives reload, one local send; provider path: conversation read, saved draft restored after reload, review shows From/To/Subject/body before any dispatch, confirm leaves exactly one receipt and one Sent message, a confirmed send clears every local copy; a lost dispatch reply is an unknown outcome that is never re-sent, reconciles on an explicit receipt check; a reply naming another request id is not accepted; a due Calendar reminder notice tapped after reload opens exactly its event once. Duplicates: `journey-f-reviewed-send.spec.ts` (same provider boundary, reviewed send, unknown outcomes; its report keeps it as the reviewed-send case of `journeys/inbox.spec.ts`), `inbox-unsaved-recovery.spec.ts`, `inbox-folders-drafts.spec.ts`, `gmail-mvp-scope.spec.ts`, `mail-review.production.spec.ts`, `notification-route-lifecycle.spec.ts` / calendar reminder specs (test 5). Callers/importers: none; imports `helpers/browser-calendar.ts`, `inbox-draft-navigation.ts`, `calendar-draft-readiness.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-98 | T6/P3/C5 | `installProvider` is a 55-line synthetic Gmail client written into `connectionController.getCloudClient/getSnapshot` and `inboxLocalStore.read/compareExchange` after every load. Nine specs carry their own copy of this boundary. | One typed `helpers/mail-provider.ts` (state in a test-owned key, options `loseNextReply`, `unsure`, `wrongReceipt`, capability flags). | Medium: must keep the "accepted but reply lost" semantics exactly. |
| 2 | 247-325 | T4 | Lost-reply and wrong-receipt cases overlap `journey-f-reviewed-send.spec.ts` unknown-outcome cases. | Keep one of each in the inbox journey; delete the twin. | Low |
| 3 | 1, 335, 354 | T6/A1 | Test 5 enters the dev browser calendar through `openBrowserCalendar` (React fiber walk setting `calendarAuthority:'browser-local'`). | Use the dev surface's visible Calendar route after C2; no fiber walk. | Medium |
| 4 | 332-333 | T6 | `events()` imports `calendar-store.ts`; `notices()` imports `platform-plugins.ts` and calls `AlphaNotifications.list()`. | Assert the shade contents (already done at 357-360) and the Calendar list; keep at most one harness read for "consumed once" after reload. | Low |
| 5 | 102, 106 | D5 | Seeds `alpha:startup-permission-walkthrough:v1` and `alpha.connection.selection.v1` inline (the latter is seeded 339× across specs). | Harness fixture options (`connection:'offline'`, `accessSetup:'completed'`). | none |
| 6 | 129, 141-161 | — | Dev mailbox test reads `localStorage['alpha.dev.app.inbox']` to prove one Sent record. The Sent folder view already shows it (157). | Drop the storage reads; keep the UI assertion and the external-request fence. | Low |
| 7 | 28-33 | A8/T9 | Header points to `scripts/test-inbox-sent-cleanup.ts` for the identity cases (a test living in `scripts/`). | Remove the pointer once that script moves to `test/` (T9). | none |
| 8 | 166-167 | — | Tight timeouts (35 s, 5 s default) on the reviewed send: good. | Keep. | none |

## Proposed end state
- Delete the file.
- `journeys/inbox.spec.ts`: dev mailbox local send (one case), provider reviewed send with one receipt and local-copy cleanup, lost reply never resent, wrong receipt refused, all on `helpers/mail-provider.ts`, de-duplicated against `journey-f-reviewed-send`.
- `journeys/notifications.spec.ts`: "reminder notice after reload opens its own event once", next to the hosted-result notice case.
- No `connectionController`/`inboxLocalStore` patching in specs; no fiber walk.
- Expected ~200 lines across the two journeys.
