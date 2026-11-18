# android/release-signer.json
- Lines: 43 | Role: reviewed release signing record: app signer digest, last recorded release, approved APK signing-key rotation (49→52) and the private producer approval for versionCode 52 | Verdict: KEEP (owner question on the rotation block)
- Importers (many): `scripts/build-android.ts:149-200` (validates `lastRelease`), `scripts/app-update-candidate.ts:110`, `scripts/sign-release-apks.ts:77,216` (`apkSigningRotation`), `scripts/update-apk-admission.ts:37,80`, `scripts/ci/admit-cloud-signing-input.py:34-50` (`privateProducerApproval`), `.github/workflows/release-cloud-app-signing.yml:157-183`, `scripts/record-release.ts` (writes `lastRelease`), `scripts/enroll-release-keys.ts` (writes `signerSha256`), `scripts/render-assetlinks.ts`, `scripts/verify-apks.ts` and ~20 more (grep `release-signer`). Text/path pins: `android/aosp/pixel10a-product.json`, `android/aosp/product.json`, `test/aosp-release-signing.test.mjs`, `test/app-update-candidate.test.mjs`, `test/cloud-signing-input.test.py`, `test/qualified-app-update.test.py`, `specs/quint/refinement/services/android-build-input-readiness.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-24 | A1? (owner) | `apkSigningRotation` "preserve the existing Alpha application identity, installed data and signature-protected receiver permission through the production signing-key rotation" (`fromVersionCode 49`, `previousSignerSha256 0438…`). The package was renamed on 2026-11-10 and `lastRelease` is all `null` (no distributed release recorded). If no device carries a build signed by the previous key under `ai.alphacompute.alphaphone`, a rotation lineage protects nothing. | Owner: confirm whether any build signed with `0438dccb…` was installed under the current package. If none, delete `apkSigningRotation` and the rotation code paths in `sign-release-apks.ts`, `update-apk-admission.ts`, `release-cloud-app-signing.yml` (steps 157-183), `scripts/owner/pilot-rotation.ts`. | High if wrong: an installed base would refuse the update. |
| 2 | 19-22, 38-41 | C6 | `unsignedApkSHA256` (standalone/launcher) recorded twice, in the rotation block and the producer approval. Different consumers (workflow line 158 compares `approval.unsignedApkSHA256` from the rotation; `admit-cloud-signing-input.py:50` reads the producer copy). | Keep one (producer approval) and have the workflow read it there. | Low; workflow edit. |
| 3 | 3 | A8 | Description tells the story of "app52" inputs. | Shorten to what the record is. | None |
| 4 | 5-9 | — | `lastRelease` nulls are a valid "nothing distributed" state validated by `build-android.ts:170-175`. | Keep. | — |

## Local types and helpers
None. Twin data: `signerSha256` equals `android/signing/os-custody-expected.json:17` `appSignerSha256` and `android/signing/public/fingerprints.json:84` (`alphaphone_app.certificateSha256`).

## Proposed end state
~40 lines (or ~25 without the rotation block): `schema`, `description`, `signerSha256`, `lastRelease`, `privateProducerApproval`, plus `apkSigningRotation` only if an installed base exists.

## Verification
`node --test test/aosp-release-signing.test.mjs test/app-update-candidate.test.mjs test/sign-release-apks.test.mjs test/update-apk-admission.test.mjs`; `python3 test/cloud-signing-input.test.py`; `python3 test/qualified-app-update.test.py`; `npm run android:build:local` (preflight reads it).
