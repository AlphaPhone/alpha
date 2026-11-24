# scripts/publish-update-manifest.ts
- Lines: 109 | Kind: release step (CLI with exported `main`) | Verdict: KEEP, SIMPLIFY
- Covers: copies the admitted release APK to `artifacts/app-stable/alpha-phone-<versionCode>.apk`, inspects the copy's signing family and writes `alpha-update-stable.json` for phones. Duplicates: admission checks of `admitUnitApk`. Callers/importers: `deliver-app-update.ts` (publish-qualified-app-update.yml); test `publish-update-manifest.test.mjs` (5 cases); Quint `services/protected-app-update-promotion.mjs` references it; listed in `quint-lib.ts runtimeScriptPaths`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-57 | B3 | Re-checks `distributable`, `signed`, `signerMatches` on the row after `admitUnitApk` already refused any row with release blockers (which include those). | Rely on `admitUnitApk`; keep one error path. | low (confirm `releaseBlockers` names all three) |
| 2 | 30-43 | C3 | Hand arg parser. | Shared parser. | none |
| 3 | 63 | D7 | `main(argv, {root, log, error, inspectApk})` injection points serve tests. | Acceptable for an integration test of the CLI; keep `root`, drop `inspectApk` injection if the test can use a real fixture APK. | low |
| 4 | 12 | A8 | Comment cites `apps/app/src/prototype/settings-adapter.ts parseUpdateManifest`; re-check the path after the renderer restructure. | Update reference when files move. | none |
| 5 | 89 | B3 | Hex check of `signerRootSha256` returned by our own inspector. | Drop (inspector's contract). | none |

## Proposed end state
~85 lines; `publish-update-manifest.test.mjs` stays as the integration test of the update-publishing path (fixture manifest + APK → manifest JSON), merged with `record-release.test.mjs` into `test/release-publication.test.mjs`.
