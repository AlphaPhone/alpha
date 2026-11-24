# test/login-surfaces.test.mjs
- Lines: 448 | Kind: source-text inventory (T1, ~12 tests over Alpha and `vendor/eliza` Java/TS/XML) + upstream suite re-run (T5) | Verdict: DELETE (with `test/support/login-surfaces.mjs`)
- Covers: issue #404 / P-20 password-manager fill: every credential field is inventoried, website fills bind to engine-attested HTTPS origins, secrets stay out of observations and logs. Duplicates: `test/browser/login-field-reporter.spec.ts` (the injected reporter, executed), `scripts/verify-apks.ts` (pins web VIEW intent filters in the merged manifest, per the file's own comment at 231), upstream `plugin-native-browser-surface/test/native-host/policies.node.mjs`. Callers/importers: `npm test` glob; it is the only importer of `test/support/login-surfaces.mjs` (grep of test, scripts, specs, .github, apps, android: only these two files).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-70, 257-310 | T1 / D15-like | Tree walkers + regex "detectors" over every renderer and Android source to force each credential-looking field into a prose inventory; `compactPattern` exists only to survive reformatting. Every UI change touching an input edits the inventory. | Delete; move the inventory prose (surfaces, remaining device gates) to `docs/` if the owner wants it as documentation. | Low |
| 2 | 123-188, 311-327, 363-448 | T1 + T5 | Slices `vendor/eliza/.../BrowserTabHostPlugin.java`, `BrowserLoginFields.java`, `BrowserFieldOrigin.java`, `PasswordFormPolicy.java`, `CloudConnectionPolicy.java` by `indexOf` and matches tokens. Upstream code; upstream tests own it. | Delete. | Low |
| 3 | 243-251 | T1 + P3 | Calls `preparePatchedNative` (stages the patched native tree, slow) only to regex `CloudSignInPlugin.java`. | Delete. | None |
| 4 | 353-361 | T5 / T9 | Spawns `node --test` on the upstream `policies.node.mjs` (180 s timeout, needs JDK). | Delete; the upstream CI runs it. | Low |
| 5 | 329-347 | T1 | "Secrets stay out of logs": regex over `alpha-client.ts`, `agent-adapter.ts` and Java `Log.*(` calls. | Delete. A production-gating check that matters belongs in `audit-production-bundle.ts` (no credential field names in observation payloads) only if the owner asks. | Low |
| 6 | 211-241 | T1 | Manifest intent-filter parsing duplicates `scripts/verify-apks.ts`, which checks the built APK. | Delete; `verify-apks` is the real gate. | None |

## Proposed end state
Test file and `test/support/login-surfaces.mjs` deleted. Website-login origin binding stays covered by
`test/browser/login-field-reporter.spec.ts` (fold into `journeys/browser.spec.ts`), manifest exposure by `verify-apks`,
and the device-only gates remain the instrumentation/acceptance items the inventory itself called "remainingGates".
