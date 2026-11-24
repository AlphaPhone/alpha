# android/aosp/branding/overlay/packages/apps/Settings/res/values/alpha-navigation.xml
- Lines: 10 | Role: Settings RRO: Alpha copy for the gesture/button navigation chooser and the autoclick hint (Back/Home only). | Verdict: KEEP
- Importers: Built into `AlphaSettingsOverlay`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| - | - | - | No finding. | - | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 10 lines. User-visible copy; keep verbatim.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
