# specs/quint/application/SettingsSession.qnt
- Lines: 190 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Settings device facts and text size: generation-fenced reads, newest size request wins, an older applied size is held and shown when the newest fails. Duplicates: SettingsReads (device-facts fence, merge source). Callers/importers: No refinement harness; `test/quint-settings-session.test.mjs` (93 lines) + `test/fixtures/settings-model-traces.mjs` (runs Quint to generate traces).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test | T2/T10 | `test/quint-settings-session.test.mjs:13-22` slices `settings-adapter.ts` (`export function textScaleSettlement(` .. `/** Keep the reference settings components`, `  const showTextScale=` .. `  async function refresh() {`, `  async function refresh() {` .. `  p.componentDidMount = function`) and runs them in `vm`. | PORT with the same exported Settings read factory as SettingsCapabilityReads; harness in `refinement/application/settings-session.mjs`. | M |
| 2 | 107-110 | - | `BoundedCounters` encodes the step bounds as an invariant; fine. | None. | - |

## Proposed end state
- Keep; gains `resumeBehindViewTest` from SettingsReads; harness imports the exported factory.
