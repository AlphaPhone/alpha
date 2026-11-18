# specs/quint/legacy/core/check-interactive-task-refinement.mjs
- Lines: 121 | Kind: script (standalone historical graph comparison + upstream Vitest bodies) | Verdict: DELETE
- Covers: re-runs TLC on the compiled `CoreInteractiveTask` model, compares the state graph with the historical upstream `InteractiveTask.reducer.graph.json`, then runs upstream `interactive-task-conformance.test.ts` with a fake Vitest shim. Duplicates: `check-interactive-task-traces.mjs` (same reducer, current source). Callers/importers: none executable; mentioned only in `legacy/core/README.md:57` and `interactive-task-source-traces.md:9`. No package.json script, workflow or test runs it. Requires a prior `check-configurations.mjs --phase=temporal` receipt, which nothing produces.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T9 | Dead: no caller, depends on another dead runner's output. | Delete. | None. |
| 2 | 46-62 | T5 | Re-runs upstream's own test suite through a hand-made Vitest shim. | Gone. | None. |
| 3 | 13-17 | C3 | Another arg parser. | Gone. | None. |
| 4 | 63-73, 112-117 | B5 | Hash-before/hash-after provenance and receipt. | Gone. | None. |

## Proposed end state
Deleted, together with `interactive-task-source-traces.md` (prose about it).
