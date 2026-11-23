# test/cloud-resident-embedding-route.test.mjs
- Lines: 70 | Kind: integration (development Cloud resident host via `fixtures/product-character-host.mjs`, then the pinned SDK's real routing/settings/capability code under Bun); skipped unless the prepared SDK is present | Verdict: MERGE into `test/tooling/cloud-resident-host.test.mjs`
- Covers: a fresh lean or full dev host enables canonical Cloud embeddings in the spawned environment without writing the token to `eliza.json`; a saved owner routing (omitted, disabled, explicit) is never migrated, repaired or filled. Duplicates: `test/cloud-resident-full-profile.test.mjs` (same fixture, same skip guard, same `recordingLauncher`), `test/cloud-resident-host.test.mjs` ("Gmail and embeddings keep their Cloud owner"). Callers/importers: `npm test` glob; CI runs it un-skipped in `browser.yml` verify, `android.yml` and `resident-prepare.yml` (`ALPHA_REQUIRE_PREPARED_SDK=1`) — three lanes (P3).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T2 | `createCloudResidentHost` comes from `product-character-host.mjs`, which reads `scripts/cloud-resident-host.ts` as text, strips types and runs it in `vm` although the script exports `createCloudResidentHost` directly. | Import `scripts/cloud-resident-host.ts` directly; keep only the core-state fixture setup from the helper. | Low |
| 2 | 12, 14-16 | C3 | Skip guard and `recordingLauncher` copied verbatim in `cloud-resident-full-profile.test.mjs`. | One copy in the merged file. | None |
| 3 | 57 | T4 | 3 choices x 2 profile modes = 6 Bun spawns (20 s timeout each); the profile mode does not change the saved-route rule. | Keep 3 cases (one mode). | Low |
| 4 | 1-70 | P3 | Same un-skipped run in three workflows. | Run the prepared-SDK lane once (resident-prepare). | None |

## Proposed end state
Three cases in `test/tooling/cloud-resident-host.test.mjs` under one `prepared SDK` describe block: fresh host enables Cloud embeddings (lean and full in one loop), saved routing is preserved byte-for-byte (three choices), executed in one prepared-SDK CI lane.
