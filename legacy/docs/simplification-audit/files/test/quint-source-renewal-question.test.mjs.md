# test/quint-source-renewal-question.test.mjs
- Lines: 58 | Kind: Quint replay + two mounted scenarios | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: A retired renewal question cannot publish its refusal into the replacement binding; a renewal tap stays pending when the composer is unavailable; mounted source matches SourceRenewalQuestion. Duplicates: Replay: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`) (`checkSourceRenewalQuestion`, index.mjs:87,120). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-52 | carry | Two scenarios drive the mounted hosted-digest panel via `withHostedDigestRefresh` (real `hosted-digest-ui.tsx` with stubs). They are the only coverage of the cross-binding and pending-tap cases outside the model. | Add both as named scenarios to SourceRenewalQuestion.qnt (or check they are), then keep only the runner row. | Medium |
| 2 | 54-58 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 11). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |

## Proposed end state
- Runner row; scenarios live in the model.
