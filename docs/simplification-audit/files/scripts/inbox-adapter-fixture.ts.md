# scripts/inbox-adapter-fixture.ts
- Lines: 307 | Kind: source-transplant harness (T2) with a stubbed Gmail client (T3) | Verdict: DELETE; REWRITE the cases as `journeys/inbox.spec.ts` (Playwright, test-mocks Gmail provider) or as an integration test that imports the Inbox adapter
- Covers: Inbox list, unread attention, reader links/attachments, drafts, review-before-send, grant withdrawal and mail notices, by evaluating three prototype files in a `vm` realm. Duplicates: Inbox Playwright specs (`test/browser/inbox-folders-drafts.spec.ts`, `mail-review.production.spec.ts`, `journey-f-reviewed-send.spec.ts`, `journey-f-email-notifications.spec.ts`, `gmail-mvp-scope.spec.ts`) and the hosted-inbox Quint replays (`quint-renderer-hosted-inbox`). Callers/importers: `scripts/test-inbox-attention-flow.ts`, `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-retention-cases.ts` (run by `test/inbox.test.mjs` and `test/inbox-retention-cases.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 215-219, 255-261 | T2 | Loads `inbox-provider-controls.ts`, `inbox-drafts.ts` and `inbox-cloud-adapter.ts` through `prototypeScript` (text, imports stripped) into `vm.createContext`. | Delete. | L |
| 2 | 231-247 | T2/T3 | `inboxAdapterBindings` hands the transplanted code about 60 globals: real helpers imported here, plus stubs that throw (`prepareMailHtml`, `googleConnectionController.open`, `openConnectionBrowser`) and fixed values (`cachedDevicePreferences`). The module graph under test is assembled by hand. | Delete. | L |
| 3 | 146-214 | T3 | `scenario()` is a full fake Gmail provider (`FixtureClient`, 13 methods), fake connection controller, fake native attachment plugin, fake `Date`, fake `window.confirm`. | The provider fake is worth keeping as the test-mocks Gmail provider the Playwright journey uses, if one does not already exist under `ELIZA_DEV_ALLOW_TEST_MOCKS`. | M |
| 4 | 38-131 | C1 | About 95 lines of local structural types re-declaring view, rendering and API shapes of the adapter. | Goes with the file. | L |
| 5 | file | D11/T9 | A test harness at `scripts/` root named "fixture". | Goes with the file. | L |
| 6 | 133-138 | T4 | `deq` (JSON-compare across realms) exists because of the vm realm. | Goes with the file. | L |

## Proposed end state
Deleted with its three importers and `fixtures/prototype-script.ts`. Cases worth carrying into `journeys/inbox.spec.ts`: unread count drives the
Home attention badge; opening a message shows links with the "text does not match target" warning; an unsupported attachment opens only after
review, a supported one shows its text; drafts list and reopen; a send goes through review and is never dispatched by the fixture provider;
withdrawing the Gmail grant clears background notices and cached lists; a stale probe result after an account switch is ignored. Retention cases
(`test-inbox-retention-cases`) belong in the same journey or in the hosted-inbox Quint replay that already models them.
