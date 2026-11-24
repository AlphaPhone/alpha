# test/browser/digest-summary.spec.ts
- Lines: 22 | Kind: Playwright, chromium, dev simulator. 4 looped tests (theme × kind) seed a result by writing the dev `localStorage` key and dispatching `alpha:hosted-digests` (P2). 1 test is a pure function call to `digestSummaryText` in the page (T6) | Verdict: **MERGE into `journeys/digests.production.spec.ts`** (1 case), rest deleted
- Covers: how a finished digest result renders. For a native (phone-source) result: readable summary only, with the "Phone sources read" and "permission expires" icons, a local expiry time, and no raw steps, ISO timestamps or JSON, before and after reload. For a snapshot result: an "Execution details" disclosure with raw output (dev only). The last test covers `digestSummaryText` run-identity checks, full-text retention and error-first rendering. Duplicates: `digestSummaryText` is also exercised by `test/digest-occurrence-delivery.test.mjs`, `test/hosted-notice-question.test.mjs` and `test/source-renewal-question.test.mjs` (host side). Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | T6 / T3 | A pure function table (`long`, `other`, `many`, `error`, `legacy`, `plain`) is asserted through `page.evaluate(import('/src/runtime/hosted-digests.ts'))`. | Delete. Host tests already import it. | none |
| 2 | 22 | A1 | The `legacy` case (`output:{summary,source}` → "Legacy summary") pins an old agent output shape. | Owner question: if the pinned agent no longer emits it, delete the branch in `digestSummaryText` too (D1 for wire formats is not decided; see Q-LEG-11). | Low |
| 3 | 3 | T7 | The theme loop doubles runs. Contrast and theme are covered by the accessibility sweep. | Drop the theme loop. | none |
| 4 | 13-17 | D6 | The snapshot branch asserts the dev-only raw `pre` output ("a development surface only"). | Delete. That surface moves to `dev/`. | none |
| 5 | 9-12, 19 | coverage | The native-result privacy rendering (no `details`, no raw step text, no ISO timestamps, a local expiry display, surviving reload) is a real product rule. | Carry one test to `journeys/digests.production.spec.ts`: put a result in the flag-off harness `produced.results` / `inbox`, open Scheduled digests, assert the same. | Medium. This is the only check that raw source text never renders in production. |
| 6 | 6 | P2 | The test writes `alpha.browser.digests.local.v1` directly and dispatches `alpha:hosted-digests` to open the panel. | Use `openRetainedDigests` in the production lane. | none |

## Proposed end state
Delete the file. `journeys/digests.production.spec.ts` gains "a phone-source brief shows only its readable summary
and expiry, before and after restart", seeded through the harness's agent result store.
