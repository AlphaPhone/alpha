# android/aosp/branding/keyboard-overlay/packages/inputmethods/LatinIME/java/res/values/alpha-keyboard.xml
- Lines: 115 | Role: Static LatinIME overlay: default theme id (4 = LXX dark), Alpha keyboard/spell-checker names, LXX light/dark colours and full re-declarations of six upstream LXX styles. | Verdict: KEEP (one implementer check)
- Importers: Compiled into LatinIME via `branding.mk:6-7` (`PRODUCT_PACKAGE_OVERLAYS` + `PRODUCT_ENFORCE_RRO_EXCLUDED_OVERLAYS`, because LatinIME private style attributes cannot be RRO-overridden). Its styles reference the 6 Alpha drawables in `../drawable/` and upstream-only drawables (`btn_keyboard_key_functional_lxx_*`, `more_keys_divider`, `suggestions_strip_divider_lxx_*`). Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); No test reads it. `android/aosp/branding/README.md:15,57-60` describes it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-61, 80-114 | C5 / D4 (suspected) | Six styles (`KeyboardView.LXX_Dark`, `MoreKeysKeyboardView.LXX_Dark`, `SuggestionStripView.LXX_Dark` and the Light trio) are copied wholesale from upstream LatinIME `keyboard-themes`/`themes-lxx-*`. Because our drawables and colours use the upstream *names*, most items (e.g. `<item name="keyBackground">@drawable/btn_keyboard_key_lxx_dark</item>`, `alphaObsoleted 70%`, `suggestionsCountInStrip`) are probably identical to upstream and override nothing. Upstream LatinIME is not in this repo, so this cannot be confirmed here. | Diff each style against the LatinIME revision pinned in `home-back-keyboard-inputs.json`; delete every `<item>` whose value equals upstream, and delete a whole style if nothing differs (likely survivors: `android:background` lines 28/42/53/81/95/106). Estimated 115 -> ~60 lines if the suspicion holds. | Medium: a static overlay replaces the whole style, so a partial style must keep `parent=`; verify by an AOSP LatinIME build and a visual check of keys, popup and suggestion strip in both themes. |
| 2 | 11-26, 62-79 | C6 | Product colours repeated as literals: `#0000FF` (5x), `#FAFAFA`, `#101010`, `#25335F`, `#8F9FFF`; the same blue/near-black also appear in `overlay/.../colors.xml`, `config.xml:10`, `provision/AlphaWelcome.java:27-31`, `AlphaAppearance.java:21-22,34`, `system-entry/manifest.json:87-88`. | None possible across separate APKs/RROs. Record the palette once in `android/aosp/branding/README.md` so the copies are known; no code change. | - |

## Local types and helpers
None.

## Proposed end state
Same file minus any style items that equal upstream (est. 60-115 lines). Names, colours and theme default unchanged.

## Verification
AOSP image build + on-device LatinIME light/dark look. No host test covers it.
