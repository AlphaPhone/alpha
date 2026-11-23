# android/aosp/branding/overlay/frameworks/base/packages/SystemUI/res/values/strings.xml
- Lines: 5 | Role: SystemUI RRO: renames System UI and its tuner to "Alpha System UI" / "Alpha System UI Tuner". | Verdict: KEEP
- Importers: Built into `AlphaSystemUIOverlay`. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4 | D11 (minor) | File name `strings.xml` is generic while siblings use `alpha-*.xml`; staging merges `alpha-system-entry.xml` into the same directory. | Optional rename to `alpha-labels.xml` (path is only staged by directory walk; no pin). | None. |

## Local types and helpers
None.

## Proposed end state
Unchanged, 5 lines.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file.
