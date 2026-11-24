# test/quint-delegation-receiver.test.mjs
- Lines: 58 | Kind: Quint replay with source transplant (slices `runtime/cloud-delegation-ui.tsx` between `export function delegationCancelStep(` and `export function CloudDelegationPanel(`, strips types, imports as `data:`) + two regex asserts on the source | Verdict: PORT and MOVE (to `specs/quint/refinement/application/delegation-receiver.mjs`, registered in the runner)
- Covers: the Cancel decision of the Cloud delegation panel follows DelegationReceiver on every Cancel step (300 random walks) and its full 8-row decision table. Duplicates: `test/cloud-delegation-callback.test.mjs` covers the panel's callback/start/status steps (named in the header). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-18 | T2, T10 | Slices an exported function out of the file instead of importing it. `delegationCancelStep` is already exported. | PORT: `import {delegationCancelStep} from apps/app/src/runtime/cloud-delegation-ui.tsx` (bundled with the shared loader, it pulls React). | Low |
| 2 | 19-21 | T1 | Two regex assertions pin exact source text of the panel's two calls to `delegationCancelStep`. Prettier (D9) breaks them. | Delete; the integration test of the panel covers the call sites. | Medium |
| 3 | 55-57 | — | Full decision table of a pure function: cheap, keep inside the driver. | Keep. | None |
| 4 | 12-14 | C3 | Private regex parse of scenario/witness names (same as connection-controller, maps). | Shared `modelNames`. | Low |

## Proposed end state
Driver imports `delegationCancelStep`, replays DelegationReceiver traces, checks the table; registered in the application index. Depends on owner question Q-HOST-5 (is the delegation panel in scope); if retired, delete with the model.
