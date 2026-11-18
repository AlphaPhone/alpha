# test/aosp-retain-known-good.test.mjs
- Lines: 19 | Kind: package.json text check + upstream argument parser | Verdict: DELETE
- Covers: `npm run aosp:retain-known-good` script text, `ALPHA_OTA_DEFAULTS.channel` path, and upstream `parseArgs` refusals. Duplicates: the Alpha channel default is executed by `test/aosp-release-signing.test.mjs` test 6 (spawns `scripts/aosp-ota-update.ts check` and checks Alpha's channel identity); `parseArgs` belongs to vendor `aosp-ota-update.mjs`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | T1 | Asserts the literal text of a `package.json` script. | Delete. | none |
| 2 | 14-18 | T5 | Tests an upstream argument parser. | Delete. | none |

## Proposed end state
Gone.
