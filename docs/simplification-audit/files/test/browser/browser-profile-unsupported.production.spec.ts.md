# test/browser/browser-profile-unsupported.production.spec.ts
- Lines: 27 | Kind: Playwright spec, production project, 5 tests (4 loop + 1), UI-driven | Verdict: MERGE into `journeys/browser.spec.ts` (failure section, production)
- Covers: when `AlphaBrowser.create` fails because WebView lacks isolated profiles, an "Update WebView" status stays visible, on screen and tappable at 360/412 px; an unrelated failure shows no such notice; a missing Browser plugin reports "Unavailable" without the internal plugin name. Duplicates: none. Callers/importers: none; imports `flag-off-android.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16 | T8 | `waitForTimeout(4200)` to prove the notice does not auto-dismiss. | `page.clock.install()` + `runFor(4200)`. | Low. |
| 2 | 4-8 | C5 | Fourth in-file `AlphaBrowser` stub (failure variant). | Shared browser plugin stub with a `createError` option. | None. |
| 3 | 9 | T4 | Width × variant loop (4 boots); geometry only matters for the unsupported variant. | Two tests: unsupported at 360 px, unrelated error once. | None. |
| 4 | 16 | D8 | 500-character one-line test body. | Format. | None. |

## Proposed end state
Three steps in the browser journey (profile refusal explained, unrelated error distinct, missing plugin plain language), clock-based instead of a 4.2 s sleep.
