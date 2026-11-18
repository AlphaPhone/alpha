# test/browser/home-compact-scroll.spec.ts
- Lines: 56 | Kind: Playwright layout spec (chromium) | Verdict: MERGE into `journeys/accessibility.spec.ts` (large-text Home case); drop test 1
- Covers: on a 360x640 Home the lower Settings tile and the attention card are reachable and open their views (light/dark); at 200% text the Home grid keeps three columns, reading order, and the last row clears the composer. Duplicates: test 1 overlaps `home-landscape.spec.ts` `reachable()` checks and `home-attention.spec.ts` (attention card opens Inbox); test 2 duplicates `accessibility-resilience.spec.ts` (launcher Home at 200%, per its own comment at 28-30). Callers/importers: chromium; imports `app-navigation` (`returnToApps`), `accessibility-states` (`setTextScale`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-8 | T4 / D8 | Test 1 is one 600-character line repeating reachability checks done elsewhere; theme loop adds nothing to reachability. | Delete. | Low |
| 2 | 41-42 | T6 | Inflates `[data-alpha-home-clearance]` height in the page to force scrolling ("model the bounded dock clearance"): the test manufactures the condition it checks. | Keep only the real-layout claims (3 columns at 200%, Home scroller fills the screen, last row above composer) without the injected clearance; the forced-scroll path is already covered in `accessibility-resilience`. | Low |
| 3 | 44 | T8 | `waitForTimeout(100)` after setting `scrollTop`. | Wait for a frame or poll. | Low |
| 4 | 28-30 | A8 | Comment cites a commit hash and PR number. | Remove. | — |

## Proposed end state
One case in `journeys/accessibility.spec.ts` › "Home at 200 % text keeps three columns and stays above the composer". File deleted.
