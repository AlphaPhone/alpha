# test/aosp-cloud-power-defaults.test.mjs
- Lines: 35 | Kind: source-text (regex over AOSP overlay XML, Android.bp, branding.mk, AndroidManifest.xml) | Verdict: DELETE
- Covers: the branding framework overlay sets default assistant + long-press-Power-for-assistant, leaves other power behaviours stock, and `AlphaAssistActivity` is declared disabled and unexported. Duplicates: `AlphaAssistActivity` disabled/unexported is enforced on the built APK by `scripts/apk.ts:149-169` (`distributionProblems`, tested by `test/apk-alpha-tile-policy.test.mjs`); the overlay files are copied byte-exact by `test/aosp-fresh-presets.test.py` test 2. Callers/importers: `npm test` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-23 | T1 | Asserts literal values in a committed XML resource file: a test that the file says what it says. | Delete. | Low: a wrong overlay value is only observable on a booted image; no host test can prove it either way. |
| 2 | 13-15 | T1 | Regex over `Android.bp` and `branding.mk` text. | Delete. | none |
| 3 | 26-34 | T1, T4 | Manifest regex duplicating the build-output audit in `scripts/apk.ts`. | Delete. | none |

## Proposed end state
Gone. The real release rule (assist entry disabled) stays in `verify-apks`; image overlay values are verified by an
image boot check, not by reading the XML.
