# specs/quint/services/ReviewedWorkflowLauncher.qnt
- Lines: 176 | Kind: Quint model of a dev launcher script (services family, live; 7 tests) | Verdict: DELETE with `scripts/start-reviewed-workflow-agent.ts` (scripts-13: MERGE into `start-local-remote.ts`); else retarget
- Covers: one invocation of `scripts/start-reviewed-workflow-agent.ts`: dependency/profile/entry/routing/git preflight refusals before spawn, private log, pinned-revision preload entry, receipt metadata describes the requested child, child custody after a receipt failure (SIGTERM then SIGKILL). Sources exist (`start-reviewed-workflow-agent.ts`, `local-agent-source.ts`, `agent-identity.ts`, `agent-model.ts`, `agent-embeddings.ts`, `core-state-preload.ts`, `core-state-patch.ts`, `launcher-child.ts`). Duplicates: `CombinedAgentLauncher.qnt` and `CloudQaLauncher.qnt` model sibling launchers with the same preflight → spawn → receipt shape (C5). Callers/importers: manifest; harness `refinement/services/reviewed-workflow-launcher.mjs` (+ `-probe.mjs`, `.md`, `-baseline.md`; spawns the real script in a temp checkout); wrapper `test/quint-reviewed-workflow-launcher-refinement.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / D20 | Development launcher only. `scripts/start-reviewed-workflow-agent.ts` report merges it into `start-local-remote.ts`; `scripts/test-reviewed-workflow-host.ts` report deletes its six probes, after which the launcher and this model lose their only users. | Delete model, harness, probe, notes, wrapper and manifest entry with the script. If the merged launcher keeps a receipt + child-custody protocol worth proving, retarget one launcher model (merge with `CombinedAgentLauncher`) at it. | Low; dev-only (D6) |
| 2 | 15-16, 61-69 | C5 | Preflight-refusal set duplicates the other launcher models. | Covered by #1. | — |

## Proposed end state
Deleted together with the launcher; at most one launcher model remains for the merged `start-local-remote.ts`.
