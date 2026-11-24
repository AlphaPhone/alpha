# test/reset-startup.test.mjs
- Lines: 167 | Kind: host-JVM integration (real `AlphaDataReset`, `AlphaApplication`, upstream `DataReset`) + source-text | Verdict: MERGE test 1 into Gradle `AlphaDataResetTest.java`; DELETE test 2
- Covers: Pending data reset retries with a bounded budget, shows recovery instead of a launcher restart loop, starts no runtime work before dispatch, never resumes the old runtime, stays package-scoped. Duplicates: none for the startup sequence; `reset-cloud-revocation` covers the revocation step. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; calls `scripts/prepare-patched-native.ts`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-146 | D | Real classes with ~20 Android stand-ins written inline; one 90-line `main` covering about 15 behaviours (#409 launcher loop, start reasons, corrupt counters). | Move to Gradle; split into named test methods per behaviour; reuse one shared Android stub set (research: 127 stub files). | Medium |
| 2 | 153-167 | T1 | Regexes over upstream `DataReset.java`, `AlphaDataReset.java`, `AndroidManifest.xml`, `ResetRecoveryActivity.java`. | Delete; the manifest `:reset_recovery` process belongs in the `verify-apks` packaged-manifest check if anywhere. | Low |
| 3 | 12 | cost | `preparePatchedNative` runs at import time. | Gradle task dependency instead. | Low |

## Proposed end state
- `AlphaDataResetTest` with one method per behaviour; no source regexes.
