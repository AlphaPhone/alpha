# scripts/test-device-timing-source.ts
- Lines: 14 | Kind: tooling (runs an upstream vitest suite `vitest.device-actions.config.ts` in the prepared pinned agent source `plugins/plugin-assistant`) | Verdict: MERGE into one upstream-source runner `scripts/run-upstream-source-tests.ts <suite>` together with `scripts/test-local-agent-source.ts`
- Covers: agent-side authenticated HTTP and durable device-action lifecycle in the admitted upstream source (a qualification of the pinned source, not Alpha code). Duplicates: same prepare + `sourceDirectory` + runner-presence pattern as `scripts/test-local-agent-source.ts`. Callers: `package.json` `agent:test-device-timing`; `.github/workflows/resident-android.yml:310` (resident qualification step, 600 s budget).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-14 | D11 | Name says "device timing"; it runs the device-actions vitest config. Script name, npm alias and CI phase name (`device-timing-flow`) all mislead. | Rename the suite to `device-actions` in the merged runner; keep the npm alias name only if CI ruleset or docs depend on it. | L |
| 2 | 8 | P3 | Runs `prepare-local-agent.ts --source-only` itself, although `resident-android.yml:304` has just run the same command in the same step. | Merged runner takes `--no-prepare` (or checks the prepared marker) so CI prepares once. | L |
| 3 | 7-10 | C3 | Same root/sourceDirectory/runner-exists logic as `test-local-agent-source.ts:6-12`. | One runner with a suite table `{device-actions: vitest…, workspace: bun test…}`. | L |
| 4 | — | T5 | Re-runs upstream tests. The upstream owns them (D14 / R6: not moved now). | Keep the CI call; list as an upstream follow-up. | — |

## Proposed end state
Deleted as a file; its 3 effective lines become the `device-actions` entry of `scripts/run-upstream-source-tests.ts`, still invoked by `resident-android.yml`. Upstream follow-up recorded: this qualification belongs in `vendor/eliza` CI.
