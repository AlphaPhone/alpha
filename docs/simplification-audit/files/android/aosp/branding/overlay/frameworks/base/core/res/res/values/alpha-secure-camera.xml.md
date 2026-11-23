# android/aosp/branding/overlay/frameworks/base/core/res/res/values/alpha-secure-camera.xml
- Lines: 2 | Role: Framework RRO value `config_cameraDoubleTapPowerGestureEnabled=true` (double-press Power opens camera). | Verdict: DELETE (owner confirm) or KEEP
- Importers: Built into `AlphaFrameworkOverlay`. Only reference by name: `android/aosp/branding/secure-camera-inputs.json:4` (which nothing reads). sha256 `7685aa4b...` equals the recorded hash of `vendor/alphaphone/secure-camera/overlay/frameworks/base/core/res/res/values/config.xml` (an upstream-owned overlay, see `scripts/aosp-secure-camera-contract.ts:3`). Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | C7 / D4 | Byte copy of the secure-camera static overlay that `branding.mk:3-4` already keeps compiled into the base framework (`PRODUCT_ENFORCE_RRO_EXCLUDED_OVERLAYS += vendor/alphaphone/secure-camera/overlay`). Two homes for one value; an RRO re-asserting a value the base package already has changes nothing unless the static overlay is absent. | If the product always includes `vendor/alphaphone/secure-camera`, delete this file, its SystemUI twin, `secure-camera-inputs.json` and the comment half "as well as the explicit Alpha overlays" in `branding.mk:3`. If the Alpha branding must work without that packet, keep it and say so in `branding.mk`. | Low-medium: camera double-press is a safety/UX default; verify `cmd overlay lookup android android:bool/config_cameraDoubleTapPowerGestureEnabled` on an image. |
| 2 | 2 | NEW (test contradicts tree) | `test/aosp-cloud-power-defaults.test.mjs:18-22` claims "camera ... policies remain stock" by asserting `config_cameraDoubleTapPowerGestureEnabled` is absent from `config.xml`, while this sibling file in the same RRO sets it. | Delete that assertion (T1 source-text test) or point it at the real rule; do not let it suggest the overlay leaves camera stock. | None. |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines) if the owner confirms the secure-camera packet is always present; otherwise unchanged.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
