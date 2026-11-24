# test/browser/operation-review-accessibility.spec.ts
- Lines: 18 | Kind: Playwright, chromium; module-in-page (constructs `BrowserReviews` from `/src/browser/review.ts` and calls `confirm()` directly), then keyboard/layout checks on the dialog | Verdict: REWRITE as one case in `journeys/accessibility.spec.ts` and one in `journeys/settings.spec.ts`
- Covers: the operation-review dialog fits 360 px at 150 % text in light/dark, scrolls long content, has 44 px targets and restores focus on Cancel; it cancels on `pagehide`, `alpha:device-state`, `alpha-back`; it cannot approve after its owner, abort signal or `cancelAll` changes. Duplicates: feature reviews (photos delete, calendar, settings) render the same dialog through UI. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 7, 10-12 | T6 | Every test calls `new BrowserReviews().confirm(...)` in page and reads the result from `window`; text scale set via `BrowserDevice.prototype.setTextScale`. No user action opens the review. | Open a real review (Settings → Privacy "Clear history?", the text used at l.12); set text size through Settings → Display. | Low. |
| 2 | 3-5, 7 | D8 | Two lines of ~1,000 characters with a dozen statements. | Split while rewriting. | None. |
| 3 | 2 | T7 | 4 variants (2 themes × 2 heights). | Dark at 360×360 only. | Low. |
| 4 | 9-18 | T3 | Owner/abort/`cancelAll` cases test `confirm()` options only internal callers pass. | One reachable variant: leave Settings while the review is open; returning cannot approve. | Low. |
| 5 | 7 | T7 | Three cancel events as three tests. | One loop. | None. |

## Proposed end state
Accessibility journey: open "Clear history?" at 150 % text, 360×360, dark; both buttons in viewport, 44 px targets, long details scroll by keyboard, Cancel restores focus. Settings journey: Back, device-state and pagehide each close it without clearing. No `/src` import; delete this file.
