# specs/quint/application/CommittedViewObservation.qnt
- Lines: 65 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT fixture
- Covers: Manual-view observation across renderer and host waiter: one receipt per success, stale claims settle negative, failed cache needs explicit retry. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/committed-view-observation.mjs`, `test/fixtures/committed-view-observation.mjs`, `test/quint-committed-view-observation.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 8,48-49 | T2/T10 | Fixture strips types and deletes `import`/`export` lines of `view-navigation.ts`, and slices a callback out of upstream `views-routes.ts` by `indexOf('        .then((result) => {'…)`. | Import `apps/app/src/runtime/view-navigation.ts` via bundle; the upstream host part needs an upstream export (D14 follow-up). | Upstream half stays text-anchored until upstream exports it. |
| 2 | manifest sources | P6 | 8 of 9 sources are `vendor/eliza` files: the model is mostly of upstream code. | Keep (product half is live); list upstream export as follow-up. | — |
| 3 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; product side imported; upstream side ported once upstream exports the waiter.
