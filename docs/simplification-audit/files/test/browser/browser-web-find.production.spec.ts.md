# test/browser/browser-web-find.production.spec.ts
- Lines: 46 | Kind: Playwright, production project (flag-off bundle), 1 test; real UI (s0 r13, 1 sleep) | Verdict: MERGE into `journeys/browser.spec.ts` (production describe)
- Covers: the web Browser menu does not offer Find in page, Reload still works, no "not implemented" toast, no page errors, no foreign requests. Duplicates: `accessibility-resilience.spec.ts` also references "Find in page". Callers/importers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-17, 44-45 | T7 / C4 | Foreign-request trap and pageerror collector hand-written; same pattern in many production specs. | Harness fixture `noForeignRequests` / `noPageErrors` (auto). | None |
| 2 | 22-25 | P2 | MutationObserver on `[data-alpha-toast]` installed via evaluate to collect toasts. | `expect(page.getByText(/not implemented/i)).toHaveCount(0)` (already line 43) is enough; drop the observer. | Low |
| 3 | 40 | T8 | `waitForTimeout(300)`. | Remove with #2. | None |
| 4 | 2-7 | A8 | Comment narrates history ("it used to, and failed…") and an "evidence boundary" note. | One-line comment of the rule. | None |

## Proposed end state
One case in the production section of `journeys/browser.spec.ts`: open a routed page, open Menu, Find in page absent, Reload works, no error toast. About 10 lines using shared fixtures. Delete this file.
