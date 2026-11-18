# specs/quint/refinement/native/reset-orchestration.mjs
- Lines: 140 | Kind: Quint refinement driver (host JVM; product `AlphaDataReset`, `AlphaApplication`, patched upstream `DataReset`/`DataResetCopy`/`ResetAuthorization`) whose Android ports are scraped from a host test file | Verdict: KEEP model; REWRITE the port source (own platform file); drop summary files
- Covers: Pending data reset at startup: authentication, retry budget, marker and reservation writes, Android `clearApplicationUserData` acceptance/refusal, listener results, directory-sync failure after commit, crash after commit, visible recovery, process exit. Model `ResetRecovery`. Duplicates: `test/reset-startup.test.mjs` exercises the same classes (its report: MERGE test 1 into Gradle). Callers/importers: `native/index.mjs:12,181` only (no dedicated test file; runs through the aggregate `test/quint-native-refinement.test.mjs`).

Text read: `test/reset-startup.test.mjs` with regex ``/\bput\('([^']+)',`([^`]*?)`\);/g``, `assert.equal(ports.size, 18)`, template literals evaluated with `vm.runInNewContext`. Port rewrites by anchor: `'calls++;return resetSaved;'` (SenseListenerClient), `'recoveries++;'` (Context), `'throw new Exit();'` (Process), the full `clearApplicationUserData` method text (ActivityManager), the full `Os.open` method text.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 16-32 | T10/C7 | The formal harness takes its Android stand-ins from a test file's source text and requires exactly 18 of them. The test-cleanup plan moves `reset-startup.test.mjs` to Gradle; when that happens this harness breaks. | Move the 18 port literals into `native/reset-platform.mjs` (or the shared stub set) now, owned by this harness; delete the scraping and the vm eval. | High (ordering with the test move) |
| 2 | 34-48 | T10 (stubs) | Five rewrites of stub text by exact strings to add observers. | Write the observer calls into the owned stub files directly. | Low |
| 3 | 105-107, 130-131 | B5/A7 | Writes `reset-orchestration-source-traces.json` and `reset-orchestration-summary.json` under `test-results/`; nothing reads them (`git grep` finds only this file). | Delete. | None |
| 4 | 108-129 | B5 | Per-trace `checkTraces` with a catch that re-reads the failed receipt to classify mismatch vs failed. | One `checkTraces` over all traces; let it throw. | Low |
| 5 | 92, 98 | B5 | `fixturePortSha256` stamped on every trace. | Delete. | None |
| 6 | 96-97 | — | `ResetAdmissionRegression.java` runs as a second JVM program; only its exit status matters (output is returned, never asserted). | Keep as a plain pass/fail step or fold its cases into the trace driver. | Low |

## Proposed end state
~50 lines: write owned ports, compile product + patched upstream reset classes, run traces and the regression program, one `checkTraces`. No dependency on any `test/*.test.mjs` text and no summary files.
