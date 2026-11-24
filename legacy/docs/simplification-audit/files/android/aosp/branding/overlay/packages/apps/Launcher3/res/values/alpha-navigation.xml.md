# android/aosp/branding/overlay/packages/apps/Launcher3/res/values/alpha-navigation.xml
- Lines: 5 | Role: Launcher3 RRO: turns on `config_alpha_home_back_only` (resource added by `home-back-keyboard.patch`) and labels Launcher3 "Alpha Navigation". | Verdict: KEEP
- Importers: Built into `AlphaNavigationOverlay`. `config_alpha_home_back_only` is declared by `android/aosp/branding/home-back-keyboard.patch` and required by `hidden-navigation-handle/manifest.json` / `apply.py` (`requiredExistingResource`) and `test_hidden_handle.py`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| - | - | - | No finding. | - | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 5 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file. `hidden-navigation-handle/apply.py` checks the default-off resource exists in source.
