# specs/quint/legacy/core/check-interactive-task-traces.mjs
- Lines: 277 | Kind: Quint refinement harness (legacy model, imports and runs the real upstream module) | Verdict: DELETE
- Covers: drives upstream pure reducer `createInteractiveTask` / `transitionInteractiveTask` (`packages/core/src/messaging/interactive-task.ts`) through 5 traces against `legacy/CoreInteractiveTask.qnt`, and asserts a deliberate mismatch (trusted rebind state absent from the historical graph). Duplicates: upstream's own `interactive-task-conformance.test.ts` and `interactive-task-rebind.test.ts`, which it lists as inputs. Callers/importers: `specs/quint/refinement/legacy/index.mjs:15`, `test/quint-core-interactive-task-traces.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | §2.9, T5 | Upstream-only reducer (not a `CORE_STATE_TARGETS` patch); upstream already has conformance tests over the same graph. | Delete. | None for product code. |
| 2 | 263-276 | P6 | Records a known divergence of current upstream from the historical model as an "obligation": evidence about history, not a check that can fail usefully. | Gone. | None. |
| 3 | 9-24 | — | Good shape (imports real module, no text seams); nothing to port because the subject is upstream. | — | — |

## Proposed end state
Delete harness, `legacy/CoreInteractiveTask.qnt` + manifest entry, `legacy/core/interactive-task-source-traces.md`, the index row and `test/quint-core-interactive-task-traces.test.mjs`. If the owner wants a browser-agent task model, it should be written against current upstream and live upstream.
