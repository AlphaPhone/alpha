# specs/quint/services/CombinedAgentLauncher.qnt
- Lines: 188 | Kind: Quint model, live (8 tests, 7 invariants); models a development launcher | Verdict: KEEP (pending owner, together with `scripts/start-combined-agent.ts`)
- Covers: one invocation of `scripts/start-combined-agent.ts` and its returned child. It covers preflight refusals (node version, source mismatch, busy port…), prepared-input refusals, pinned/independent core selection, spawn with or without a pid, supervision, metadata publication and failure, signal forwarding and child exit codes. Sources: `scripts/start-combined-agent.ts`, `combined-agent-source.ts`, `host-speech-admission.ts`, `agent-identity.ts`, `agent-model.ts`, `core-state-patch.ts`, `launcher-child.ts` (exist). Duplicates: the sibling launcher models (see `CloudQaLauncher.qnt.md`). `test/quint-combined-agent-launcher-refinement.test.mjs` is its wrapper. Callers: harness `refinement/services/combined-agent-launcher.mjs` (66 lines; spawns `combined-agent-launcher-probe.mjs` per scenario, reads `parseBuildPolicy` from `scripts/build-policy-source.ts`), plus `reviewed-workflow-launcher.mjs` references it; aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D6 / owner | Same mutual-justification as CloudQaLauncher (`files/scripts/start-combined-agent.ts.md`: KEEP pending owner). | Owner decision. If the launcher goes, delete the model, harness, probe, `combined-agent-launcher{,-baseline}.md` and wrapper. | owner |
| 2 | — | C5 | Shares a skeleton with CloudQaLauncher and ReviewedWorkflowLauncher. | Merge with the scripts. | medium |
| 3 | manifest | §2.3 | `scripts/core-state-patch.ts` is a source here and in `CoreConnectorCustody`. It is a local patch of upstream core state, which AGENTS.md says belongs upstream. | Follow-up upstream (D14). The model is unaffected until then. | low |
| 4 | `.md` siblings | §2.15 | `combined-agent-launcher.md` and `-baseline.md` are narrative. | Delete with the other spec-tree narrative docs. | none |

## Proposed end state
Kept while the launcher is kept, ideally merged into one launcher model.
