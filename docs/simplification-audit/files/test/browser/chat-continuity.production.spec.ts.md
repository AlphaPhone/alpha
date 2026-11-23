# test/browser/chat-continuity.production.spec.ts
- Lines: 490 | Kind: Playwright, `production` project (flag-off bundle over `flag-off-android.ts` + `resident-stub.ts`), real UI journeys | Verdict: **KEEP** as the basis of `journeys/chat.spec.ts` (draft continuity and Stop sections)
- Covers: AP-05 continuity on the resident agent: the composer draft lives in the device secure slot and survives HOME, Back, keyboard resize, rotation (same element, focus and selection) and restart; collapsing chat or rotating during a reply keeps it; a restart during a send offers the message for review, never as a draft (existing and first-message conversations), with Restore and Replace; transcript keeps its reading anchor; Stop says "May still finish", discards the late reply and reconciles once; double Send posts once; a new message, new conversation, refused send or another connection operation retires or overtakes the check; HOME from another app is a Stop. Duplicates: 7 test titles are repeated in `chat-continuity.spec.ts` (remote-agent dev lane): Stop/reconcile, Send twice, new message after Stop, new conversation after Stop, HOME from another app, overtaken check, Back/HOME during reply. Draft slot checks overlap `assistant-draft-recovery.spec.ts`, `resident-failures.production.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-12 | A8 | Evidence-boundary header that restates what the file does and what it is not. | Keep two lines (what the bridge is); drop the rest. | none |
| 2 | 21-22, 80, 91 | none | HOME, Back and IME visibility are delivered as the window events the native shell dispatches (`launcher-home`, `alpha-back`, `alpha-keyboard-visibility`). That is the real bridge boundary. | Move to `harness/nav.ts` (`home()`, `back()`, `keyboard(visible)`). | none |
| 3 | 59, 116-117, 183, 207, 231, 259 | T8 | `test.setTimeout` 120-180 s per test, several `expect.poll` timeouts of 30 s; restarts (`residentHome`) are the slow part. | Measure; share one booted page per describe where restart is not under test. | Low. |
| 4 | 34-38 | none | Reading draft slots from `harness(f=>f.slots)` is a fixture-boundary read. | Keep. | none |
| 5 | 330 | none | `conversationCount` reads `sessionStorage['resident-stub-agent']`, the stub's own store. Fine. | Keep via `stub()` helper. | none |
| 6 | whole file | T4 | Twin of `chat-continuity.spec.ts`. | This file is the survivor; carry the unique dev-lane cases listed in that file's report into this one. | none |

## Proposed end state
Becomes `journeys/chat.spec.ts` sections "draft continuity", "reply during navigation", "restart during send" and
"Stop and reconciliation", running in the `production` project on the shared harness. It absorbs the unique cases from
`chat-continuity.spec.ts` (offline/rate-limited create keeps text, Stop before post, confirmed cancel, assistant
surface shared draft, history paging), the notice collapse from `chat-system-notices*.spec.ts`, and the decline flow
from `chat-decline.production.spec.ts`.
