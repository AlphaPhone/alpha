# android/aosp/branding/keyboard-overlay/packages/inputmethods/LatinIME/java/res/drawable/btn_keyboard_key_popup_lxx_dark.xml
- Lines: 5 | Role: pressed/transparent background for keys in the more-keys popup, dark theme. Overrides the upstream LatinIME drawable of the same name. | Verdict: KEEP
- Importers: `values/alpha-keyboard.xml` (`MoreKeysKeyboardView.LXX_*` `keyBackground`). Text/path pins: none by name. The whole `keyboard-overlay/` tree is copied byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` and compiled into LatinIME through `branding.mk:6-7` (`PRODUCT_PACKAGE_OVERLAYS`, static overlay). No test reads it (`test/aosp-fresh-presets.test.py` compares only `overlay/`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-4 | D8 | `ns0:` namespace prefix (see `btn_keyboard_key_lxx_dark.xml.md` finding 1). | Use `android:`. | None. |
| 2 | 1-5 | C5 | Twin of `btn_keyboard_key_popup_action_lxx_dark.xml` except the normal state is `@android:color/transparent`. | Optional: replace one of the identical pair with a values alias (`<drawable name="...">@drawable/...</drawable>` is not valid for state lists; an `<item type="drawable" name="btn_keyboard_spacebar_lxx_dark">@drawable/btn_keyboard_key_popup_action_lxx_dark</item>` in `alpha-keyboard.xml` is). Saves one 5-line file per theme; not worth the indirection unless the overlay is regenerated anyway. | Low; static-overlay alias resolution must be checked in a LatinIME build. |

## Local types and helpers
None.

## Proposed end state
Unchanged (5 lines), `android:` prefix.

## Verification
AOSP image build with LatinIME and an on-device keyboard look in both themes (long-press a key for the popup).
