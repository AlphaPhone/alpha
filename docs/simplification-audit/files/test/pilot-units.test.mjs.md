# test/pilot-units.test.mjs
- Lines: 313 | Kind: tooling (real `provision-unit.ts`, `release-blockers.ts`, `qualify-head.ts` and `pilot-update.ts` on synthetic manifests, a real `zip`) + source-text (2 tests, plus regexes inside 2 others) | Verdict: MERGE into `test/release-tooling/pilot.test.ts` (drop the qualify-head and source-text cases)
- Covers: pilot unit provisioning admission (signer, versionCode, test-mocks, bundle audit, licence, runtime and voice blockers), APK self-consistency, `releaseBlockers`, package facts and data-domain readback, unit variant pinning, and head qualification (`verdict`, `candidateManifest`, `readCampaigns`, `recordCandidate`). Duplicates: `test/qualify-head.test.mjs` (qualify-head); `test/aosp-release-signing.test.mjs`, `test/licenses.test.mjs`, `test/font-license.test.mjs` (also call `releaseBlockers`); `test/update-apk-admission.test.mjs` (`provision-unit` admission helpers); the Quint `PilotApkUpdate` refinement (`updateAdmission`, `compareDomains`). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 133-152, 197-279, 167-180 | A7/T9 | `scripts/qualify-head.ts` has no npm or workflow caller; `research/scripts.md:643` proposes deleting it with its tests. Three tests plus the `releaseDistribution`/`verdict` half of "release blockers are named" exist only for it. | Delete them together with `qualify-head.ts` and `test/qualify-head.test.mjs` (owner question Q-SCRIPT qualify-head). | low |
| 2 | 145-147 | T1 | `fs.readFileSync("scripts/qualify-head.ts")` plus regexes for the `step(...)` lines. | Delete. | none |
| 3 | 302-310 | T1 | "The provisioning record keeps only its secret-free fields": a regex extracts the keys of `const record = {...}` from `provision-unit.ts`. | Delete. If the rule matters, `provision-unit.ts` builds the record from an exported allowlist and the merged test checks the written JSON. | low |
| 4 | 124-131 | T1 | Regexes on the `DOMAIN_SCRIPT` constant text. | Drop the constant regexes; keep the `readbackInventory` behaviour cases. | none |
| 5 | 100-111 | cost | Writes a 64 MiB file and zips it twice to prove streaming hashing. | Keep but shrink: assert the streaming path with a small file plus the "unreadable bundle" refusal. A 64 MiB write per `npm test` run proves a past bug, not a current rule. | low |
| 6 | 30-98, 113-131, 154-195 | — | Admission, blockers, `apkContradictions`, `packageFacts`, `readbackInventory`, `unitApkMismatch`, `parseUnitArgs`: the release-gating rules of a tool that installs onto real pilot phones. | Keep in `test/release-tooling/pilot.test.ts`; collapse the 25-line blocker matrix into one table-driven loop. | none |
| 7 | 46-73 | T4 | `releaseBlockers` is asserted here and in three other files. | Give `releaseBlockers` one home: the merged pilot file, or `release-tooling/release.test.ts`. | none |
| 8 | 18-27 | C3 | Local `sha` and `build` manifest writer; `apk-manifest.json` row shape re-declared (C1 `ApkManifest`, research `scripts.md:342`). | Use the shared `scripts/apk.ts` type and fixture. | none |

## Proposed end state
`test/release-tooling/pilot.test.ts` (with `pilot-update-export` and `pilot-rotation-journal`): about 120 lines covering unit
admission and the named-blocker list, APK self-consistency, readback parsing and comparison, variant pinning, and argument parsing.
Qualify-head tests go with `qualify-head.ts`. The source-text cases are deleted.
