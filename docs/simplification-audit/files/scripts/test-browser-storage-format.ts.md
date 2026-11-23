# scripts/test-browser-storage-format.ts
- Lines: 17 | Kind: device campaign wrapper (calls `runNativeFixture` for one instrumentation method) | Verdict: MERGE into the `scripts/android-instrumentation.ts` registry (one entry with `runnerArgs`), delete the file
- Covers: installed browser bookmark/session/site-permission records keep their persisted format through the real Keystore codec (`BrowserStorageFormatInstrumentedTest#installedBrowserRecordsKeepTheirFormat`). Duplicates: none. Callers/importers: only listed as a string in `CAMPAIGN_RUNNERS` (`android-instrumentation.ts:316`, comment "Added on main while the reachability check was being written"), which makes the class count as reachable for `test/android-instrumentation-runner.test.mjs`. No workflow or package.json script runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D4 | A 17-line wrapper whose only content is arguments to `runNativeFixture`; the registry in `android-instrumentation.ts` already models class + args. | Add a registry entry `BrowserStorageFormat: {args:{disposableBrowserStorageFixture:'1'}, ...}` and drop the script and its `CAMPAIGN_RUNNERS` line. | L |
| 2 | 4-6 | C3 | Positional argv parsing repeated in every campaign wrapper. | Gone with merge. | L |

## Proposed end state
The persisted-format instrumentation class stays (G5: persisted formats are byte-identical) and is run by the instrumentation runner like any other class; no wrapper script.
