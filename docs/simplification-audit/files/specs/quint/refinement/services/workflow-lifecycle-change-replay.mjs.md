# specs/quint/refinement/services/workflow-lifecycle-change-replay.mjs
- Lines: 161 | Kind: Quint replay harness (mounts the adapter through the transplant `workflow-adapter-fixture.mjs`, imports the real `workflow-protocol.ts`) | Verdict: KEEP, PORT (through the fixture port), SIMPLIFY
- Covers: replays 15 scenarios of `WorkflowLifecycleChange.qnt` against the real workflow adapter's remove/restore lifecycle flow over a controlled agent. It covers owner review before removal, lost reply retained, never-sent change resent, delayed copy plus resend applied once, refused resend retained, edit/version change releasing the journal, abort before dispatch releasing it, interrupted runs cancelled first and ongoing runs blocking removal. Duplicates: Playwright `workflow-retirement.spec.ts`, `workflow-removed-navigation.spec.ts` and `workflow-notice-lifecycle.spec.ts` cover visible removal. Host tests `test/workflow-lifecycle-resend.test.mjs` (T2 transplant via `scripts/workflow-renderer-fixture.ts`) and `scripts/test-workflow-lifecycle-ui-flow.ts` (T9) cover the same resend path a third and fourth time. This replay is the strongest of them. The campaign also runs twice: `test/quint-workflow-lifecycle-change.test.mjs` and `forward-replays.mjs:27` (T4). Callers/importers: those two.

Model is live (manifest `WorkflowLifecycleChange`, sources `prototype/workflow-adapter.ts`, `runtime/workflow-protocol.ts`, `runtime/workflow-intents.ts`, all present). Workflow remove/restore is a production feature.

Text and labels relied on: the fixture's transplant of `workflow-adapter.ts` (see that report), the journal slot `intentSlot('flow', ':lifecycle')`, and the render-bag fields `fd.del`, `fd.busy`, `fd.lifecycleReview`, `fd.lifecycleLabel === 'Cancel runs'`, `fd.deleteLabel ∈ {'Resend','Confirm resend','Restore workflow'}`, `detail`, plus `openWorkflow`. The version format `e<edits>a<applications>` is the harness's own.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | C7 | Top-level `await import(...)` for modules that could be static imports. It exists so the test can re-exec under `tsx` first. | Static imports after the fixture port (the bundled module needs no `tsx` loader). Remove the re-exec from `test/quint-workflow-lifecycle-change.test.mjs`. | None |
| 2 | 154, 161 | B4 | `t` and `{canaries=true}` are unused, and `runWorkflowLifecycleChangeCase1` is a misleading name (there is only one case). | One export `runWorkflowLifecycleChangeReplay()` that returns counts. The owning test calls it. | None |
| 3 | 3-4, 131, 141, 148 | C5 | Hand-copied counter and `recordComparedObservation` bookkeeping, same as `trigger-cursor-replay.mjs`. | Shared replay-walk helper in `observed-replay.mjs`. | Low |
| 4 | 84, 96 | T8 | Fixed sleeps `setTimeout(resolve, 20)` and `10` after `abortBeforeDispatch`/`abortResend`. They wait for "nothing happened", which has no condition to wait on. | Replace with `await settle()` (a few `setImmediate` turns) as other harnesses do, or wait on the journal write promise being refused. | Low (flake) |
| 5 | 157-158 | B5 | Hand-listed 21 actions that must each be seen. | Derive from the model or keep as is. It is anti-vacuity, so cheap and fine. | — |
| 6 | 130 | D8 | Mis-indented line 130, statement-soup line 141. | Formatter pass. | None |
| 7 | whole | T4 | Also run by the aggregate. | Run once per lane. | None |

## Proposed end state
About 140 lines. Same subject/agent model and projection, mounted through the ported import-based `workflowAdapter` fixture, with static imports, one exported runner and a shared walk-replay helper. No fixed sleeps. The owning test calls the runner directly without a `tsx` re-exec. `test/workflow-lifecycle-resend.test.mjs` and `scripts/test-workflow-lifecycle-ui-flow.ts` can then be deleted as duplicate coverage. CI selects it when `prototype/workflow-adapter.ts`, `workflow-protocol.ts`, `workflow-intents.ts` or the model changes.
