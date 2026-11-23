# android/aosp/branding/overlay/frameworks/base/core/res/res/values/colors.xml
- Lines: 41 | Role: Framework RRO colours: DeviceDefault/Material accent, background, surface and Material 3 system palette roles in Alpha blue / near-black. | Verdict: KEEP
- Importers: Built into `AlphaFrameworkOverlay`. No name-level reference in repo. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D8 | Comment sits between the XML declaration and `<resources>`; fine, but wording "inherit full native UI and behavior" is vague. | Optional: move inside `<resources>`. | None. |
| 2 | 4-40 | C6 | Palette literals duplicated in `keyboard-overlay/.../alpha-keyboard.xml`, `config.xml:10`, provision Java (`Color.rgb(5,5,5)`), `system-entry/manifest.json:87-88`. | No shared mechanism across RROs/Java; document palette once in `branding/README.md`. | - |

## Local types and helpers
None.

## Proposed end state
Unchanged, 41 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
