# android/aosp/pixel10a-ota-channel.json
- Lines: 30 | Role: the signed OTA channel descriptor for Pixel 10a (OTA cert and AVB key digests, recovery images, drill status). | Verdict: KEEP
- Importers: `scripts/sign-aosp-release.ts`, `scripts/aosp-ota-update.ts`, `scripts/enroll-release-keys.ts:73` (writes `avbPublicKeySha256`), referenced by path from `pixel10a-product.json:46` `ota.channel` and `android/signing/alpha-key-manifest.json`. Text pins: `test/aosp-release-signing.test.mjs`, `test/aosp-retain-known-good.test.mjs`, `test/owner-sign-aosp-release-edges.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A8 | `description` narrates provenance ("(issue #400)") and policy prose; no code reads `description` (grep of readers). | Drop "(issue #400)"; keep the rule sentence. Cosmetic. | — |
| 2 | 12-13 | C6 | `otaCertificateSha256` and `avbPublicKeySha256` duplicate `pixel10a-product.json` `avb.publicKeySha256` and `android/signing/os-custody-expected.json`; they are written by `scripts/enroll-release-keys.ts:70-73`, so they are generated mirrors, not hand-kept. | None (generator owns them). | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (30).

## Verification
`node --test test/aosp-release-signing.test.mjs test/aosp-retain-known-good.test.mjs test/owner-sign-aosp-release-edges.test.mjs test/enroll-release-keys.test.mjs`.
