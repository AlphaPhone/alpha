# specs/quint/refinement/services/service-read-cache-replay.mjs
- Lines: 137 | Kind: Quint forward replay harness (imports and runs the real module) | Verdict: KEEP (SIMPLIFY)
- Covers: `ServiceReadCache.qnt` (live, `specs/quint/services/manifest.json:3553`) replayed step by step against the real `apps/app/src/runtime/service-read-cache-store.ts` + `service-read-cache.ts`, bundled through `inbox-workflows-model-traces.mjs` `sourceModule` with three specifier stubs (`@capacitor/core`, `native-connection`, `json-domain-document`). Duplicates: `test/service-read-cache.test.mjs:74` (entry bound, same as Case3); Case1/Case2 run twice (per-model `test/quint-service-read-cache.test.mjs` and the services aggregate through `forward-replays.mjs:22`). Callers/importers: `test/quint-service-read-cache.test.mjs`, `specs/quint/refinement/services/forward-replays.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 119-127 | T3/T4 | `runServiceReadCacheCase3` is not a model replay: it is a unit check of `MAX_ENTRIES=24` already asserted by `test/service-read-cache.test.mjs:74-78`. | Delete Case3 (keep the bound in whichever integration test survives `service-read-cache.test.mjs`). | Low |
| 2 | 107, 114, 121 | A7 | `{canaries=true}` parameter is accepted and never read. | Drop the parameter. | None |
| 3 | 10, 26 | C3/C6 | Re-implements the product's slot naming (`'connected-read-cache:v1:'+sha256(identity)`, `service-read-cache-store.ts:16`) with its own SHA-256 helper. A rename of the slot prefix breaks the harness silently-ish. | Have the store port record the slot names it is asked for (the fake `secureConnectionStore` already sees every slot) instead of recomputing them; drop `sha`. | Low |
| 4 | 4-5, 128 | B5 | Module-level `observedTraces/observedCheckpoints` counters and `recordComparedObservation` exist only to fill the strict-services receipt. | Remove with the receipt machinery (`check-traces`/`observed-replay` receipts); return nothing or the trace count. | Low |
| 5 | 16-23 | D3 | Import has side effects: installs `globalThis.alphaReadCachePort` and bundles at top-level await, so importing `forward-replays.mjs` builds this module even when the campaign is not selected. | Move port install and bundle into a lazy `load()` called by the run functions. | Low |
| 6 | 1-2 | A8 | Header "Existing source-executing MBT harness, shared by its original owning tests and the strict services receipt" is history, not description; import order is scrambled (`mock` before the comment, counters between imports). | One-line description; imports first. | None |
| 7 | 128 | T4 | `runServiceReadCacheReplay` re-runs Case1+Case2 for the aggregate. | Keep one entry (`runServiceReadCacheReplay`) driven by the single manifest-driven runner; delete per-case exports once `test/quint-service-read-cache.test.mjs` is merged. | Low |
| 8 | 90-104 | D8 | Dense one-line statements in `replay`. | Format (Prettier pass). | None |

## Proposed end state
~100 lines: one exported `replayServiceReadCache()` that runs the five named scenarios and 40 random walks against the
real store with a lazy-loaded bundle and an in-memory slot port that records slot names. No Case3, no canaries flag,
no receipt counters. Called once from the manifest-driven refinement runner (`test/quint/refinement.test.mjs`).
