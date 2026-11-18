# test/browser/use-in-email.production.spec.ts
- Lines: 260 | Kind: Playwright production (flag-off bundle), 6 tests; real UI end to end over `flag-off-android` (resident agent over the stubbed native bridge, synthetic Gmail at the native HTTP boundary); no renderer injection (s0 r41 clk) | Verdict: KEEP as the basis of `journeys/inbox.spec.ts` ("use in email")
- Covers: a resident agent reply is reviewed and inserted into a local reply draft for the selected email, with nothing prepared or sent; an edited draft under an open review is refused and the refreshed review only appends; a Gmail account change during review refuses insertion under either account; a pending send review is discarded after a suggestion is added, and only the newly reviewed request is dispatched once; outside Inbox there is no "Use in email"; reopening the conversation retires an earlier close animation. Duplicates: `use-in-email.spec.ts` (dev twin), `file-email.spec.ts`, `use-in-email-review.test.mjs` (host). Callers/importers: production project; imports `./flag-off-android`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53, 103, 138, 174, 220 | T8 | `test.setTimeout(120_000–150_000)` on five tests; `click({timeout:30_000})`, `toHaveCount(1,{timeout:20_000})`. Symptom of slow resident boot per test. | Share one booted resident page per describe where state allows (serial mode), or speed `residentHome`. | Low |
| 2 | 124 | P3 | Changes the draft under the review by calling the native `value` setter on the inert textarea. Justified (simulates a late dictation) and commented. | Keep. | None |
| 3 | 238-260 | — | The close-animation case is a chat-sheet behaviour, not mail. | Move to `journeys/chat.spec.ts` (production section). | None |
| 4 | 25 | — | `drafts()` scans the Keystore stub for text: acceptable evidence that a draft was stored locally. | Keep via harness accessor. | None |

## Proposed end state
Becomes the "use in email" section of `journeys/inbox.spec.ts` (production project) with the five mail cases unchanged, plus the unique cases carried from `use-in-email.spec.ts` (reply to own message names no recipient and system Back closes only the review; full-height launcher conversation keeps the review below the status bar and names an off-screen draft). The animation case moves to the chat journey. Same assertions, shorter timeouts once resident boot is shared.
