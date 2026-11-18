# test/settings-text-scale-refresh.test.mjs
- Lines: 33 | Kind: transplant (slices exported `mergeDeviceFacts` by text) + source-text (regexes `++scaleGeneration`, `scaleAtRead = scaleVersion`) | Verdict: DELETE
- Covers: `mergeDeviceFacts` keeps the shown text size when a read overlapped a text-size change. Duplicates: `settings-refresh-text-scale.test.mjs` (same behaviour through `refresh()`), `test/browser/settings-device-facts.spec.ts:101`. Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T2 | Slices an exported function by text instead of importing it. | Delete. | Low |
| 2 | 27-33 | T1 | Regexes variable names and expressions in the adapter. | Delete. | Low |

## Proposed end state
File deleted; behaviour covered by the settings journey cases proposed in `settings-refresh-text-scale.test.mjs.md`.
