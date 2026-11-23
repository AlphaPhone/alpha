# android/aosp/pixel10a-composition.json
- Lines: 39 | Role: Alpha's Pixel 10a product composition consumed by the upstream composer (`vendor/eliza/packages/os/scripts/android/pixel10a-product.ts` `composePixel10aProduct` / `assertPixel10aSourceLayout`, `sense-listener.mjs`, `system-updater-staging.mjs`). | Verdict: KEEP
- Importers: `scripts/aosp-pixel10a.ts:12-18` (`PIXEL10A_COMPOSITION`, `readPixel10aComposition`), `scripts/stage-aosp.ts`, `scripts/aosp-listener.ts`, `scripts/aosp-capability-overlay.ts`, `android/sense/build.gradle`. Text pins: `test/aosp-pixel10a.test.mjs`, `test/always-on-listener.test.mjs` (`wakeNames`, `componentPackage`, `assistActivity`, `storageName`), `test/aosp-capabilities.test.mjs` (`imageProvisioning`), `test/aosp-secure-camera-policy.test.mjs` (`refuseLockScreenSurfaces`), `test/aosp-release-signing.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all keys | — | Every key is read upstream (verified by grep in `vendor/eliza/packages/os/scripts`: `sourceProfile`, `vendorDirectory`, `assistantRole`, `refuseLockScreenSurfaces`, `imageProvisioning`, `pixelConfig`, `systemUpdater`, `releaseConfig`, `wakeNames`, `storageName`). The schema is upstream's; nothing to delete locally. | None. | — |
| 2 | 23-32 | owner | `sense` block configures the always-on listener APK (P-78 wake listening), which research flags as not named in `docs/prd.md`. | Owner question (shared with android research §6 Q2). If P-78 is dropped, remove the block together with `android/sense`, `scripts/aosp-listener.ts`. | Medium |
| 3 | 14, 27 | C6 | `"ai.alphacompute.alphaphone"` package and `AlphaAssistActivity` class name are repeated across manifests and scripts. | Acceptable in a declarative descriptor; no change. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (39).

## Verification
`node --test test/aosp-pixel10a.test.mjs test/always-on-listener.test.mjs test/aosp-capabilities.test.mjs test/aosp-secure-camera-policy.test.mjs`; Pixel 10a staging dry run.
