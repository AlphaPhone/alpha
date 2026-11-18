# specs/quint/refinement/services/core-runtime/turns.mjs
- Lines: 224 | Kind: Quint refinement harness (runs the real, product-patched `TurnControllerRegistry` with real `AsyncLocalStorage`) | Verdict: KEEP (models a file the product patches: `TURN_STATE_TARGET` in `scripts/core-state-patch.ts`)
- Covers: per-registry turn signals, same-room/out-of-band cancellation, shutdown across rooms, nested runtimes' independent contexts, closed-registry admission, telemetry listener isolation — against `CoreTurnControllers.qnt`. Duplicates: `test/core-runtime-transform.test.mjs` (asserts two registries do not share signals — a subset of "empty peer registry has no inherited signal"; DELETE that test). Callers/importers: `test/quint-core-turns.test.mjs` (also runs a state-field inventory check), `refinement/services/index.mjs:36` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-40 | T10-lite | Reads `registry.active`, `listeners`, `closedReason` (patched internals). Breaks only on a core-patch change, which is the point. | Accept. | Low |
| 2 | 6-7, 220-224 | C3 / T9 | Local `action`/`flush`; unused CLI tail. | Shared support; delete tail. | None |
| 3 | whole | CI | Changes only with `core-state-patch.ts`/pin. | Same upstream-pin lane as the other core-runtime harnesses. | Low |

## Proposed end state
~210 lines; keep all 17 schedules; one caller; run on pin/patch changes.
