# test/browser/helpers/cloud-connection-notices.ts
- Lines: 29 | Kind: Playwright DOM observer (reads rendered plan/sign-in notices and hit-tests their buttons) | Verdict: **KEEP** (move to `harness/cloud.ts`)
- Covers: which Cloud plan/sign-in notices are visible, their bounds, and whether each button owns its own hit point. Duplicates: the hit-test idiom is repeated inline in `google-maps-raster.production.spec.ts:108,125` and elsewhere. Callers/importers: `native-cloud-subscription.spec.ts` and the live Quint harness `specs/quint/refinement/application/cloud-connection-notices.mjs` (imports it and lists it as a source pin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | D10 | `kind` derived from the aria-label suffix `' sign-in notice'` (label-string-driven). | Use a `data-notice-kind` attribute if the product has one; otherwise keep. | Low. |
| 2 | 16-24 | C3 | Point-ownership hit test duplicated in several specs. | Export `ownsHitPoint(locator)` from `harness/a11y.ts` and use it here. | none |

## Proposed end state
Moves unchanged in behaviour to `harness/cloud.ts`; the live Quint harness import path is updated in the same commit.
