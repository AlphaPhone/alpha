# specs/quint/native/NativeListenerService.qnt
- Lines: 98 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (D7; upstream lane)
- Covers: whole listener service lifecycle: destroy retires callbacks and executor, an unreleased AudioRecord keeps the durable marker, failed durable marker cannot arm recognition, late engine load is closed. Duplicates: research §2.9 names it as an upstream-only model; no twin in the consumer. Callers/importers: `native/manifest.json` (7 tests, 5 invariants, no `bounds`), harness `refinement/native/listener-service.mjs` + `listener-service-platform.mjs` (`ListenerServiceProbe.java`); `test/quint-listener-service.test.mjs` (39 lines); native aggregate; README `:391`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Six sources, all upstream `sense/*.java`. | Upstream-pin lane; upstream move listed as D14 follow-up. | L |
| 2 | harness | - | No text slicing; platform supplies ports only. `AlphaListenerPlugin.java` was deleted in stage A and is not referenced by this model or harness (`git grep` clean). | None. | - |
| 3 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged; upstream-pin lane.
