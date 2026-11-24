# test/fixtures/cloud-plugin-selection.mjs
- Lines: 18 | Kind: child-process helper (verifies the pinned SDK source, then runs the real upstream `collectPluginNames` per env variant under Bun) | Verdict: KEEP (move with its test into the connection-cloud/native-resident integration)
- Covers: the Cloud resident's full profile selects the expected SDK plugins for the default, `lean-chat` and `store` variants. Duplicates: none. Callers/importers: `test/cloud-resident-full-profile.test.mjs:105,115` (research: keep; skipped unless `ALPHA_CLOUD_COLLECTOR_SOURCE` and `ALPHA_BUN` are set).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 14 | - | Requires stdin `{config, variants}`. The importer's `collect()` helper (test lines 102-110) passes only `{config}`, which would throw at `for (const extra of variants)`; `collect` is never called (grep finds only its definition). | Delete the dead `collect()` in the test. | none |
| 2 | 10 | B5 | Re-verifies the vendor source against the lock in the child. | Fine if this is the only source check on that path; otherwise drop. | Low |
| 3 | - | T9 | Env-gated, but the gate is real: `.github/workflows/android.yml:72-77` exports `ALPHA_BUN` and `ALPHA_CLOUD_COLLECTOR_SOURCE`, so it runs in the Android lane and skips locally. | Keep; make the test run only in that lane rather than skip elsewhere. | Low |

## Proposed end state
Kept as the child entry of one native-resident integration test that runs in the Android lane (which sets the env). Dead `collect()` in the importer removed.
