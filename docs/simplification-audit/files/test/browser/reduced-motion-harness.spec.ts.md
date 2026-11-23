# test/browser/reduced-motion-harness.spec.ts
- Lines: 30 | Kind: Playwright, chromium; test 1 tests Playwright configuration (T5); test 2 injects synthetic `.dot/.bar/.ring/.alpha-spinner` elements and samples computed styles | Verdict: **DELETE** test 1; **MERGE** test 2 into `journeys/accessibility.spec.ts`
- Covers: test 1 proves `contextOptions.reducedMotion` reaches the page (a harness check); test 2 proves that under reduced motion no infinite animation runs and the loading indicators hold still. Duplicates: the accessibility sweep runs with reduced motion and would fail on looping animation if it asserted it. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-15 | T5 | Test 1 checks that a Playwright option is honoured. That is the harness, not the product. | Delete; set `reducedMotion` once in the shared `test.extend` fixture. | none |
| 2 | 23 | T6-lite | Injects fake indicator elements into `.os` to test CSS rules. | Observe real indicators where reachable (typing dots in chat, sign-in spinner); keep the `document.getAnimations()` no-infinite-loop assertion over the whole page. | Low |
| 3 | 29 | T8 | Five `waitForTimeout(90)` samples. | Keep one `getAnimations()` check; drop the sampling loop. | none |

## Proposed end state
One step in `journeys/accessibility.spec.ts`: under reduced motion, `document.getAnimations()` shows no running infinite animation
on Home, chat (typing) and sign-in. File deleted.
