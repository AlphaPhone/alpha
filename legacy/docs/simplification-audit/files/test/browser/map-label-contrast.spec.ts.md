# test/browser/map-label-contrast.spec.ts
- Lines: 18 | Kind: unit test in a browser (T6): imports `resolveMapColors` from `/src/maps/map-plane.ts` and checks the WCAG ratio of two CSS tokens; project `chromium`, 6 tests (2 themes x 3 mock deep links) | Verdict: **DELETE**
- Covers: the contrast ratio of `--alpha-map-<theme>-label` on `--alpha-map-<theme>-land`. That is a property of two constants; the three start states (`maps`, `maps:route`, `maps:nav`) resolve the same tokens, so 4 of 6 tests repeat the same numbers. Duplicates: contrast maths duplicated in `camera-overlay-contrast.spec.ts:8-12` and `accessibility-audit.ts` (research C3). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-16 | T6 / T1-like | Never looks at rendered MapLibre labels; it resolves CSS variables through a product function and computes luminance by hand. | Delete. If token contrast must be guarded, add the map label/halo pair to one data-driven token-contrast check in `harness/a11y.ts`. | Low: a palette change could drop below 4.5:1 unnoticed until the a11y sweep |
| 2 | 5 | T4 | `start=maps:route` and `start=maps:nav` exercise nothing different. | n/a (deleted). | none |
| 3 | 2-4 | A8 | Comment narrates a removed DOM mock map and a commit hash. | n/a. | none |

## Proposed end state
File deleted. The map label/halo token pair is listed in the a11y harness's token-contrast table (one line), next to the
other palette pairs, using the one luminance helper.
