# android/aosp/pixel10a-product.json
- Lines: 45 | Role: production descriptor for the Pixel 10a image (lunch targets, source lock digest, signer and AVB digests, release flags), validated by upstream `releaseDescriptorProblems`. | Verdict: KEEP
- Importers: `scripts/aosp-pixel10a.ts:11` (`PIXEL10A_PRODUCT`), `scripts/aosp-release-record.ts`, `scripts/enroll-release-keys.ts` (writes digests), `scripts/sign-aosp-release.ts`; referenced from `android/aosp/product.json:22` (`physicalProduct`) and `android/signing/alpha-key-manifest.json`. Text pins: `test/aosp-pixel10a.test.mjs`, `test/pixel10a-source.test.mjs`, `test/aosp-product-lock.test.mjs:45`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Schema owned by upstream (`pixel10a-release.mjs`, `aosp-release-signing.mjs`); every key has an upstream reader (`chainedPartitions`, `apexPayloadAvbPublicKeySha256`, `deviceAcceptanceVerified` verified by grep). | None. | — |
| 2 | 18-21 | C6 | `sourceLock.sha256` duplicates `build-host/manifest.json` `baselineLockSha256` (enforced by `test/aosp-staging-patches.test.mjs:59`). | None; coordinated edit on lock bumps. | — |
| 3 | 3 | — | Long `description` prose; harmless. | None. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (45).

## Verification
`node --test test/aosp-pixel10a.test.mjs test/pixel10a-source.test.mjs test/enroll-release-keys.test.mjs`.
