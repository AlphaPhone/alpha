# test/browser/fixture-images.spec.ts
- Lines: 25 | Kind: Playwright, chromium, mock mode (`?mode=mock&start=…`). A smoke check of the dev fixture surface; no user action, one `waitForTimeout(500)` | Verdict: **MERGE into `journeys/dev-surface.spec.ts`**
- Covers: in mock mode, the Photos, Browser and Camera screens reference `/fixtures/img/*.webp` backgrounds that load and decode with a non-zero width, and no page errors occur. Duplicates: `design.spec.ts`, `mvp.spec.ts` and `native-mock-chrome.spec.ts` also boot mock mode with the banner. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T8 | A fixed `waitForTimeout(500)` before scanning. | Wait for at least one fixture background URL to be present (`expect.poll`). | none |
| 2 | 13-15 | D6 | The test scans computed styles of every `[data-screen] *` element for a hard-coded `/fixtures/img/` path. When fixtures move to `dev/fixtures/` (U-R1), the regex must change. | Read the path from the one dev fixture module constant, or match `/\.webp/` within mock mode. | Low |
| 3 | 5 | T7 | The 3-start loop is cheap and covers three different fixture consumers. | Keep it as a loop inside one test. | none |

## Proposed end state
One "mock mode decodes its fixture photography" test in `journeys/dev-surface.spec.ts` (the dev-only smoke file,
which runs only in the chromium dev project), with a condition wait and no sleep.
