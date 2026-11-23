# android/aosp/branding/home-back-keyboard-inputs.json
- Lines: 47 | Role: per-file base and patched SHA-256 for the nine Launcher3/LatinIME files touched by `home-back-keyboard.patch` | Verdict: DELETE (or KEEP if X1 wires the patch into staging, then reshape as a manifest)
- Importers: none. git grep `home-back-keyboard-inputs`: only `branding/README.md:65`. No script, test or spec reads it. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / B5 | Pin file with no consumer: nothing checks `baseSha256`/`sha256` before or after applying `home-back-keyboard.patch`, and the patch itself has no hash pin anywhere. README.md:65 claims it "binds each source edit". | If the owner wires the patch into staging (X1), convert this into a `manifest.json` in the same shape as `core-launcher/manifest.json` (`project`, `revision`, `patch`, `patchSha256`, `files[{path, beforeSha256, afterSha256}]`) — note it spans two projects (Launcher3, LatinIME), so two manifests or a project field per row. Otherwise delete. | Low |
| 2 | 1-47 | — | No revision pins for Launcher3 / LatinIME here; `hidden-navigation-handle/manifest.json:4` pins Launcher3 `c612e6e…`, `keyboard-dictation/source-inputs.json` pins LatinIME `afe0d5c…`. | Fold into X1 manifest. | — |

## Local types and helpers
None.

## Proposed end state
Deleted (−47), or replaced by a ~30-line manifest consumed by staging.

## Verification
None today. After X1: `python3 test/aosp-fresh-presets.test.py` and the stage plan.
