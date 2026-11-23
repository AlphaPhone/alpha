# scripts/aosp-capability-overlay.ts
- Lines: 27 | Kind: script helper (AOSP staging: image provisioning RRO binding of the shared upstream generator) | Verdict: KEEP; MERGE `aosp-image-capability.ts` callers' import here or into `stage-aosp.ts`
- Covers: Alpha's overlay identifiers (`AlphaImageCapabilityOverlay`) and two one-line bindings of upstream `image-capability.mjs`. Duplicates: `aosp-image-capability.ts` binds the same upstream module. Callers/importers: `scripts/stage-aosp.ts:6` (`writeAospCapabilityOverlay`); `test/aosp-capabilities.test.mjs` (`ALPHA_IMAGE_PROVISIONING`, `assertAlphaProvisioningDefault`; that test also has a source-text check at :53).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-27 | A7 | `assertAlphaProvisioningDefault` is used only by its test. | Delete, or call it from `stage-aosp.ts`/`verify-apks.ts` where the APK's `aosp-capabilities.xml` is admitted (then it is a real release gate). | Low |
| 2 | — | C5 | Two files bind one upstream module. | One `scripts/aosp/image-capability.ts` exporting the overlay constants plus the `writeImageCapability` import that `stage-aosp.ts` needs. | None |

## Proposed end state
One small binding module for `image-capability.mjs` (or the constants inline in `stage-aosp.ts`). `test/aosp-capabilities.test.mjs` source-text part deleted (T1).
