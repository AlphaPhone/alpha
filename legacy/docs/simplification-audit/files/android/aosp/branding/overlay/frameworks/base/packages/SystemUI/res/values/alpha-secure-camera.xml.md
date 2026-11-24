# android/aosp/branding/overlay/frameworks/base/packages/SystemUI/res/values/alpha-secure-camera.xml
- Lines: 2 | Role: SystemUI RRO value `config_cameraGesturePackage=com.android.camera2`. | Verdict: DELETE (owner confirm) or KEEP
- Importers: Built into `AlphaSystemUIOverlay`. Only by-name reference: `secure-camera-inputs.json:9` (unread). sha256 `df234816...` equals the recorded hash of `vendor/alphaphone/secure-camera/overlay/frameworks/base/packages/SystemUI/res/values/config.xml`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | C7 / D4 | Same duplication as the framework `alpha-secure-camera.xml`: a byte copy of the secure-camera static overlay already compiled into SystemUI (`branding.mk:3-4`). | Delete together with the framework twin and `secure-camera-inputs.json` once the owner confirms the secure-camera packet is always in the product. | Low-medium; verify camera gesture package on an image. |

## Local types and helpers
None.

## Proposed end state
Deleted, or unchanged at 2 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
