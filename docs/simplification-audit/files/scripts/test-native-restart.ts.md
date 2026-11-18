# scripts/test-native-restart.ts
- Lines: 254 | Kind: Android device campaign (prepare in one process, force-stop, verify in a new process; crash-log case requires a real uncaught crash) | Verdict: KEEP as a manual campaign, MOVE to `test/android/campaigns/restart.ts`, SIMPLIFY (delete the legacy migration case)
- Covers: text scale, bookmarks, browser sign-in vs private tab, Inbox drafts, Notes documents, SAF selected document and source reference, crash log, accessibility at 200 % font, theme - each across a real process restart. Duplicates: browser specs cover the storage halves (e.g. theme), not process death. Callers/importers: `scripts/android-instrumentation.ts:149-298` notes; `test/android-instrumentation-runner.test.mjs:121,608` (reads this file's text: T1); `test/native-restart-runner.test.mjs`, `test/fixtures/isolated-native-campaign.mjs:149`; `test/browser/saved-signin-retry.production.spec.ts` comment; Java comments in 6 instrumented tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72-81 | A1 | `notes-secure-migration`: legacy localStorage Notes layout migrated into the encrypted slot (D1 retires legacy readers). | Delete the case together with `NotesSecureStorageInstrumentedTest#secureMigrationProcessRestartPhase` and the `android-instrumentation.ts:250` note. | Low (D1) |
| 2 | 154-189 | C3 | Raw `am instrument` + `pidof` + vendor `requireInstrumentationInterruption` import duplicate `test-native-permissions.ts:137-249`. | Shared `instrumentExpectingCrash()` in `native-test-fixture.ts`. | Low |
| 3 | 199-200 | - | Comment admits the second `stop()` is redundant. | Delete it. | None |
| 4 | 214-246 | B3 | PID parsing from instrumentation log with exact-one-match regex. | Keep (only proof of a distinct process for these cases). | - |
| 5 | whole | T5 | Text and runner tests of this script (`android-instrumentation-runner.test.mjs`, `native-restart-runner.test.mjs`) test the test machinery. | Delete those tests. | None |

## Proposed end state
~200 lines under `test/android/campaigns/restart.ts`, 10 cases, shared crash/pid helpers, no host tests reading it.
