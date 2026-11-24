# android/aosp/branding/overlay/frameworks/base/core/res/res/values/config.xml
- Lines: 27 | Role: Framework RRO config: default assistant = Alpha, long-press Power = assistant (5), Power+VolUp chord = power menu, notification colour, dark night mode, gesture nav mode and thin nav-bar dimensions. | Verdict: KEEP
- Importers: Built into `AlphaFrameworkOverlay`. Text pins: `test/aosp-cloud-power-defaults.test.mjs:6-34` reads and regex-parses this file (T1: values `config_defaultAssistant`, `config_longPressOnPowerBehavior`, `config_longPressOnPowerForAssistantSettingAvailable`, `config_keyChordPowerVolumeUp`, absence of five others, absence of `Settings.Secure|...`). Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | A4 / owner question | `config_defaultAssistant` = `ai.alphacompute.alphaphone` and long-press Power -> assistant, but the only ASSIST target `AlphaAssistActivity` ships `android:enabled="false" android:exported="false"` (`android/app/src/main/AndroidManifest.xml:124`, asserted by `test/aosp-cloud-power-defaults.test.mjs:25-32`) under P-78. On a production image long-press Power therefore resolves to no Alpha surface. PRD AP-06 says "hardware invocation included". | Owner decides P-78 (see chunk owner questions). If hardware invocation stays deferred, drop lines 3-7 (keep line 9 power-menu chord only if Power long-press is not reassigned); if it ships, the app manifest must enable the activity. Either way the image and app must agree. | Product behaviour; owner decision. |
| 2 | 3-4, 8 | A8 (minor) | Comment "belongs to the Cloud-first image too, independently of the optional offline listener" narrates a product debate. | Shorten to what the values do: `<!-- Long-press Power opens Alpha; Power+Volume Up keeps the power menu. -->`. | None (comments are stripped by the test regex). |
| 3 | 6-27 | D8 | Fine as is. | - | - |

## Local types and helpers
None.

## Proposed end state
27 lines (or ~22 if P-78 removes the assistant defaults).

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file. Re-run `node --test test/aosp-cloud-power-defaults.test.mjs` after any edit.
