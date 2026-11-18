# test/quint-composition-refinement.test.mjs
- Lines: 27 | Kind: Quint aggregate wrapper (spawns `node --import=tsx -e` running `runCompositionRefinement` from `specs/quint/refinement/composition/index.mjs`; esbuild + Chromium) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: renderer, Calendar and voice controller composition refines `ControllerComposition` (9 traces, 44 checkpoints) plus one more composition receipt. Duplicates: `.github/workflows/browser.yml` production job runs `npm run quint:refinement -- --families=composition` on the same PR, so the composition campaign runs twice per PR. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-23 | T9 | Whole test program inside a template string run with `node -e`; failures surface as a child exit code and a stdout regex (`/"traces":9/`). | Delete; the runner calls `runCompositionRefinement` in-process. | None |
| 2 | 10-21 | B5 | Asserts exactly 2 receipts, 9 traces, 44 checkpoints, two action names, non-empty obligations. | Drop; runner asserts each receipt passed. | None |
| 3 | 5 | P3 | 600 s budget; duplicated by the CI production job. | Run composition once: either in the runner (verify lane) or in the production job, not both. | Low |

## Proposed end state
Deleted. The manifest runner gets a `composition` family entry; CI runs it in one lane only.
