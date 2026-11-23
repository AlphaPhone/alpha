# test/browser/browser-chat-overlay.spec.ts
- Lines: 99 | Kind: Playwright spec, chromium, 2 tests; real UI and geometry on a routed test page | Verdict: MERGE into `journeys/browser.spec.ts`
- Covers: pulling, opening and expanding the chat sheet over a website does not resize, reload, scroll or hide the page, and touch reaches the page after collapse; leaving and reopening Browser keeps the page without reload. Duplicates: none found for the overlay geometry. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61, 66, 76, 83 | T8 | `waitForTimeout(120/600)` ×4 to let animations settle. | Use `helpers/settled.ts` or `expect.poll` on geometry equality (already used at :34). | Low. |
| 2 | 34 | ok | Geometry-stability poll is the right pattern. | Reuse it for the waits above. | None. |
| 3 | 9 | P13 | Routes an external URL; the network fence is per spec. | Harness fence. | None. |

## Proposed end state
Both tests become steps of the browsing journey in `journeys/browser.spec.ts`, waits replaced by the stability poll. Runs on the dev project only if the production Browser plugin stub cannot host an iframe page; otherwise production.
