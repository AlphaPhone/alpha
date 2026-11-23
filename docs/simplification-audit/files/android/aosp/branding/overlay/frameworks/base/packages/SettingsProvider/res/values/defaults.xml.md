# android/aosp/branding/overlay/frameworks/base/packages/SettingsProvider/res/values/defaults.xml
- Lines: 5 | Role: SettingsProvider RRO: default device name "Alpha Phone". | Verdict: KEEP
- Importers: Built into `AlphaSettingsProviderOverlay` (`Android.bp`). Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| - | - | - | No finding. | - | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 5 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
