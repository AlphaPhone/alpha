# scripts/test-workflow-metadata-host.ts
- Lines: 20 | Kind: unwired evidence probe against a real local upstream host (port 47854, private profile), writes `test-results/workflow-metadata/real-host.json` | Verdict: DELETE
- Covers: upstream plugin-workflow metadata compare-and-swap (8 concurrent identical edits → one version, 409 on stale/conflicting, 400 on `source`, receipt survives restart). Duplicates: the renderer side is in `test-workflow-metadata-ui-flow.ts`; the server behaviour belongs to `vendor/eliza` plugin-workflow tests. Callers/importers: none. Only named in a comment at `scripts/start-reviewed-workflow-agent.ts:5-8`; no npm script, workflow or test runs it (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T9 | Nobody runs it; it needs a hand-started `start-reviewed-workflow-agent.ts` host and a `--restore` second invocation after a manual restart. | Delete together with the other five host probes (`test-reviewed-workflow-host.ts`, `test-workflow-{approvals-host,approval-crash,cancel-recovery,lifecycle-host}.ts`), `scripts/fixtures/workflow-host.ts` and `scripts/start-reviewed-workflow-agent.ts`. | Low: no lane loses coverage. |
| 2 | 11, 18–20 | B5 | Writes an evidence JSON with a `scope` disclaimer and a list of booleans; nothing reads it. | Gone. | None |
| 3 | whole | T5 | Tests upstream server behaviour (metadata CAS), not Alpha code. | List as upstream follow-up (D14): plugin-workflow should own a metadata-mutation idempotency test. | None |

## Proposed end state
File deleted with its sibling probes, the `workflow-host.ts` fixture and the launcher script; the comment in `start-reviewed-workflow-agent.ts` disappears with that file. Upstream follow-up recorded in `cross-file-actions.md`.
