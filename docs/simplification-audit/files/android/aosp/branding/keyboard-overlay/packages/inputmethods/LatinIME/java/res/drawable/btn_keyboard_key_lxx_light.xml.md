# android/aosp/branding/keyboard-overlay/packages/inputmethods/LatinIME/java/res/drawable/btn_keyboard_key_lxx_light.xml
- Lines: 13 | Role: state-list drawable for ordinary LatinIME keys in the LXX light theme, overriding the upstream drawable of the same name with Alpha colours from `values/alpha-keyboard.xml`. | Verdict: KEEP
- Importers: `values/alpha-keyboard.xml` (`KeyboardView.LXX_Light` `keyBackground`); upstream LatinIME theme styles by resource name. Text/path pins: none by name. The whole `keyboard-overlay/` tree is copied byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` and compiled into LatinIME through `branding.mk:6-7` (`PRODUCT_PACKAGE_OVERLAYS`, static overlay). No test reads it (`test/aosp-fresh-presets.test.py` compares only `overlay/`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-12 | D8 | Namespace prefix is `ns0:` (`<selector xmlns:ns0="http://schemas.android.com/apk/res/android">`), the artefact of a one-off Python ElementTree rewrite; no generator exists in the repo (grep `ns0`: only the 8 keyboard drawables). | Rename the prefix to `android:` in all 8 drawables in one formatting commit. Bytes change, meaning does not. | None (aapt resolves the URI, not the prefix). Restage changes the staged hash; no receipt pins it. |
| 2 | 1-13 | C5 | Dark/light twins differ only in colour names, plus light uses `key_action_background_*` for `state_active` (lines 3-4) where dark uses the pressed colour. | None: Android resources cannot be parameterised by suffix without a theme attribute LatinIME does not offer. | - |

## Local types and helpers
None.

## Proposed end state
Unchanged apart from the `android:` prefix. 13 lines.

## Verification
No automated check renders the keyboard. Only an AOSP image build + on-device keyboard look (light and dark) proves it; an APK build does not.
