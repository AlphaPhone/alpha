# test/browser/chat-reply-announcement.spec.ts
- Lines: 33 | Kind: Playwright, `chromium` project; replaces `alphaClient.send` and `Component.prototype.connectAgent`, passes the reply function into the page with `new Function(source)` (P3, T6) | Verdict: **MERGE** into `journeys/chat.spec.ts` (accessibility steps)
- Covers: the polite `role=status` reply announcer says "Alpha is replying" once while a reply streams and the settled reply once; a whole reply after Send is announced once; composer focus is kept. Duplicates: `own-provider.production.spec.ts:226-227` asserts the announcer's stopped notice. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | P3, T6 | `alphaClient.send` replaced in-page; `new Function('return '+source)` rebuilds a test closure inside the page. | Use the resident stub's held stream (`setStub({stream:'hold'})`, `release()`), which streams partial text through the real path. | Low. |
| 2 | 9-12 | P2 | Opens Settings only to force a render that captures the shell. | Unneeded after #1. | none |
| 3 | 12 | none | A `MutationObserver` on `[data-alpha-reply-announcer]` recording what was announced is a fair way to check "announced once". | Keep as `harness/a11y.ts` `recordAnnouncements(locator)`. | none |
| 4 | 20, 22, 31 | T8 | `waitForTimeout(100/200)` to prove nothing else was announced. | Use two animation frames or `expectNothingFor` from `harness/time.ts`. | Low. |

## Proposed end state
Two assertions in the chat journey's streaming test: announcements are exactly ["Alpha is replying", final text], and
focus stays on the composer. Delete this file.
