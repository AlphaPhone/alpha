# specs/quint/refinement/native/indicator-provider.mjs
- Lines: 28 | Kind: Quint refinement driver (staged patched upstream `IndicatorLeaseProvider` + upstream `IndicatorLease`, `ListenerPolicy`) | Verdict: KEEP
- Covers: listener indicator lease endpoint: replace/unlink/revoke/expiry, caller permission/signature/uid denials, report classes (27 scenarios); model `NativeIndicatorProvider` (native manifest, live). Always-on listening is PRD-planned (D7). Duplicates: `ListenerLeaseRecovery` in `ComponentTraces` covers `IndicatorLease` alone. Callers/importers: `test/quint-indicator-provider.test.mjs` (also uses `probeIndicatorProvider` for a race regression), native aggregate `index.mjs:29,190` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C6 | Redefines the `sense` path that `java.mjs` exports. | Import it. | None |
| 2 | — | P6 | All compiled code is upstream (`vendor/eliza/.../sense`) or staged patches. | Path-filter to `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, model, folder. | None |
| 3 | — | T4 | Aggregate duplicate. | Aggregate goes. | None |
| 4 | 15, 19 | — | Good: one compile, `campaign` mode runs all scenarios. | Keep. | — |

## Proposed end state
Unchanged campaign; one runner; path filter on the upstream pin and patches.
