# test/quint-shade-pull.test.mjs
- Lines: 89 | Kind: Quint replay (real module bundle + shell fixture) + one scenario | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: ShadePull traces against `installSystemShade`/`openSystemShade` (real `prototype/system-shade.ts` bundled with esbuild, Android plugin stubbed); a late answer after unmount shows no fallback. Duplicates: `test/system-shade.test.mjs`, `test/system-shade-timeout.test.mjs` (host) cover the same request/timeout. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-20 | good | esbuild bundle of the real module with a stubbed specifier: the target harness shape. | Keep; move into `specs/quint/refinement/application/shade-pull.mjs`. | Low |
| 2 | 32, 77 | T10 | `shellCore` from `shell-core-fixture.mjs` slices `model.js` at seven text anchors (ci-and-formal §2.6). | PORT `shell-core-fixture` to import the shell class once `model.js` is split (cross-file-actions D1). | High (blocks on model.js split) |
| 3 | 73-89 | T3 | Hand-written scenario beside the model replay. | Add as a model scenario if not already one; then delete. | Low |

## Proposed end state
- Driver in specs; runner row ShadePull; host system-shade twins reviewed against it.
