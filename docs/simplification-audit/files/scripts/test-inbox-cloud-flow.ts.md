# scripts/test-inbox-cloud-flow.ts
- Lines: 449 | Kind: source transplant (T2) via `loadInboxFixture`/`installInboxFixture` in `scripts/inbox-adapter-fixture.ts` (regex-stripped `prototype/inbox-cloud-adapter.ts` in a `vm`), with a real `ServiceReadCache` in some cases | Verdict: REWRITE as cases in `test/browser/journeys/inbox.spec.ts`
- Covers: Inbox auto-load, account-verification before showing speculative mail, Load more with pending state and double-tap guard, Refresh, Sent folder, folder switch cache, search account fence, classified failures, P-37 read-grant withdrawal, shared compose prefill and the draft shelf, mailbox revision → "Load newer mail", complete-empty claim, account-change summary withdrawal, reload restore across midnight, Home warmup vs late saved summary, revoked warmup purge (including failed purge), late disk restore vs live page, expired Cloud key on read state. Duplicates: `test/browser/home-inbox.spec.ts` (header read, cached subjects, owner change, saved restore while pending, cancelled delayed load), `gmail-grant-recovery.spec.ts` (grant withdrawal re-read), `journey-f-reviewed-send.spec.ts` ("Load newer mail"), `inbox-folders-drafts.spec.ts` (folders), `file-email.spec.ts` (shared compose); `classifyGmailFailure` rows also in `test-gmail-mailbox.ts:55-61`. Callers: `test/adapter-contracts.test.mjs:6`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-98 | T2 | Product adapter evaluated from stripped source with 20 hand-injected bindings. | Delete after the journey cases land. | M |
| 2 | 20-62, 128-246 | D8/T8 | One 120-line straight-line script sharing ~15 mutable globals; `Date.now` replaced globally and restored by hand (:131, :158, :268, :296). | Journey cases use the harness clock policy. | L |
| 3 | 179-180 | T4 | `classifyGmailFailure` asserts duplicated. | Drop. | L |
| 4 | 376-416 | — | Revoked warmup with failed or exhausted purge must not restore subjects on a later notification: privacy rule with no Playwright equivalent (home-inbox covers owner change, not failed purge). | Carry (route the cache purge to fail via the harness storage fixture). | M |
| 5 | 341-360 | — | Late disk restore cannot replace a newer live page. | Carry. | M |
| 6 | 419-449 | — | Expired key (401/`expired`) during read-state change rejects the captured session and says "Sign-in expired". | Carry. | L |
| 7 | 140 | — | Load-more double tap starts one request; pending label. | Carry. | L |
| 8 | 183-203 | — | Second shared compose preserves the open email on the account shelf with a new draft id. | Carry (check `file-email.spec.ts` first). | L |
| 9 | 245-280, 304-339 | T4 | Reload restore and Home-saved snapshot cases overlap `home-inbox.spec.ts` "restores only its own saved Inbox". | Keep only the cross-midnight label case if not covered. | L |

## Proposed end state
Deleted with its `adapter-contracts` row. `journeys/inbox.spec.ts` gains ~7 cases: pagination guard, revoked warmup (with failed purge), late disk vs live, expired key on read-state, shared-compose shelf, revision change → Load newer mail (if not kept in `journey-f-reviewed-send`), account-change summary withdrawal. Everything else is already a journey.
