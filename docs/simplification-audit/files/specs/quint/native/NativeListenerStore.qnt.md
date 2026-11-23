# specs/quint/native/NativeListenerStore.qnt
- Lines: 142 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (D7; upstream lane)
- Covers: device-protected listener settings: failed commit latches the store closed, consent needs the current process, reset needs fresh consent, crash-loop breaker trips on the third unclean start and keeps the eight newest exits. Duplicates: none. Callers/importers: `native/manifest.json` (7 tests, 3 invariants, no `bounds`), harness `refinement/native/listener-store.mjs` + `listener-store-platform.mjs`; `test/quint-listener-store.test.mjs`; native aggregate; README `:374`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Four sources, all upstream `sense/*.java`. | Upstream-pin lane. | L |
| 2 | 23-30 | - | `save` partitions write results into four classes (success, memory failure, early throw, durable throw): the real failure modes; good. | None. | - |
| 3 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged; upstream-pin lane.
