# test/browser/native-mock-chrome.spec.ts
- Lines: 12 | Kind: Playwright dev mock-mode layout checks; project `chromium`, 4 tests | Verdict: **MERGE** into `journeys/dev-surface.spec.ts` (mock chrome block)
- Covers: Android mock mode uses native system chrome only (no web status bar or Home button), reserves the mock banner below the native top inset across views and widths, pauses live background work, and exits; browser mock keeps reference chrome; mock lock screen chrome per platform. Duplicates: `mvp.spec.ts` "Mock is explicit, its banner does not cover the phone" (T4). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | brittle | The status bar is found by inline style (`height: 44px` + `pointer-events: none`). | Add or use a data attribute on the reference status bar. | Low (product change in dev chrome only) |
| 2 | 2 | C3 | Inline catch-all bridge. | Shared bridge preset. | none |
| 3 | 2-12 | D8 | Each test on one line. | Format on move. | none |
| 4 | 6 | — | Asserts `pauseNotificationCollection` and `disableBackground` calls, which duplicates `mock-background-admission.spec.ts`. | Drop that assertion here. | none |

## Proposed end state
Three tests in `journeys/dev-surface.spec.ts`: Android mock chrome and banner across views/widths, browser mock chrome,
and lock screen chrome per platform. They replace the duplicate banner case in `mvp.spec.ts`.
