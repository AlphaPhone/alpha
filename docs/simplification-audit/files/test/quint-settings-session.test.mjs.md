# test/quint-settings-session.test.mjs
- Lines: 93 | Kind: Quint replay with inline transplant driver | Verdict: MERGE into `test/quint/refinement.test.mjs` after PORT
- Covers: SettingsSession traces against Settings device reads and text-size change/settlement/merge/unmount. Duplicates: Research "text scale quartet": `settings-refresh-text-scale`, `settings-text-scale-refresh`, `settings-text-scale-settlement` and `quint-native-text-scale-lifecycle` cover the same flow. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; imports `test/fixtures/settings-model-traces.mjs`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-27 | T2/T10 | Slices `settings-adapter.ts` at five anchors (`export function textScaleSettlement(`, `const showTextScale=`, `async function refresh() {`, `p.componentDidMount = function`, the unmount line) and vm-runs it with 15 fake globals. | PORT: export the text-scale/device-read controller from a settings module with a `device` port; import it. | Medium |
| 2 | 80-86 | keep | Reached-state checks (restored 1/2, keptSize, held) prove the campaign reaches the settlement cases. | Keep as manifest witness requirements. | Low |

## Proposed end state
- One Settings replay row; the three host text-scale slices are deleted (their chunk reports).
