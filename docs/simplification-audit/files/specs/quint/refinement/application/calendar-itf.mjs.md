# specs/quint/refinement/application/calendar-itf.mjs
- Lines: 96 | Kind: shared harness library (Quint random walks + witness/goal walks to ITF, cached per process; `plain`, `actionCounts`, `sameState`) | Verdict: MERGE into `browser-model-traces.mjs` (as `refinement/model-traces.mjs`)
- Covers: no behaviour itself. Duplicates: `browser-model-traces.mjs` (`plain`, Quint CLI spawn, ITF state reading). Callers/importers: `calendar-agent-selection.mjs`, `day-anchor.mjs`, `reminder-tap-tokens.mjs`, `reminder-intents.mjs`, `reminder-todo-attempt.mjs`, `reminder-refresh.mjs`, `reminder-decision.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-20 | C5 | `plain()` twin of `browser-model-traces.mjs:21-29` with a different set ordering (JSON string sort vs numeric). Merging must keep numeric order for number sets and verify the seven callers' expected projections still match. | One `plain()`; numeric-aware sort. | M |
| 2 | 34-40, 55-79 | C5 | Second Quint spawner (async, 120 s) and walk generator; this one adds goals, parallelism (4) and a per-process cache, which the browser variant lacks. | Keep this generator's features in the merged module; browser callers gain parallel witnesses. | L |
| 3 | 22-32 | — | Trace shape `{name, steps:[{action,picks,state}]}` differs from browser `{init, steps:[{action,args,picks,before,after}]}`. | Merged module returns one shape; adapt `sameState` callers (8 files). | M |

## Proposed end state
Deleted after its seven importers switch to the merged `refinement/model-traces.mjs`.
