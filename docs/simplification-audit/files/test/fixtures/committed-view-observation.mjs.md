# test/fixtures/committed-view-observation.mjs
- Lines: 87 | Kind: transplant (strips 8 upstream `vendor/eliza` files + `view-navigation.ts` by regex into one vm; slices a `.then` callback out of upstream `views-routes.ts` and `new Function`s it) | Verdict: DELETE as a test fixture; the Quint harness PORTs (and the upstream part goes upstream)
- Covers: agent-prepared view navigation: navigate/claim/result handshake between `ViewNavigationClient` (Alpha) and upstream `ViewInteractionHost`, with lost replies, foreign client, revoked installation, deadlines, hidden page. Duplicates: `test/committed-view-observation.test.mjs`, `test/quint-committed-view-observation.test.mjs` (wrapper). Callers/importers: those two tests and live Quint `specs/quint/refinement/application/committed-view-observation.mjs` (in `application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T2 | `transform` deletes all `import ... ;` blocks and `export` by regex over upstream source and concatenates 8 files in one scope. | Import the real modules (Alpha `view-navigation.ts` via the loader; upstream via the `.eliza` projection alias). | High |
| 2 | 48-51 | T10 | Cuts the route's settlement callback between `'        .then((result) => {'` and `'\n        .catch'` after `'const preparedBase = currentViewState;'` in `vendor/eliza/packages/agent/src/api/views-routes.ts`: pins upstream text, breaks on any upstream bump. | Upstream should export the settlement function (D14 follow-up); until then the harness should drive the route through its exported handler. | High on every upstream advance. |
| 3 | 7, 10-18 | T5 | Reads the raw `vendor/eliza` checkout rather than the prepared `.eliza` projection; mostly tests upstream code. | Keep only the Alpha client side here. | Medium |
| 4 | 28-32 | T3 | Fake `ElizaError`, role gate, asset binders, `ENABLED_MVP_VIEWS`. | Gone with real imports. | - |

## Proposed end state
Delete with `test/committed-view-observation.test.mjs`. The Quint driver imports `ViewNavigationClient` from `apps/app/src/runtime/view-navigation.ts` and the upstream host through the projection; the callback slice is replaced by an upstream export (cross-file action, upstream). A journey (`journeys/chat.spec.ts`: "agent opens Calendar") covers the visible result.
