# scripts/render-assetlinks.ts
- Lines: 438 | Kind: release tool (CLI + library) | Verdict: KEEP, SIMPLIFY (split manifest-filter helpers out; import the upstream Cloud validator)
- Covers: renders `assetlinks.json` from `android/release-signer.json`, prints the `ELIZA_ANDROID_ASSET_LINKS_JSON` Cloud value, checks a published file/URL; also hosts the APK-manifest App Link/VIEW-filter checks `verify-apks.ts` uses. Duplicates: `cloudEntryProblems` (249-272) mirrors upstream `vendor/eliza/packages/cloud/shared/src/lib/auth/android-asset-links.ts` `parseAndroidAssetLinksConfig` (dependency-free, exported). Callers/importers: `scripts/verify-apks.ts:52`, `scripts/cloud-readiness.ts:43`, `scripts/audit-production-bundle.ts:11`; README.md:236-238; tests `assetlinks-cloud-config`, `auth-callback-manifest`, `cloud-readiness`, `release-signing`, `verify-apks` (`.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 236-272 | C7 / A2 | Hand mirror of Cloud's validator (`maxBytes`, `maxEntries`, package/fingerprint regexes, relations); drifts silently when upstream changes. | Import `parseAndroidAssetLinksConfig`, `ANDROID_ASSET_LINKS_ENV`, `ANDROID_ASSET_LINKS_RELATIONS` from the vendored module; `cloudEntryProblems` becomes a 5-line adapter mapping its `reason` to a message. | Medium: error text changes (tests assert messages). |
| 2 | 124-229 | D11 / D10 | Manifest intent-filter analysis (`appLinkFilters`, `requiredAppLinkProblems`, `webViewFilters`, `webViewFilterProblems`) has nothing to do with rendering assetlinks; only `verify-apks.ts` uses it. `ManifestNode` is re-declared here (54-58) though `scripts/apk.ts:14` exports it. | Move these four functions to `scripts/apk.ts` (next to `parseXmlTree`) and import `ManifestNode` from there. | Low |
| 3 | 128-148 vs 163-185 | C5 | Two parsers for the same filters: `appLinkFilters` scans raw `aapt dump xmltree` text by indentation, `requiredAppLinkProblems` uses the parsed tree. | Re-implement `appLinkFilters` on the parsed tree (`parseXmlTree`) and delete the text scanner. | Low |
| 4 | 60-66, 117-122 | B1 | Malformed `--debug-fingerprint` values and an unreadable `apk-manifest.json` are silently ignored, so a typo disables the debug-certificate refusal. | Throw on a malformed CLI value; let a corrupt manifest throw (an absent one stays `[]`). | Low |
| 5 | 373-392 | C3 | Hand-rolled arg parser. | `node:util` `parseArgs` with `multiple: true` for the repeated flags. | Low |
| 6 | 126 | A8 | JSDoc `@returns` in a typed TS file. | Delete. | — |
| 7 | 397-398 | C3 | `JSON.parse(fs.readFileSync(...))` twice; same `readJson` as ~30 scripts. | Use `scripts/lib` `readJson`. | — |

## Proposed end state
~250 lines: template rendering, the published-file check and the Cloud-config printer, validating Cloud
entries with the upstream function. Manifest filter checks live in `apk.ts` beside the tree parser.
Tests: keep one CLI integration test (render + check + cloud-config against a fixture root) and drop
message-by-message unit cases.
