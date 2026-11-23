# specs/quint/refinement/services/personal-assistant-scheduled-task-custody.mjs
- Lines: 71 | Kind: Quint refinement driver (upstream-only: Personal Assistant dossier policy + SDK scheduling runner, SQL stores and migration in private PGlite) | Verdict: KEEP (upstream-lock lane); PORT of the fixture is an upstream follow-up
- Covers: `PersonalAssistantScheduledTaskCustody` (live, `manifest.json:1468`): untrusted signal not admitted, SQL claim consumes one admitted day in both orders, stale completion writes refused after complete/reopen/refire and after metadata/definition change. Duplicates: shares the fixture with `lifeops-scheduled-task-route.mjs` (generic memory-store replay, different model). Callers: `services/index.mjs:65,85`; `test/quint-personal-assistant-scheduled-task-custody.test.mjs`. Code under test is entirely in `vendor/eliza` (no Alpha product file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 (fixture 61-69) | T10 | The imported fixture slices upstream `runtime-wiring.ts` at `'    prepareMutation: createDossierActivityMutationPolicy({ ownerFacts }),'` → `'\n\n    executionBoundary: (task, execute) =>'` and `'export function registerDossierActivityAnchor('` → `'\nfunction resolveRuntimeAnchorRegistry(runtime: IAgentRuntime)'`. Any upstream reformat breaks it. | Upstream follow-up: export the mutation-policy wiring and anchor registration so the fixture imports them. Until then, this harness only needs to run when `upstream.lock.json` or the fixture changes. | Medium |
| 2 | — | P6 / owner | Models upstream-only code. Whether Alpha ships the Personal Assistant scheduling plugin matters: `start-reviewed-workflow-agent.ts` disables `personal-assistant` for fresh profiles. If the product never enables it, this is a model of upstream behaviour Alpha does not use. | Owner question; if not shipped, move to upstream with the model. | Medium |
| 3 | 4, 7 | C3 | Imports `call/checkpoint/trace` from `application/support.mjs` while services harnesses use `services/support.mjs`. | One `refinement/support.mjs`. | Low |
| 4 | 18-23 | B5 | `captureInputs` + merging fixture hashes: receipt ceremony. | Keep while receipts exist. | — |

## Proposed end state
Unchanged campaign, run only in an upstream-lock lane (path filter: `upstream.lock.json`, this harness, its fixture,
the model). Fixture imports instead of slicing once upstream exports the wiring.
