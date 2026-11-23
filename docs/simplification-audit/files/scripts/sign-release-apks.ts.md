# scripts/sign-release-apks.ts
- Lines: 363 | Kind: release CLI (APK signing ceremony) | Verdict: KEEP, SIMPLIFY
- Covers: signs the two unsigned release APKs with key files / PKCS#11 / PKCS12 keystore, checks each signer against `android/release-signer.json`, optionally applies an approved key-rotation lineage, then re-runs verify-apks and the SBOM. Duplicates: `insideGitWorkTree` (96-104) twins upstream `gitWorkTreeProblem` (re-exported by `sign-aosp-release.ts`); `fileDigest` (209-213) is one of ~40 sha256 helpers. Callers: `.github/workflows/release-app-signing.yml:84`, `.github/workflows/release-cloud-app-signing.yml:148,202`; `scripts/android-build-preflight.ts:290` (message); Quint `specs/quint/refinement/services/protected-app-update-promotion.mjs:51-59,204` and `specs/quint/services/manifest.json:2933` pin it; `test/sign-release-apks.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 256 | bug (PLAUSIBLE) | The rotation verifier is passed the hard-coded package `ai.elizaresearch.alphaphone`, but `app.config.json` appId is `ai.alphacompute.alphaphone` since the 2026-11-10 rename. `VerifyApkRotation.java:54` refuses "APK package differs from the reviewed migration package", so any rotation signing of the current package fails. | Owner question (D17 keeps the rotation block, Q-LEG-5): read the package from `app.config.json`, or delete the rotation path if no rotation applies to the new package. Not changed in this phase. | High for release signing if a rotation is attempted. |
| 2 | 291-293 | A8 | Refuses a `build-config.json` naming the removed runtime profile / `localEmbeddings`. | Delete the profile clause; keep the `testMocks` refusal. | Low |
| 3 | 96-104, 283 | C3 | Own git-work-tree walk. | Import upstream `gitWorkTreeProblem` (already used by the AOSP signer). | Low |
| 4 | 209-213 | C3 | Streaming sha256 helper. | Shared `scripts/lib` `sha256File`. | — |
| 5 | 307-309 | B4 | `if (apksigner === undefined) throw` after a branch that always yields a string. | Delete. | — |
| 6 | 215-242 | B3 (acceptable) | Long structural validation of the committed rotation record; it is the trust boundary (record is git-verified at 302-303). | Keep, but split the 11-clause condition into named checks with one message each (D9). | Low |
| 7 | 184-205 | C3 | Hand-rolled parser with a `valuedOptions` map. | `node:util` `parseArgs`. | Low |
| 8 | — | T10 | Quint `protected-app-update-promotion.mjs` regex-matches workflow text for `sign-release-apks.ts --keystore`. | Belongs to the formal port; note the pin when renaming flags. | — |

## Proposed end state
~280 lines; shared sha256/git helpers; no runtime-profile tombstone; rotation package read from
`app.config.json` (after owner answer). Keep `test/sign-release-apks.test.mjs` as the CLI integration test
(dry-run + fixture key files + fake apksigner).
