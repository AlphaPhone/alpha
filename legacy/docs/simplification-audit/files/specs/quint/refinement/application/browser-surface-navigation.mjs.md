# specs/quint/refinement/application/browser-surface-navigation.mjs
- Lines: 61 | Kind: Quint ITF replay driver (bundles real `apps/app/src/browser/browser-surface.ts`, one stub for `./preference-documents`) | Verdict: KEEP
- Covers: web `BrowserSurface` iframe navigation: retired frame loads ignored, Stop never commits, inner-navigation block, history commands, closed tab ignores loads, against `BrowserSurfaceNavigation.qnt`. Duplicates: none (Playwright browser specs drive the native surface, not the web iframe double). Callers/importers: `test/quint-browser-surface-navigation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17 | — | Real import; one environmental stub. Target shape. | Keep. | — |
| 2 | 40 | D10 | Maps error strings `'Stopped'`, `'Page blocked'` to model values; label-driven. | If the surface adopts error codes, map codes. | L |
| 3 | 8 | C5 | Shared trace module merge. | Follow. | L |

## Proposed end state
Unchanged except the shared helper import.
