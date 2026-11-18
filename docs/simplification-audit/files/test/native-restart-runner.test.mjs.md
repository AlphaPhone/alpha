# test/native-restart-runner.test.mjs
- Lines: 150 | Kind: tooling (restart campaign `scripts/test-native-restart.ts` through `isolated-native-campaign.mjs`, ~27 child runs) | Verdict: MERGE into `test/tooling/native-campaigns.test.ts`; drop the `notes-secure-migration` kind
- Covers: each restart campaign owns its user and APKs, runs prepare/restore-or-verify/cleanup phases with force-stop between phases, needs distinct process ids, proves the crash-log crash, keeps the fixture user when termination is uncertain and still cleans up after failed preparation. Duplicates: refusal table as in the other runners. Callers/importers: `npm test` glob; shared fixture. (Working tree already removed the `notes` kind.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 43 | A1 | `notes-secure-migration` runs "the legacy localStorage Notes layout migrates into the encrypted slot" (`scripts/test-native-restart.ts:63-71`): a legacy reader (D1). | Delete the kind here, in the script, in `android-instrumentation.ts:248` and `NotesSecureStorageInstrumentedTest.secureMigrationProcessRestartPhase`. | None |
| 2 | 68-94 | T4 | Nine refusal modes; shared with the other runners. | Shared table once. | None |
| 3 | 14-66 | - | Per-kind phase gate table is real routing logic. | Keep as a table, one pass run per kind. | Low |

## Proposed end state
Restart section of the campaigns file: kind→gate/phases table (7 kinds), pid identity cases, crash-log cases,
uncertain-termination retention, prepare-failure cleanup, transport timeout.
