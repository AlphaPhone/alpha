# scripts/test-workflow-protocol.ts
- Lines: 13 (≈5 KB) | Kind: integration (imports the real `apps/app/src/runtime/workflow-protocol.ts` and drives it over real HTTP against a loopback fake agent; no slicing) | Verdict: MOVE to `test/workflows.integration.test.ts` (as `node:test` cases), delete the self-respawn and the shim entry
- Covers: client protocol for list/pause/activate, version-change refusal before run, one POST per run, terminal cancel is not re-sent, ambiguous run POST records the durable intent before sending and is not retried, missed-occurrence parsing (bare/forged outputs are not "missed"), manual-typed activation refusal. Duplicates: partially `test/browser/workflow-missed-run-now.spec.ts` (UI side; its line 21 comment points here for the forged case). Callers/importers: `test/adapter-contracts.test.mjs:8`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4–6 | T9 | Re-spawns itself with `--import=tsx` if the loader is missing; the shim already passes `--import tsx`. | Run under the test runner's tsx loader; delete the respawn. | Low |
| 2 | whole | T9 | A script in `scripts/` that is a test, executed by a child-process shim; failures surface as a stderr blob. | Move into `test/` as named `test()` cases (one per behaviour listed above). | Low |
| 3 | 8–11 | C5 | Fake agent server duplicated with the three `*-ui-flow.ts` files. | Use shared `test/fixtures/workflow-agent.ts`. | Low |
| 4 | 12 | C3 | Inline fetch transport duplicates `workflowHttpClient` in `workflow-renderer-fixture.ts:110-121` (which also maps errors to `WorkflowHttpError`). | Move `workflowHttpClient` into the shared fixture and use it here. | Low |
| 5 | 13 | D8 | One 2.5 KB line of asserts. | Split into cases. | None |

## Proposed end state
`test/workflows.integration.test.ts` holds this protocol suite (real module, real HTTP) as 6–7 named tests, using `test/fixtures/workflow-agent.ts`. The script and its line in `adapter-contracts.test.mjs` are deleted; the comment in `workflow-missed-run-now.spec.ts:21` is repointed. This is the only Workflows test kept outside Playwright, because the missed/forged-output and "intent before ambiguous POST" rules are hard to reach from the UI.
