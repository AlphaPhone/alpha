# android/aosp/branding/overlay/frameworks/base/core/res/res/values/alpha-keyboard-dictation.xml
- Lines: 6 | Role: Framework RRO value: `config_systemSpeechRecognizer` = `ai.alphacompute.alphaphone` (the app is the system speech recogniser, used by keyboard dictation). | Verdict: KEEP
- Importers: Built into `AlphaFrameworkOverlay` (`Android.bp`, `resource_dirs: overlay/frameworks/base/core/res/res`). Text pins: `test/aosp-fresh-presets.test.py:85-88` parses `config_systemSpeechRecognizer` from the staged copy (not run by any runner); `android/aosp/branding/keyboard-dictation/README.md:17` names the file. Staged byte-for-byte into `vendor/alphaphone/branding/` by `scripts/stage-alpha-os-branding.py:105-108` (whole `overlay/`, `keyboard-overlay/`, `manifests/` trees); `test/aosp-fresh-presets.test.py:77-78` asserts every `overlay/` file is copied byte-exact (that test is not run by any runner, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4 | NEW (misleading comment) | Comment talks about IMMS enabling "the preinstalled auxiliary voice IME"; the one resource set here is `config_systemSpeechRecognizer`, which selects the system `RecognitionService` package, not an IME. | Replace with one line: `<!-- System speech recogniser: Alpha keyboard dictation. -->`. | None. |
| 2 | 3-5 | D8 | One-space indentation, unlike every sibling (4 spaces). | Reformat with the comment fix. | None. |
| 3 | 5 | C6 | Package id literal `ai.alphacompute.alphaphone` (also `config.xml:5`, `provision/AlphaWelcome.java:68`, `power-voice/*.patch:93`, `system-entry/prepare.py:46`). Resource XML cannot import `app.config.json`. | Keep; the package id is pinned by `test/product-identity.test.mjs` style checks elsewhere. | - |

## Local types and helpers
None.

## Proposed end state
Same value, 4-line file with a correct comment.

## Verification
Only an AOSP image build plus on-device readback (`cmd overlay list`, `cmd overlay lookup`) proves an RRO; `npm run verify` and the APK builds do not touch this file. `test/aosp-fresh-presets.test.py` (manual) checks the staged value.
