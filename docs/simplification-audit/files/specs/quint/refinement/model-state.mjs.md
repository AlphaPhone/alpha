# specs/quint/refinement/model-state.mjs
- Lines: 111 | Kind: formal tooling library (Quint AST state inventory, trace action coverage) | Verdict: KEEP
- Covers: lists a model's state variables/record fields/actions from the Quint parser AST and computes which fields and actions refinement traces observed. Duplicates: none (it is the correct way to read model structure; `assistant-model-traces.mjs` should reuse its parser approach). Importers: `scripts/check-quint-refinement.ts`, `application/index.mjs`, `native/index.mjs`; tests `test/quint-state-inventory.test.mjs` (tooling, T5) and `test/quint-core-{retirement,service-lifecycle,shutdown,turns}.test.mjs`, `test/quint-current-approval-service.test.mjs` (legacy/core model tests).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-86 | D8 | Minified style (no spaces, several statements per line). | Prettier pass (D9). | None |
| 2 | 3-4 | — | Imports Quint internals (`dist/src/idGenerator.js`, `parsing/quintParserFrontend.js`); version-pinned by package-lock. | Keep; note it in `scripts/quint-lib.ts` next to the pinned CLI. | Low on Quint upgrades |
| 3 | 88-111 | — | `traceActionCoverage` is consumed only by the coverage report in `check-quint-refinement.ts`. | Keep while that report exists. | — |
| 4 | — | T5 | `test/quint-state-inventory.test.mjs` tests this helper directly; the core tests that import it belong to the legacy/upstream-core family slated for retirement. | Delete with their families; no new test needed (the report run exercises it). | Low |

## Proposed end state
Unchanged API (`modelStateInventory`, `unobservedStateFields`, `traceActionCoverage`), formatted.
Also the parser entry `assistant-model-traces.mjs` uses for `step`/`run` extraction (export a small `parseModel(path)` here).
