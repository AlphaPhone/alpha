# specs/quint/refinement/services/reviewed-workflow-launcher.md
- Lines: 44 | Kind: harness documentation | Verdict: KEEP (trim) or DELETE with the launcher
- Covers: what `ReviewedWorkflowLauncher` observes in `scripts/start-reviewed-workflow-agent.ts` (source selection, dependency/port checks, owner token before entry check, profile identity/routing/embedding defaults, child supervision, receipt) and how to run it. Duplicates: assumptions in `reviewed-workflow-launcher.mjs:65-70`. Callers: none (docs).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-31 | A8 | Links the baseline history file (DELETE). | Remove the sentence. | None |
| 2 | 39-44 | T9 | Run commands point at `test/quint-reviewed-workflow-launcher-refinement.test.mjs` (MERGE into the Quint runner) and an `ALPHA_QUINT_BUN` knob. | Update after the runner merge. | Low |
| 3 | — | owner | `scripts/start-reviewed-workflow-agent.ts` is proposed MERGE into `start-local-remote.ts` then delete (its own report). If that happens, the model describes a deleted script. | Follow the script's fate: delete this doc, the harness, the probe and `ReviewedWorkflowLauncher.qnt` together (D20 rule), or re-point them at the merged launcher. | Medium |

## Proposed end state
Either ~30 lines without history and with the current run command, or deleted with the launcher.
