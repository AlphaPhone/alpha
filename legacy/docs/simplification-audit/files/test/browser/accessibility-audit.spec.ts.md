# test/browser/accessibility-audit.spec.ts
- Lines: 357 | Kind: Playwright, test of the test helper (T5) run through `page.setContent` | Verdict: **DELETE**
- Covers: that each rule in `accessibility-audit.ts` fires on seeded bad markup and stays quiet on fixed markup. It covers no product behaviour. Duplicates: none. Callers/importers: none. The `chromium` project runs it (14 tests, all `setContent`, a few seconds in total).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-357 | T5 | All 14 tests load hand-written HTML with `setContent` and check the output of `auditTree`, `auditPage`, `auditTabOrder` and `auditReadingOrder`. The product is never loaded. This is a unit test of an 806-line test helper. | Delete the file. | Medium. With no self-test, a rule that breaks silently (for example one that always returns `[]`) makes the sweep pass vacuously. See the owner question in the chunk summary. |
| 2 | 43-44, 67-69, 207, 300 | A8 | Comments that tell history ("The Home composer before the fix", "The round-7 Home card", "Round 10"). | Deleted together with the file. | none |
| 3 | 284-298 | D8 | Two tests use a minified style (`async({page})=>{`, several statements per line) that differs from the rest of the file. | Deleted together with the file. | none |
| 4 | 6-8 | C3 | Local `page_`, `rules` and `load` helpers. Nothing outside this file uses them. | Deleted together with the file. | none |

## Proposed end state
Delete the file. If the owner wants the rules guarded (see the owner question in the chunk summary), keep no more than one
canary per rule family as a single `harness/a11y.selftest.ts`. That file should hold one known-bad page per family (names,
contrast, clipping, tab order, dock, reading order), outside the e2e journey lane, and should run only when
`test/browser/harness/a11y.ts` changes. Swapping the hand-written rules for `@axe-core/playwright` (also an owner question)
would remove the need for a self-test for names, contrast and ARIA references.
