# specs/quint/refinement/services/personal-assistant-scheduled-task-custody.md
- Lines: 31 | Kind: harness documentation | Verdict: KEEP (trim)
- Covers: explains the PGlite-backed campaign over the pinned upstream Personal Assistant dossier wiring and SDK scheduling runner, its schedules and open obligations. Duplicates: obligations restated in `personal-assistant-scheduled-task-custody.mjs:67-70`. Callers: none (documentation); links `lifeops-scheduled-task-route.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | T10 | States the fixture "extracts the selected runtime wiring": `test/fixtures/lifeops-scheduled-task-route.mjs:61-69` slices upstream `scheduled-task/runtime-wiring.ts` between two literal anchors. | Document as an upstream follow-up (export the wiring), see the `.mjs` report. | — |
| 2 | 27-31 | — | "Exact occurrence identity at the pre-egress check remains open" is an open finding against upstream code; belongs in the upstream follow-up list (D14), not only here. | Copy to `cross-file-actions.md` §6 upstream follow-ups. | Low |

## Proposed end state
Short description kept beside the harness; open upstream finding tracked in the follow-up ledger.
