# test/workflow-trigger-detection.test.mjs
- Lines: 159 | Kind: unit (imports real `browser/workflow-triggers.ts`: `detectWorkflowTriggers`, `placeChanged`, `EventRangeCache`, `ParsedDocuments`, `triggerTickPlan`) + source-text (lines 152-159 over `browser/workflow-trigger-runtime.ts`) | Verdict: DELETE
- Covers: the development workflow simulator's trigger detection: per-flow error isolation, bounded seen keys, place-change cursor rules, calendar range cache, parsed-document cache, tick plan. Duplicates: Lemma `specs/lemma/apps/app/src/browser/workflow-triggers.dfy` (proves `placeChanged`, `triggerTickPlan`, cursor monotonicity), Quint `specs/quint/refinement/services/trigger-cursor-replay.mjs` (manifest pins this file), `test/browser/dev-workflow-triggers.spec.ts` (time, message, email, calendar and place triggers end to end). Callers/importers: `npm test` glob. Module importers: `browser/workflow-trigger-runtime.ts` ← `browser/simulated-workflows.ts` ← `browser/simulated-apps.ts` (dev simulator only, kept with its proofs per D20).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 67-73, 146-150 | T4 | `placeChanged` and `triggerTickPlan` truth tables duplicate Lemma proofs. | Delete. | None |
| 2 | 11-112 | T3 | Detection cases on a dev simulator; the dev Playwright spec drives the runtime. | Delete. Keep "one broken flow does not stop the others" only if `dev-workflow-triggers.spec.ts` lacks it. | Low |
| 3 | 114-144 | T3 | Cache classes (`EventRangeCache`, `ParsedDocuments`): performance helpers of the simulator. | Delete. | Low |
| 4 | 152-159 | T1 | Regexes over `workflow-trigger-runtime.ts` (`private wake=()=>{this.blocked=false;…}`). | Delete. | None |

## Proposed end state
File deleted. The simulator keeps Lemma + Quint + `dev-workflow-triggers.spec.ts`. If the simulator itself is retired later, its proofs and spec go together (D20).
