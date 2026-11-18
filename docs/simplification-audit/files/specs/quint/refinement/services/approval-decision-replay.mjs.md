# specs/quint/refinement/services/approval-decision-replay.mjs
- Lines: 115 | Kind: Quint forward replay (model scenarios + 150 random walks of `ApprovalDecision.qnt` replayed step by step against the Workflows adapter; adapter loaded by `workflow-adapter-fixture.mjs` as **transplanted text**) | Verdict: PORT (adapter must be imported, not sliced)
- Covers: model `ApprovalDecision`: an approve/deny tap is journaled before it is sent, a lost reply is reconciled from the receipt, a retained decision blocks another, a changed request needs its own decision, stale/closed/finished runs refuse, restart needs a receipt, late decisions for replaced requests drop. Duplicates: none (not in a family aggregate except via `forward-replays.mjs`); `test/browser/dev-workflow-*` specs drive approvals in the UI without the model. Importers: `forward-replays.mjs` (`runApprovalDecisionReplay`), `test/quint-approval-decision.test.mjs` (`runApprovalDecisionCase1/2`, spawns itself again under `tsx`, T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 30 (via `workflow-adapter-fixture.mjs:25-42`) | T2 / T10 | The "real adapter" is `apps/app/src/prototype/workflow-adapter.ts` read as text, imports deleted by regex (`/^import .*;\n/gm`), `export function` rewritten, types stripped and run in `vm` with a hand-built `Shell`, `connectionController`, `Capacitor` and `localStorage`. Any import, export or formatting change in the adapter breaks it. | PORT: import `installWorkflowAdapter` through `tsx` (the wrapper already runs under `tsx`) with its collaborators passed in: the adapter module needs its `connectionController`, `Capacitor`/native plugin and `localStorage` dependencies injectable (constructor/install argument) instead of module imports. Keep `workflowRendererFixture` as the shell host. | Medium: touches `workflow-adapter.ts` signature; do it with the D2 adapter-registry change. |
| 2 | 101, 107, 115 | A7 | `t` and `{canaries}` parameters are unused (the mutation canaries were removed). | Drop both parameters; one exported `runApprovalDecisionReplay()`; the test calls it. | None |
| 3 | 4, 87, 95, 115 | D8 | Module-level counters and minified lines (line 90 is ~330 characters with six statements). | Return counts from `replay`; one statement per line. | None |
| 4 | 86-87, 93-95 | B3 | `assert.deepEqual(actual, expected)` immediately followed by `recordComparedObservation`, which asserts the same equality again. | Keep one (see `observed-replay.mjs` report). | None |
| 5 | 108 | P1 cost | 150 walks x 40 steps through a vm-hosted adapter with 2 ms polling waits (`wait`), one of the slower services replays. | Keep bounds for the nightly run; 30 walks on PRs. | Low |

## Proposed end state
~80 lines: `subject()` mounts the imported adapter with injected ports; `replay()` returns counts; one exported `runApprovalDecisionReplay(options)` used by both the forward-replay receipt and the single Quint runner.
No source text read anywhere in the chain.
