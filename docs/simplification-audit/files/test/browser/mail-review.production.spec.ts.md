# test/browser/mail-review.production.spec.ts
- Lines: 268 | Kind: Playwright production journey (flag-off bundle, Android bridge stubbed at the native HTTP boundary), project `production`, 2 tests, no `/src` imports | Verdict: **MERGE** into `journeys/inbox.spec.ts` (production block)
- Covers: reviewed Gmail send (Cc/Bcc shown in review, edit after review discards it, only the last reviewed request is dispatched byte for byte) and Home's Inbox card withholding a count until a changed account is re-verified. Duplicates: partly `gmail-mvp-scope.spec.ts` (research: basis of mail journey) for compose/review; no other spec checks the dispatch digest or the Home re-verification. Callers/importers: none (spec); imports `flag-off-android.ts`, `helpers/resident-agent-plugin.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-155 | T7 / C4 | 135-line inline Capacitor fake: resident agent HTTP dispatcher, secure store with compare-exchange, action journal, Calendar plugin, Cloud billing and a synthetic Gmail server. The same secure-store and journal fakes appear in `maps-approved-read.spec.ts` and many others. | Move the Gmail Cloud server to `harness/cloud-gmail.ts`, and use the shared typed bridge (`harness/bridge.ts`) for secure store, journal and resident agent. | Low |
| 2 | 28, 42-59, 72, 88-98 | A7 | The object is still called `declineFixture` and carries proposal decision/claim/receipt handlers, `calendar`, `receipts`, `reconciliations`, `effects`, `lists`: copied from a proposal-decline spec. No mail step uses proposals or Calendar. | Drop the unused handlers and fields when moving to the harness. | none |
| 3 | 236-246 | T6 / D3 | Test 2 replaces `Capacitor.nativePromise` in-page to hold one request (acceptable boundary hold) but then fires the `alpha:gmail-accounts-changed` window event as a backdoor for "Settings announced a change". | Change the account through the Settings UI (or keep the event only if Settings has no such control in production; state that in the test). | Medium: the event name is an internal bus (D3) |
| 4 | 164-166 | B1 / T8 | `isVisible().catch(()=>false)` polling to support both dev and production starts. The spec only runs on `production`. | Keep only the production branch. | none |
| 5 | 1-2, 268 | style | Two imports from the same module; `beforeEach` declared after the tests. | Fold on move. | none |

## Proposed end state
Two tests in `journeys/inbox.spec.ts` (production): "reviewed send dispatches only the last reviewed request" and "Home inbox card re-verifies a changed account".
The mailbox becomes a `cloudGmail` harness fixture that both the production and chromium inbox journeys use, with the
dispatch log (`prepares`, `dispatches`, `sent`) as its observable. The fixture loses the copied proposal and Calendar
handlers. The account change goes through Settings, not a window event.
