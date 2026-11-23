# test/browser/owner-gmail-read-state-absent.spec.ts
- Lines: 69 | Kind: Playwright, chromium; UI over the real `CloudProtocol` capabilities parser with a synthetic transport, after patching `inboxLocalStore` and `connectionController` in page | Verdict: MERGE into `journeys/inbox.spec.ts` (one parametrised case)
- Covers: Inbox shows no Mark read/unread and sends no read-state change when Cloud capabilities omit or deny `readState`; when advertised, opening an unread message prepares `mark-read`. Duplicates: other inbox specs that stub `gmailInboxCapabilities` directly; none checks the absent-field parse through UI. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-40 | T6, D3 | Replaces `inboxLocalStore.read/compareExchange`, `connectionController.getCloudClient` and `getSnapshot` in page. | Use the harness Cloud stub at the `AlphaConnection.request` boundary answering `/inbox-v1/capabilities`; the real protocol and store run unchanged. | Medium. |
| 2 | 1, 7 | D11 | Imports `guardCalendarFixture` from `calendar-draft-readiness` and renames it `guardNoMedia`. | Harness `noMedia()` fixture. | None. |
| 3 | 3 | A8 | "Issue #668 / H-17" in comment. | Drop numbers. | None. |
| 4 | 44-69 | T7 | Two tests for absent/false plus one for true. | One loop over the three wire answers. | None. |
| 5 | 53 | T6 | Asserts `parsed.readState` read back from a page hook. | The UI assertion (no Mark read button / a mark-read prepare) is enough. | None. |

## Proposed end state
One parametrised case in `journeys/inbox.spec.ts`: for capability answers {absent, false, true}, open the unread message; absent/false show no read control and prepare nothing, true prepares `mark-read` and dispatches nothing. Cloud is stubbed at the bridge; delete this file.
