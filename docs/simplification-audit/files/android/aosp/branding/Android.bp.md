# android/aosp/branding/Android.bp
- Lines: 48 | Role: Soong definitions of the five product runtime resource overlays (Framework, SystemUI, Settings, SettingsProvider, Launcher3 navigation) | Verdict: KEEP
- Importers: copied verbatim into `vendor/alphaphone/branding/Android.bp` by `scripts/stage-alpha-os-branding.py:103-104`; module names listed in `branding.mk:5`. Text/path pins: `test/aosp-cloud-power-defaults.test.mjs:13-14` regex-matches the `AlphaFrameworkOverlay` block (`name: "AlphaFrameworkOverlay",\s*manifest:[^\n]+\s*resource_dirs: [...]`) (T1); `test/aosp-fresh-presets.test.py:78` byte-compares every staged branding file with the source.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-48 | — | Five near-identical blocks (`product_specific: true, certificate: "platform", sdk_version: "current"`). Soong has no cheap parametric form short of a `defaults {}` module. | Optional: add `runtime_resource_overlay_defaults`-style `defaults` only if a sixth overlay is added; not worth it for five. No change. | — |
| 2 | — | T1 | `test/aosp-cloud-power-defaults.test.mjs:13` pins this file's layout by regex. | When T1 tests are retired, the real gate is the AOSP build of the staged product. Do not reformat this file before that test is removed or the regex is relaxed. | Low |

## Local types and helpers
None.

## Proposed end state
Unchanged, 48 lines.

## Verification
`node --test test/aosp-cloud-power-defaults.test.mjs`; `python3 test/aosp-fresh-presets.test.py` (hand-run; not wired into CI); an AOSP image build is the only real proof.
