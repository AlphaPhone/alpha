# specs/quint/services/CloudQaLauncher.qnt
- Lines: 214 | Kind: Quint model, live (11 tests, 9 invariants); models a development launcher | Verdict: KEEP (pending owner, together with `scripts/start-cloud-qa.ts`)
- Covers: the staging Cloud-inference QA launcher. It covers the isolated profile, the log-file kind checks (linked/hardlinked/fifo refused), preflight refusals, one private child, preload/parent-head revision observation, receipt staging/publication and signal handling, with no readiness claim. Properties include: an owned child keeps its log, a receipt requires a spawn, an admitted child requires the staging profile, and a settled launcher owns no live child. Sources: `scripts/start-cloud-qa.ts`, `core-state-preload.ts`, `cloud-sdk-authority.ts`, `native-view-policy.ts`, `cloud-deployment-policy.ts`, `vendor/eliza/packages/agent/native-host/private-runtime-launch.mjs` (exist). Duplicates: `CombinedAgentLauncher` and `ReviewedWorkflowLauncher` model sibling `start-*` launchers with the same child-custody shape (C5: "five `start-*` launchers"). Callers: harness `refinement/services/cloud-qa-launcher.mjs` (61 lines; spawns `cloud-qa-launcher-probe.mjs` per scenario, imports `scripts/core-state-patch.ts`), wrapper `test/quint-cloud-qa-launcher.test.mjs`, aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D6 / owner | `files/scripts/start-cloud-qa.ts.md` says "KEEP pending owner (live Quint model)". The model is the reason the launcher is kept, and the launcher is the reason the model is kept. | Owner decides whether the staging QA launcher stays. If not, delete the script, model, harness, probe, `cloud-qa-launcher.md` and wrapper together. | owner |
| 2 | — | C5 | Three launcher models (CloudQa, CombinedAgent, ReviewedWorkflow) share the profile/log/child/receipt/signal skeleton. | If the `start-*` launchers merge into one parameterised launcher (scripts review), merge the three models into one `Launcher` module with a mode parameter. | medium |
| 3 | 139 | — | The comment notes that equality with the child is a comparison, not a guarantee. Honest. | — | none |
| 4 | harness | T9 | Each scenario is a child Node process (runtime cost). | Accept. The launcher's signal handlers need a real process. | none |

## Proposed end state
Kept while the launcher is kept, or merged with the other launcher models when the scripts merge.
