# test/fixtures/lifeops-scheduled-task-route.mjs
- Lines: 361 | Kind: Quint refinement fixture for upstream code (esbuild-bundles `vendor/eliza` scheduling + personal-assistant sources, runs them on PGlite or in-memory stores) | Verdict: KEEP while the two services models are live; PORT the text slice (#2); flag as upstream-model (P6 candidate)
- Covers: concurrent fire/claim/dispatch of upstream scheduled tasks through the real `/api/lifeops/scheduled-tasks` route handler and two independent runners (single-fire, stale-claim refusal, guard before egress, owner-visible filtering, edit/snooze/complete/reopen controls), plus dossier-activity anchors in configured mode. Duplicates: upstream `vendor/eliza` scheduling tests cover the runner; this fixture adds the two-runner interleaving. Callers/importers: `specs/quint/refinement/services/lifeops-scheduled-task-route.mjs`, `specs/quint/refinement/services/personal-assistant-scheduled-task-custody.mjs` (+ `.md`), via `services/index.mjs`; host test `test/quint-lifeops-scheduled-task-route.test.mjs` (T4 duplicate of the aggregate runner).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P6 | Everything exercised is upstream code (`vendor/eliza/plugins/plugin-scheduling`, `plugin-personal-assistant`, `plugin-sql`). No `apps/app` or `android` file is involved. ci-and-formal flags models of upstream-only code as retirement/upstream candidates. | Owner/lead decision: if the product depends on this route (agent-side scheduling), keep; otherwise move models + fixture upstream (D14 follow-up). | Medium. |
| 2 | 60-71 | T2, T10 | Configured mode reads `runtime-wiring.ts` as text and slices two fragments at literal strings (`'    prepareMutation: createDossierActivityMutationPolicy({ ownerFacts }),'` … `'\n\n    executionBoundary: (task, execute) =>'`, and `'export function registerDossierActivityAnchor('` … `'\nfunction resolveRuntimeAnchorRegistry('`), then splices them into a generated entry. Breaks on any upstream formatting change. | Request upstream to export `selectedPersonalAssistantPolicies` (or the policy factory) and `registerDossierActivityAnchor`; import them. Until then this is the one text slice to log. | Medium: upstream change needed (D14). |
| 3 | 26-31, 108-110 | B5 | Hashes five metadata files and every loaded source before and after bundling, asserts `git -C vendor/eliza rev-parse HEAD` equals the pin and `git diff --quiet pin -- <sources>`. Evidence ceremony: the submodule pin already fixes the sources. | Drop the hash map and git diffs; keep only the pin check if anything (submodule status already guarantees it). | Low. |
| 4 | 32-57, 96-106 | D13, C7 | Hand-maintained alias map `@elizaos/core`/`contracts`/`plugin-sql` → specific source files to avoid importing the package barrels; one stub `logger` throws. | Replace with the repo's one `@eliza/*` resolution once D13 lands, or keep minimal. | Low. |
| 5 | 264-277 | T8 | `settleUntil` spins `setImmediate` until a 10 s deadline in configured mode. Condition wait, acceptable. | Keep. | None. |
| 6 | 1-361 | — | Bundles with esbuild and starts PGlite per configured scenario: notable runtime cost (compile cached per mode by `compiled` map). | Fine. | None. |

## Proposed end state
Moves next to its harnesses as `specs/quint/refinement/services/fixtures/lifeops-scheduled-task-route.mjs`. No
hash/git evidence; no text slice once upstream exports the two policy functions (until then logged as a T10 pin).
Only the aggregate Quint runner calls it (delete `test/quint-lifeops-scheduled-task-route.test.mjs`). If the lead
decides models of upstream-only code go upstream, the fixture goes with them.
