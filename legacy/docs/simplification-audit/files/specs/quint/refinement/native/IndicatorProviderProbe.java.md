# specs/quint/refinement/native/IndicatorProviderProbe.java
- Lines: 39 | Kind: race regression probe on vendored upstream `IndicatorLeaseProvider` (staged with local patch `indicator-provider-generation.patch`) | Verdict: KEEP (upstream candidate)
- Covers: two concurrent `ACQUIRE` calls blocked on the provider monitor must leave the linked death recipient bound to the current lease generation, and restore Binder calling identity. Not reachable by the trace campaign (which is serial). Duplicates: none. Callers/importers: `indicator-provider.mjs` `probeIndicatorProvider()`, used by `test/quint-indicator-provider.test.mjs` test 2.
- Model: supports `NativeIndicatorProvider` (live manifest entry, sources only `vendor/eliza/.../sense/*` + `android/sense/build.gradle`). The always-on listener is a PRD-planned feature kept by D7.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | C3 | `generation(recipient)` duplicates `IndicatorProviderTraces.capturedGeneration` (reflect first `long` field of the recipient). | Move to one static helper in `IndicatorProviderTraces` (or `Trace`). | low |
| 2 | 28-34 | — | 32 attempts with both threads proven BLOCKED before release; asserts `mismatches == 0` in the test. Deterministic enough; no sleeps beyond 1 ms polling. | Keep. | — |
| 3 | — | P6 / AGENTS.md | Tests a fix carried as a local patch on upstream code. AGENTS.md says shared changes go upstream. | Owner/upstream follow-up: move this regression next to `IndicatorLeaseProvider` upstream when the patch is upstreamed; until then gate on `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`. | low |

## Proposed end state
Stays as the only concurrent regression for the provider; shares the generation-reading helper with the trace harness; runs only when upstream pin or native patches change.
