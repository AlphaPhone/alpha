# test/sign-release-apks.test.mjs
- Lines: 312 | Kind: tooling (imports `scripts/sign-release-apks.ts` `main` with injected `run`/`digest`, stub `apksigner`; two cases use the real SDK `apksigner`/`aapt2`/openssl, skipped without SDK) | Verdict: KEEP (trim)
- Covers: Release signing outside Gradle: key-file, PKCS#11 and PKCS#12 modes, secrets only via environment, verify-before-replace, test-mocks and removed-profile builds refused, rotation approval scope. Duplicates: none (only test of this release tool); `verify-apks.test.mjs` covers the verifier it calls. Callers/importers: `npm test` glob; script is called by `.github/workflows/release-app-signing.yml` and `release-cloud-app-signing.yml`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-101 | A1 | Refuses `runtimeProfile:"cloud"` and `localEmbeddings` build records "for a removed profile": a legacy-record check. Keep only if old `build-config.json` files can still reach the signer (they cannot after a fresh build). | Owner question; otherwise drop those two records. | Low |
| 2 | 152-159 | T3 | `toolMessage` unit case of stack-frame trimming. | Drop or keep as one row; cheap. | Low |
| 3 | 221-282 | T8/cost | Real-tool cases spawn aapt2, openssl and a JVM (several seconds) and skip silently without SDK. | Keep; they are the only proof the PKCS#11 JVM option works. | Low |
| 4 | 16-20 | C3 | `scratch(t,prefix)` temp-dir helper duplicated across tooling tests. | Move to `test/support/tmp.mjs` when the release-tooling suite is assembled. | Low |

## Proposed end state
Stays (release-gating tool). Optional: fold into a `test/release-tooling/` folder with `verify-apks`, `source-snapshot` and
`strict-build-inputs`, sharing the scratch-dir helper.
