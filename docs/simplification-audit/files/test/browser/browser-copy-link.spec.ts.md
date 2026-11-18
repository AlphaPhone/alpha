# test/browser/browser-copy-link.spec.ts
- Lines: 49 | Kind: Playwright spec, chromium, 6 tests (3 loop), real UI on routed pages | Verdict: MERGE into `journeys/browser.spec.ts`
- Covers: Copy link copies the committed page after Back, not the address draft; address editing offers local visits without network suggestions and has URL keyboard hints; `@`-containing input is searched, not navigated; slow loads show progress and Stop. Duplicates: Stop/progress also in `browser-navigation.spec.ts` test 4. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-49 | T4 | Slow-load Stop duplicates `browser-navigation.spec.ts:43-55`. | Keep one (this one is smaller). | None. |
| 2 | 37-42 | T7 | Three full boots for three query strings. | One test looping over queries in the same page. | None. |
| 3 | 7 | ok | Clipboard stubbed at the browser API boundary. | Keep. | None. |

## Proposed end state
Steps in the browsing section of `journeys/browser.spec.ts`: copy link after Back, address hints + local suggestions, `@` queries search, slow load progress/Stop. File deleted.
