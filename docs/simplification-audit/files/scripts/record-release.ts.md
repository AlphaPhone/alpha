# scripts/record-release.ts
- Lines: 89 | Kind: owner release tool (manual CLI) | Verdict: KEEP (owner confirm it is still run), SIMPLIFY
- Covers: after a release is distributed, admits both release rows via `admitUnitApk`, checks they share version, and writes `lastRelease` into `android/release-signer.json` (dry run by default). That value gates every later build in verify-apks. Duplicates: none (only writer of `lastRelease` besides hand editing). Callers/importers: no npm/CI/doc caller; tests `record-release.test.mjs` (3), `publish-update-manifest.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | A7 | No documented caller; it is part of the release procedure though. | Add an npm alias `release:record` and a README release step, or delete if the owner edits the JSON by hand. | none |
| 2 | 29-34 | D7 | `isCalendarDate` exported for a unit test. | Keep inside; test through `main`. | none |
| 3 | 36-47 | C3 | Hand arg parser. | Shared parser. | none |
| 4 | 67-69 | B3 | Re-validates `versionCode`/`versionName` of rows `admitUnitApk` already admitted. | Keep the equality check of the two variants; drop the rest. | low |

## Proposed end state
~60 lines with an npm alias; its test merges with `publish-update-manifest.test.mjs` into one release-publication integration test.
