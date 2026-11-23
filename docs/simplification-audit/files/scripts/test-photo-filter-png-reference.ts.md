# scripts/test-photo-filter-png-reference.ts
- Lines: 40 | Kind: generator (renders CSS photo filters in Chromium on a canonical PNG chart and writes expected pixels), named as a test | Verdict: KEEP, MOVE/rename to `scripts/generate-photo-filter-goldens.ts`
- Covers: produces `android/app/src/androidTest/assets/photo-filter-goldens.json` consumed by `PhotoFilterInstrumentedTest` (native filters must match browser CSS). Duplicates: none. Callers/importers: nobody runs it (no npm script, workflow or test); only named as `"source"` inside `photo-filter-goldens.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | name | D11/T9 | A generator in the `test-*` namespace; the goldens it feeds are copied by hand from `test-results/` into the Android asset. | Rename; write directly to the asset path behind `--write`; add npm `generate:photo-filter-goldens`. Update the JSON's `source` field. | Low |
| 2 | 5-8 | - | Requires `ALPHA_BROWSER_MODULES` to resolve Playwright/pngjs. | Resolve from the repo's own `node_modules`. | None |
| 3 | 38 | D8 | 1,000-character line computing five maxima. | Split into named steps. | None |
| 4 | 38 | B5 | `noIntermediateClampMax`, `premultipliedMax` are recorded but only `opaqueMax` and `premultipliedStorageMax` are asserted. | Drop unread metrics from the summary. | None |

## Proposed end state
`scripts/generate-photo-filter-goldens.ts` (~35 lines), writes the asset itself, invoked by an npm script when filters change.
