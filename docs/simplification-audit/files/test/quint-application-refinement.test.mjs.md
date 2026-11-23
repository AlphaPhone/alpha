# test/quint-application-refinement.test.mjs
- Lines: 36 | Kind: Quint replay aggregate (`runApplicationRefinement()` runs every application campaign; 2,400 s budget) + a test of the aggregate's plumbing | Verdict: DELETE (replaced by `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model))
- Covers: every application campaign passes, each receipt maps to a manifest model, and models without a campaign carry an explicit obligation. Duplicates: 40+ per-model `test/quint-*.test.mjs` wrappers in this chunk alone run the same campaigns a second time (research P3, about 185 overall). Callers/importers: `npm test` glob only (CI uses `npm run quint:refinement` for the `composition` family only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-21 | T4/P3 | Re-runs every application campaign that per-model wrappers already run; the comment says the aggregate "exceeded 20 minutes". Largest avoidable cost in `npm test`. | Delete; the runner runs each model once. | Low |
| 2 | 13-19 | keep-idea | "Every manifest model has a campaign or a declared obligation" is a useful completeness rule. | Move into the runner (or `scripts/check-quint-refinement.ts`, which already computes coverage). | Low |
| 3 | 23-36 | T5 | Tests `collectApplicationCampaigns` error collection: a test of the harness. | Delete. | Low |
| 4 | — | owner | The aggregate imports `checkPreviousNotesSourceOpening` (A1 delete). | Remove that entry with the A1 change. | Low |

## Proposed end state
Deleted. The runner registers one `test()` per model from `specs/quint/*/manifest.json` (the family `index.mjs` lists
become the campaign registry) and asserts the coverage rule once.
