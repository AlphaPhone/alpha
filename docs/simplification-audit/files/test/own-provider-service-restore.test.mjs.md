# test/own-provider-service-restore.test.mjs
- Lines: 108 | Kind: transplant (type-strips `runtime/connection-ui.tsx` between `let ownCloudServiceRestore:` and ``/** `admitted`:``, plus `recheckPlanOnReturn(` and `networkChanged(` methods and regex-matched top-level lines, runs in `vm`) + source-text (lines 41-45 order of strings inside `connectResident`/`recheckResidentPlan`) | Verdict: DELETE (carry 2 behaviours into `journeys/connection-cloud.spec.ts`)
- Covers: with Own inference selected, a saved Cloud sign-in restores optional Cloud services (Google etc.) using the exact credential without changing provider; restore failure keeps Own inference and the credential; stale restores cannot detach a newer service; network return while signed out reads only the stored sign-in. Duplicates: `test/browser/own-provider.production.spec.ts`, `provider-key-reconnect.production.spec.ts`; Quint `cloud-plan-recheck.mjs` slices the same `recheckPlanOnReturn(`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10, 74-75, 83-86 | T2, D7 | Three slice families over `connection-ui.tsx`, including a JSDoc marker (``/** `admitted`:``). | Delete. | None |
| 2 | 41-45 | T1 | Index-of ordering assertions on source strings. | Delete. | None |
| 3 | 21-36 | - | Own + saved Cloud sign-in: services restore, provider unchanged; Cloud failure keeps Own. | Journey: dev profile with Own provider and a stored Cloud credential; Google connector shows connected and the provider switch still shows Own; with the mock Cloud failing, provider stays Own and the credential is not removed. | Medium |
| 4 | 38-70 | - | Late/stale restore fences (epoch, credential reference, delayed absent read). | Drop; owned by the connection Quint models that slice the same code (to be ported to imports). | Low |
| 5 | 94-108 | - | Network return while signed out never calls Cloud. | Journey assertion with `context.setOffline` toggling and a request listener on the Cloud origin. | Low |

## Proposed end state
Deleted. Two journey cases in `journeys/connection-cloud.spec.ts`: Own provider with a saved Cloud sign-in restores services without changing provider (and keeps Own when Cloud fails), and a network return while signed out sends no Cloud request.
