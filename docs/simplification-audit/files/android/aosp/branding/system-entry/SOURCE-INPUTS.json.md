# android/aosp/branding/system-entry/SOURCE-INPUTS.json
- Lines: 116 | Role: Pinned frameworks/base revision and 22 SystemUI source files (path, beforeSha256, url) fetched into `.cache/baseline` for `prepare.py` and `test_native_plan.py`. | Verdict: SIMPLIFY
- Importers: `fetch.py:11` (all rows), `prepare.py:14,21` (`original()` looks rows up by path), `test_native_plan.py` (reads baseline files).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-14, 40-115 | B5 | 7 rows are read by neither `prepare.py` nor `test_native_plan.py` (checked by filename): `KeyguardQuickAffordanceConfig.kt`, `VideoCameraQuickAffordanceConfig.kt`, `ShadeHeaderController.kt`, `combined_qs_header_scene.xml`, `QrCodeScannerKeyguardQuickAffordanceConfig.kt`, `UserTracker.kt`, `ActivityIntentHelper.java` (review references only). Every fetch downloads them. | Delete the 7 rows (~35 lines) or flag them `"reference": true` and skip them in fetch. | Low (owner may value them as review context). |
| 2 | 8, 13, ... | C3 | Every `url` is `base + path` and `fetch.py:20` asserts exactly that. | Drop `url`; derive it in the fetch tool. | None. |
| 3 | 1-4 | C5 | Same schema as `core-launcher/SOURCE-INPUTS.json` (and `provision/source-inputs.json` with an extra `project` per row, different hash key `sha256`). | Normalise all packets to one schema `{project, revision, files:[{path, sha256}]}` read by one fetch tool. | Low; touches 3-4 packets and their scripts. |

## Local types and helpers
None.

## Proposed end state
~45 lines: project, revision, 15 `{path, sha256}` rows.

## Verification
Manual: `python3 fetch.py && python3 prepare.py && python3 test_native_plan.py` (needs network or an inputs dir).
