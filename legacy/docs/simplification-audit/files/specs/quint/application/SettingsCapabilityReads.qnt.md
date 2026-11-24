# specs/quint/application/SettingsCapabilityReads.qnt
- Lines: 119 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model (merge target) / PORT harness
- Covers: Settings capability (Gmail authorization) read: newest wins, 10 s limit ends checking, session change restarts, hidden Settings reads nothing, licences load once. Duplicates: `SettingsReads.qnt` models the same capability read, limit and licence load (`licensesLoadOnceTest` exists in both, :116 here, :148 there); `SettingsSession.qnt` has the same `supersededReadIsDroppedTest`/`unmountRetiresReadTest` names for device facts. Callers/importers: No refinement harness; `test/quint-settings-capability-reads.test.mjs` (95 lines) replays traces.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | - | C5/T4 | Two models of one capability read (this and SettingsReads). | Make this the single capability-read model; absorb SettingsReads' `capabilityLimitTest` (late answer after expiry stays not-verified), `hiddenAccountChangeTest` (`NoHiddenDiscovery`), `backAfterHiddenResetTest`. | M |
| 2 | test | T2/T10 | `test/quint-settings-capability-reads.test.mjs:13-26` slices `prototype/settings-adapter.ts` (`let licenses: {` .. `/** Native reset results that only echo`, `  async function refreshCapabilities(enteringSettings=false) {` .. `  /** Explicit, confirmed disconnect`, and the unmount line) and runs it in `vm`. | PORT: extract the capability/licence read state from `settings-adapter.ts` into an exported factory (e.g. `createSettingsReads({accounts, licenses, timer})`), add `refinement/application/settings-reads.mjs` that bundles it, register in `index.mjs`. | M |
| 3 | manifest | T10 | Symbol pins include code fragments (`async function refreshCapabilities`, `licenses.status`). | File pins only. | L |

## Proposed end state
- Single Settings capability-read model, absorbing SettingsReads.
- Import-based harness over an exported read factory; transplant test deleted.
