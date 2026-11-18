# test/product-identity.test.mjs
- Lines: 156 | Kind: source-text (regex over upstream `app.gradle`, `consumer-host.mjs`, `AndroidManifest.xml`, `home-shell.ts`, `main.tsx`), a TypeScript-AST lint of `localStorage` keys, constants checks, plus small real calls (`hostIdentity`, `validateMobileProductRegistration`, `alphaThemeVariables`) | Verdict: DELETE most; MOVE manifest rules to `scripts/verify-apks.ts`; MERGE 2 cases into `test/tooling/android-build.test.mjs`
- Covers: package identity (`ai.alphacompute.alphaphone`, "Alpha Phone") flows from `app.config.json`; manifest backup off and authorities scoped to `${applicationId}`; storage keys carry an Alpha prefix; theme supplies every palette variable used. Duplicates: `scripts/apk.ts:264` already fails a wrong package in the built APK; `test/android-host.test.mjs` covers `hostIdentity`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 68-71 | T1 | Asserts two constants of `app.config.json` equal two literals. | Delete. | Low |
| 2 | 73-85 | T1/T5 | Regex over **vendor** `app.gradle` and `consumer-host.mjs`. `hostIdentity('.')` call is real. | Keep the `hostIdentity` assertion in `test/tooling/android-build.test.mjs`; delete the vendor regexes (upstream owns them). | Low |
| 3 | 87-95 | T1 | `allowBackup="false"`, authorities and task affinities prefixed with `${applicationId}`. Real release rules. | Move to `scripts/verify-apks.ts` on the merged manifest (it already parses `allowBackup` in `apk.ts:36`). | Low |
| 4 | 97-114 | T1 | TS-AST scan of every `localStorage` call for an `alpha.`/`alphaphone:` prefix, with a historical-key allow list and a self-test (109-114). A lint, not a test; the self-test is T5. | Delete, or turn into an eslint rule if the owner wants it. | Low |
| 5 | 119-130 | T3 | Validates the product registration with upstream validator and pins three installed storage names. | Keep one case (registration validates and matches `app.config.json`) in the android-build tooling file. Persisted names stay byte-identical by G5, not by a test. | Low |
| 6 | 132-142 | T1 | Every retained storage name still appears in source text; regex on `home-shell.ts`/`main.tsx`. | Delete. | Low |
| 7 | 144-156 | T1 | Collects `var(--x)` names from all sources and checks the theme defines them. | Delete; visual journeys and the dark/light screenshots cover a missing variable. | Low |

## Proposed end state
File deleted. `verify-apks` checks backup off and `${applicationId}`-scoped authorities/affinities on the built APK.
`test/tooling/android-build.test.mjs` keeps `hostIdentity` + "product registration validates and matches app.config.json".
