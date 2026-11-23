# test/settings-text-scale-settlement.test.mjs
- Lines: 63 | Kind: transplant (slices exported `textScaleSettlement` by text) + source-text (regexes call sites) | Verdict: DELETE
- Covers: Text-size result ordering: newest wins, an older applied size is shown when the newest fails, older failures are silent. Duplicates: `settings-refresh-text-scale.test.mjs` runs the same settlement through `changeTextScale`; journey case proposed there. Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T2 | Text slice of an exported pure function bounded by a JSDoc comment. | Delete. | Low |
| 2 | 15-54 | T3 | Unit cases of a 20-line reorder table; the user-visible outcome is one journey case. | Delete. | Low |
| 3 | 56-63 | T1 | Regexes `void changeTextScale(requested,api)` and statement text. | Delete. | Low |

## Proposed end state
File deleted.
