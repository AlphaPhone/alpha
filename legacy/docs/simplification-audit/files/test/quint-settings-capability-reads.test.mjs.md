# test/quint-settings-capability-reads.test.mjs
- Lines: 95 | Kind: Quint replay with inline transplant driver | Verdict: MERGE into `test/quint/refinement.test.mjs` after PORT
- Covers: SettingsCapabilityReads traces agree with the Settings adapter's Gmail capability read (10 s limit, abort) and licence loader. Duplicates: Not in an aggregate. Settings capability behaviour also in `test/comms-settings.test.mjs`, `test/diagnostics-export.test.mjs` and Playwright `settings-truth.production.spec.ts`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-28 | T2/T10 | Slices `prototype/settings-adapter.ts` between four text anchors, strips types and runs it in a vm with 30 fake globals. | PORT: export `createCapabilityReads({cloud, fetch, timers})` from a settings module (refreshCapabilities, loadLicenses, unmount reset) and import it in a driver under `specs/quint/refinement/application/`. | Medium |
| 2 | 15-17 | T1 | Three regexes pin call sites in the adapter source (`void refreshCapabilities(true)` etc.). | Delete. | Low |
| 3 | 32-84 | layering | The replay driver lives in the test file instead of beside the model. | Move it into `specs/quint/refinement/application/settings-capability-reads.mjs`. | Low |

## Proposed end state
- Driver in specs imports the exported capability-read factory; runner row SettingsCapabilityReads.
- No source regex.
