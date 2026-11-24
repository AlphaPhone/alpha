# android/aosp/branding/overlay/frameworks/base/packages/SystemUI/res/values/alpha-navigation.xml
- Lines: 7 | Role: SystemUI RRO: three-button fallback layout Back/Home/IME-switcher (no Recents) and a transparent gesture handle. | Verdict: KEEP
- Importers: Built into `AlphaSystemUIOverlay`. Described by `android/aosp/branding/README.md:55` and `hidden-navigation-handle/README.md`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| - | - | - | No finding. | - | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 7 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
