# test/browser/chat-system-notices.production.spec.ts
- Lines: 48 | Kind: Playwright, `production` project, real UI journey over `flag-off-android.ts` + `resident-stub.ts` | Verdict: **MERGE** into `journeys/chat.spec.ts` (notices step)
- Covers: four upstream escalation notices saved after an unanswered message are shown as one owner-facing "Agent error · Send again" and never the upstream text; a later reply retires it; one post, no unexpected bridge calls, no foreign network. Duplicates: the first test of `chat-system-notices.spec.ts` is the same journey on the remote kind; collapse rules also in `test/system-notice-collapse.test.mjs` (host unit test). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-7 | A8 | Evidence-boundary header and a pointer to the host test. | Drop. | none |
| 2 | 28-33 | none | Seeds notices into the resident stub's saved history in `sessionStorage`, then restarts: a fixture-boundary seed. | Keep through `stub.seedHistory()` in the harness. | none |
| 3 | 13-14 | C3 | `composer` and `conversation` locators are copied verbatim in `chat-continuity.production.spec.ts` and `chat-system-notices.spec.ts`. | Move to `harness/nav.ts`. | none |

## Proposed end state
One "notices collapse and retire" test in the chat journey, plus the combined-notice case carried from
`chat-system-notices.spec.ts`. Delete this file. Whether `test/system-notice-collapse.test.mjs` stays is that file's
reviewer's call; this journey covers the user-visible result.
