# test/browser/accessibility-sweep.production.spec.ts
- Lines: 93 | Kind: Playwright sweep on the `production` project (flag-off bundle), 76 tests | Verdict: **MERGE** into `journeys/accessibility.spec.ts` (run in both projects, parametrised by build)
- Covers: the same names, roles, focus, contrast, clipping and reading-order rules over `LIVE_STATES`, plus the launcher Apps drawer and the signed-in Google accounts page, on the production bundle in portrait and landscape. Duplicates: `accessibility-sweep.spec.ts` (same rules and states on the dev server). This file is the one that audits the shipped build (research tests-browser line 478). Importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-93 | C5 / T4 | This is an `x.spec` + `x.production.spec` twin: the same state list and audit composition in two files. | One spec file. `harness/states.ts` marks which states are available in production (`live`, plus the two production-only states). The `production` project runs the same `describe('sweep')` with a `build` fixture. | Low |
| 2 | 3, 63 | A1 | `LIVE_STATES` includes the `legacyNotes` states (see `accessibility-states.ts.md` #1). Under the production bundle these open the Older-notes source. | They disappear together with the states. | High (these break once legacy notes is deleted) |
| 3 | 17-46 | T7 | `PRODUCTION_APPS_STATE` wraps `Capacitor.nativePromise` inside `addInitScript` to add `listLauncherApps`. This duplicates `launcherBridge` (`accessibility-states.ts`) and `device-apps-stub.ts`. | Use `harness/plugins/launcher.ts` on top of `flagOffAndroid`. | Low |
| 4 | 36-38 | – | It asserts that the sign-in expiry notice is absent. That is a connection behaviour, not accessibility. | Move to `journeys/connection-cloud.spec.ts`, or drop it if that journey already covers it. | none |
| 5 | 69-70, 87-88 | C3 | The `exposedTabStopBudget` special case for "live Settings licenses" is repeated (as in the dev sweep). | Move it onto the `State`. | none |
| 6 | 11-13 | – | The comment says large text runs on dev only, because the scale is applied through a source module. `accessibility-sign-in.production.spec.ts` already has a production text-zoom (`zoomText`). | Once `harness/text-scale.ts` holds both variants, consider running 200% in production as well. That would let the dev 200% lane shrink to dev-only states (owner choice: dev versus production for large text). | Low |

## Proposed end state
Delete this file. The production project runs `journeys/accessibility.spec.ts`'s sweep with
`states.filter(s => s.production)` (live states plus the launcher Apps drawer and Google accounts, provided through bridge
fixtures). It runs portrait and landscape, using the same `a11y.audit` profiles as dev.
