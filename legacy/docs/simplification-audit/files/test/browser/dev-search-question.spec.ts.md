# test/browser/dev-search-question.spec.ts
- Lines: 23 | Kind: Playwright, chromium; UI journeys (assistant composer from Files/Photos; Home Inbox attention card), with in-page reads of the development agent document | Verdict: MERGE case 1 into `journeys/chat.spec.ts`, case 2 into `journeys/home-shell.spec.ts`
- Covers: typing a question from Files/Photos fills an editable composer and nothing is sent until Send; the Home unread-Inbox card counts only visible unread mail and hides once read while the Inbox app stays. Duplicates: `dev-content-question.spec.ts`, `dev-image-question.spec.ts` (same ask-from-app pattern). Callers: chromium only. Helpers: `helpers/connection-diagnostics.ts` (`openConnectionDiagnostics`), `app-navigation.ts` (`returnToApps`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T7 | Loop over Files and Photos runs the same journey twice. | Keep one app (Photos) in the chat journey. | None. |
| 2 | 12-13 | T6, P2 | "Nothing sent" and "sent once" read `readDevelopmentAgent(developmentIdentity('local'))` through two `/src` imports and split on `'[USER MESSAGE]\n'` (an upstream prompt-format string, C6). | Assert the visible conversation (no user bubble before Send, one after). | Low. |
| 3 | 5 | P2 | Connection set up through `openConnectionDiagnostics` (backdoor: `connectionController.open()`). | Harness fixture "connected development profile". | None. |
| 4 | 16 | C1 | Simulator Inbox seed `alpha.dev.app.inbox` written inline. | Harness `seed.inbox()`. | None. |
| 5 | 15-23 | — | Home attention card: pure UI, good. | Carry to `journeys/home-shell.spec.ts`. | None. |

## Proposed end state
File deleted; two cases move: "composer question is editable and sent only on Send" (chat) and "Home Inbox attention reflects unread visible mail and hides when read" (home-shell).
