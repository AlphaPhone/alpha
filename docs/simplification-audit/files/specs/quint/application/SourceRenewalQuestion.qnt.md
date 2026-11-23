# specs/quint/application/SourceRenewalQuestion.qnt
- Lines: 100 | Kind: Quint model (live: manifest, 7 scenarios, 4 invariants) | Verdict: KEEP
- Covers: a notification "Ask" reviews one exact source-renewal tap, re-reads and settles natively, and only then composes a question for the current digest binding. Duplicates: `test/source-renewal-question.test.mjs` (29 lines, esbuild-bundles `source-renewal-question.ts` with stub ports: a unit test of the same rules, T3/T4). Callers/importers: manifest; harness `refinement/application/source-renewal-question.mjs` (92) + `hosted-digest-refresh.mjs` (197); per-model test `test/quint-source-renewal-question.test.mjs` (58) and the aggregate `refinement/application/index.mjs` (runs twice, T4); product comments in `runtime/source-renewal-question.ts`, `runtime/hosted-digest-ui.tsx`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — (good) | The harness bundles the real `hosted-digest-ui.tsx` with esbuild and replaces only ports (`source-renewal-question.ts`, `hosted-notice-question.ts`, `content-question.ts`, `../build-flags`, `cloud-delegation-ui`) — it runs the module, it does not slice text. | Keep; when `hosted-digest-ui.tsx` moves to `runtime/digests/` (cross-file-actions §826) update the entry path. Its `build-flags` stub becomes unnecessary once flags come from one module (D5). | Low |
| 2 | test | T4 | Campaign runs in `test/quint-source-renewal-question.test.mjs` and again in `test/quint-application-refinement.test.mjs`. | Run once (one manifest-driven runner, see ci-and-formal). | Low |
| 3 | test | T3 | `test/source-renewal-question.test.mjs` re-tests the same admission rules with stubs. | DELETE it; the model replay covers it. | Low |
| 4 | 43-44 | — | `sensitivity`/`conversation` toggles are unconstrained environment actions; correct modelling. | None. | — |

## Proposed end state
Model unchanged. Hosted digest/source renewal is a live managed-service feature mounted in `main.tsx:330`, not a D5 deletion. One replay entry point (aggregate or per-model, not both); the stub unit test goes.
