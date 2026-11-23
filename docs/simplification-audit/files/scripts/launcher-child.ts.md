# scripts/launcher-child.ts
- Lines: 26 | Kind: script helper (forwards SIGINT/SIGTERM to a spawned agent, records exit code, returns a "retire failed hand-off" killer) | Verdict: MERGE into `scripts/private-runtime-launch.ts`
- Covers: child supervision for the two local agent launchers. Duplicates: none in scripts. Callers/importers: `scripts/start-combined-agent.ts:4,56`, `scripts/start-reviewed-workflow-agent.ts:3,56`; both launchers also import `private-runtime-launch.ts`. Quint: listed in `specs/quint/services/manifest.json:2090,2141` and copied by path in `specs/quint/refinement/services/combined-agent-launcher(-probe).mjs` and `reviewed-workflow-launcher(-probe).mjs`; `scripts/quint-lib.ts:16`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file | D4 | 26-line helper used by exactly the two callers of `private-runtime-launch.ts` (57 lines). | Merge; one launch module. | L |
| 2 | — | T10 | The four Quint launcher harnesses copy `scripts/launcher-child.ts` into a scratch repository by literal path and the manifests pin it. | Remove the entry from each `support` list and manifest `sources` in the same change; `private-runtime-launch.ts` is already listed in all of them. | M |
| 3 | 18-25 | — | `retireFailedHandoff` waits for close with a 5 s SIGKILL fallback; correct. | Keep. | L |

## Proposed end state
`superviseLauncherChild` lives in `scripts/private-runtime-launch.ts`. If `start-reviewed-workflow-agent.ts` is retired with the unwired workflow
host probes (see `fixtures/workflow-host.ts`), it would have a single caller; the merge is still the right home because both launchers share the
private-runtime launch path.
