# test/browser/dev-content-question.spec.ts
- Lines: 20 (2 tests) | Kind: Playwright `chromium`, dev build; 1 UI journey, 1 module-in-page test | Verdict: **MERGE** into `journeys/files.spec.ts` (1 case)
- Covers: Files → open a text file → Ask Alpha → review the exact excerpt → Cancel → edit excerpt and question → Use in conversation composes without sending → Send stores exactly that message; the review bounds excerpts at 12,000 characters and refuses a retired selection. Duplicates: `dev-files.spec.ts:33-44` (Ask Alpha source link and too-large file), `content-review-layout.spec.ts`. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-15 | — | Real journey. | Carry. | none |
| 2 | 6 | P2 | Seeds the file with `registerPlugin('AlphaFiles').importFile`. | Import through the Files UI (file chooser). | Low |
| 3 | 13-14 | T6 | Reads `development-agent-document.ts` to prove nothing was sent, then the stored messages after Send. | Assert the conversation: no user bubble before Send, one after, and the development reply. | Low |
| 4 | 16-20 | T6 | Calls `reviewContentQuestion` directly with a fake `compose`. | Delete. | Low: the 12,000-character excerpt bound has no other test. |

## Proposed end state
One case in the Files journey ("ask about a file"): open, Ask Alpha, Cancel, edit excerpt and question, Use in conversation, check the composer text, Send, see the user message and reply. Merge with the `dev-files` Ask Alpha cases into one describe. Delete the file.
