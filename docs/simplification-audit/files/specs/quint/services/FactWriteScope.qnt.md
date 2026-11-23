# specs/quint/services/FactWriteScope.qnt
- Lines: 151 | Kind: Quint model, live (services manifest); upstream-only sources (`vendor/eliza/packages/core/src/runtime.ts`, `runtime/data-mutations.ts`, `runtime/fact-write-dedupe.ts`, `plugin-sql/src/base.ts`) | Verdict: KEEP (upstream-lock lane)
- Covers: fact-write dedupe scope: one owner per (runtime, room) lane, lookup over at most 120 newest candidates (119 rows still reuse, 120 evict), refusal releases the FIFO lane, ids stay unique per room (6 runs, 5 invariants). Duplicates: historical design note `specs/quint/legacy/core/fact-write-dedupe-refinement.md` (legacy family, retired with P6). Callers/importers: manifest; `refinement/services/fact-write-scope.mjs` (imports `task-service/module.mjs` loader and a PGlite fixture; real upstream code); `test/quint-fact-write-scope.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 / §2.9 | Upstream-only model running on every PR. | Upstream-lock lane (`upstream.lock.json`, `patches/eliza/**`, model + harness); upstream follow-up candidate. | None |
| 2 | 130-135 | — | The 119/120 boundary runs pin the upstream constant `candidateLimit = 120`; a legitimate upstream change fails here first, which is the purpose. | Keep. | — |
| 3 | test + index | T4, B5 | Duplicate runner; receipt ceremony. | One runner. | None |

## Proposed end state
Model unchanged; harness already imports real code; run only when the upstream pin or this model changes. When `specs/quint/legacy` is retired, the legacy note referencing this model goes with it.
