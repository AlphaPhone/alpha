# android/aosp/branding/manifests/AlphaFrameworkOverlay.xml
- Lines: 5 | Role: RRO manifest: static, priority-999, code-less overlay package `ai.alphacompute.alpha.overlay.framework` targeting `android`. | Verdict: KEEP
- Importers: `android/aosp/branding/Android.bp` (`runtime_resource_overlay { name: "AlphaFrameworkOverlay", manifest: "manifests/AlphaFrameworkOverlay.xml" }`); module listed in `branding.mk:5` `PRODUCT_PACKAGES`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | C5 | Five manifests differ only in `package` and `targetPackage` (`AlphaFrameworkOverlay`, `AlphaNavigationOverlay`, `AlphaSettingsOverlay`, `AlphaSettingsProviderOverlay`, `AlphaSystemUIOverlay`). | None: Soong `runtime_resource_overlay` needs one manifest per module and has no templating. Keep. | - |
| 2 | - | T1 pin | `test/aosp-cloud-power-defaults.test.mjs:14` regex-matches the `Android.bp` block naming `manifests/AlphaFrameworkOverlay.xml`. | Keep the path, or update that test with it. | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 5 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
