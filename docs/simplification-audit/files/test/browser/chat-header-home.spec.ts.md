# test/browser/chat-header-home.spec.ts
- Lines: 10 | Kind: Playwright, `chromium` project; patches `Component.prototype.renderVals` to capture the shell, sets chat state with `setState`, attaches a held transport through `alphaClient.attachVerifiedTransport` (T6, P3) | Verdict: **REWRITE** as a step in `journeys/chat.spec.ts`
- Covers: the chat header's Go Home (sheet and full) returns Home with the input detent and aborts the foreground request; app Back returns Home with the input detent; the compact pill has no Go Home. Duplicates: Go Home also in `assistant-surface-close.spec.ts`, `message-actions.spec.ts`, `standalone-shell.spec.ts`; HOME-from-another-app-is-a-Stop in `chat-continuity.production.spec.ts:439`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P3, P2 | Captures the shell through a prototype patch, closes the connection dialog through `connectionController`, then forces `chat:'sheet'|'full'|'hidden'` with `setState`. | Reach the detents through controls (Open conversation, Expand chat, Minimize chat). | Low. |
| 2 | 7 | T6 | The held request is attached below the shell with `attachVerifiedTransport`; cancellation is read from the fake transport's signal. | On the production harness use `setStub({stream:'hold'})`, press Go Home and assert the resident stub recorded the abort and the conversation shows the stop notice. | Low. |
| 3 | 2-10 | D8 | Whole file is four minified lines. | Rewrite on move. | none |

## Proposed end state
One test in `journeys/chat.spec.ts`: with a reply held, Go Home from sheet and from full returns Home, the composer is
back in its input detent and the reply is stopped once; app Back returns Home; the compact pill offers no Go Home.
Delete this file.
