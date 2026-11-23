# specs/quint/refinement/application/committed-view-observation.mjs
- Lines: 72 | Kind: Quint refinement harness over a transplant fixture (fixture concatenates upstream and Alpha sources in `vm`) | Verdict: KEEP harness, PORT its fixture
- Covers: Alpha's `ViewNavigationClient.observeCommittedView` (`apps/app/src/runtime/view-navigation.ts`) against upstream `ViewInteractionHost`/pending-request map/view installations: receipt caching per view, host waiter retirement, genuine timeout, lost positive receipt, visibility, explicit retry. Duplicates: `test/committed-view-observation.test.mjs` uses the same fixture with plain asserts. Callers: `test/quint-committed-view-observation.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T2 (fixture) | `test/fixtures/committed-view-observation.mjs` reads nine source files as text (eight under `vendor/eliza/packages/{core,agent}` plus `apps/app/src/runtime/view-navigation.ts`), strips types, deletes `import` lines and `export ` keywords by regex, concatenates and runs in `vm`; it also slices `views-routes.ts` between `const preparedBase = currentViewState;`, `        .then((result) => {` and `\n        .catch`. | PORT the fixture: esbuild-bundle `view-navigation.ts` and the upstream host modules from `.eliza/client-features` (the projected copy, not `vendor/eliza` directly) with ports for transport/history; the route callback slice needs an upstream export (D14 follow-up) or is replaced by calling the host's public settle API. | M |
| 2 | 20-23 | B5 | Hashes the fixture, strip-types helper and support as inputs. | Use module graph once bundled. | L |
| 3 | — | T4 | Plain-assert host test `test/committed-view-observation.test.mjs` exercises the same modes. | Delete the host test once this campaign covers its modes (it does: before/after/deadline/disposed/retired/... ). | L |
| 4 | — | P6 | Most of the code under test is upstream; the model still pins Alpha's client half, so it is live. | Keep. | — |

## Proposed end state
Harness unchanged; fixture bundles real modules instead of concatenating stripped text; duplicate host test removed.
