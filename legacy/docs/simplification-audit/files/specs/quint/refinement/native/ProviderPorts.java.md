# specs/quint/refinement/native/ProviderPorts.java
- Lines: 14 | Kind: Quint refinement support (static ports for the indicator-lease provider: caller identity, signing, owners, uid, clock, boot id, counters) | Verdict: KEEP
- Covers: external inputs for `NativeIndicatorProvider` (upstream-only model). Duplicates: none.
- Callers/importers: `IndicatorProviderTraces.java`, `IndicatorProviderProbe.java`, `indicator-provider.mjs`, `indicator-provider-platform.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 | Supports an upstream-only model. | Moves with its harness into the upstream-change lane. | None |

## Proposed end state
Unchanged; lives and dies with `IndicatorProviderTraces.java`.
