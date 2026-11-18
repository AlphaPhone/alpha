# android/aosp/product.json
- Lines: 24 | Role: Cuttlefish AOSP product descriptor (`PRODUCT_DESCRIPTOR`) used by `scripts/stage-aosp.ts`; validated by upstream `cuttlefish-product.mjs`. | Verdict: KEEP (one-key trim)
- Importers: `scripts/stage-aosp.ts:22`. Text pins: `test/aosp-product-lock.test.mjs:43-45` (`separateLocks.pixel10a`, `physicalProduct`), `test/verify-apks.test.mjs` (`hostPackages`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23 | A7 | `"physicalProduct": "android/aosp/pixel10a-product.json"` has no code reader: not in `scripts/`, not in `vendor/eliza/packages/os/scripts` (grep `physicalProduct`: only this file and `test/aosp-product-lock.test.mjs:45`). | Delete key and the test assertion; the description sentence already names the Pixel descriptor. | Low |
| 2 | 13-16, 18 | — | `hostPackages` and `signer.platformCertificateSha256` are `UNSET`, so `--production` staging refuses by design until filled. | None (owner fills when Cuttlefish production staging is needed). | — |

## Local types and helpers
None.

## Proposed end state
23 lines (without `physicalProduct`).

## Verification
`node --test test/aosp-product-lock.test.mjs test/verify-apks.test.mjs`.
