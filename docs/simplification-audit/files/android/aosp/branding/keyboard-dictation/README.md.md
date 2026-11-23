# android/aosp/branding/keyboard-dictation/README.md
- Lines: 46 | Role: explains how LatinIME's mic key reaches `AlphaKeyboardDictationService` via the framework default-voice-IME overlay, and the qualification checklist | Verdict: MERGE into `android/aosp/branding/README.md` (section)
- Importers: none (doc). Text/path pins: none. Behaviour is covered by `test/aosp-fresh-presets.test.py:82-96` (overlay staged and matches the launcher service), `test/keyboard-dictation.test.mjs`, `specs/quint/native/manifest.json:3216`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-15 | NEW (app behaviour documented in OS packet) | Paragraph describing app-side dictation semantics (Direct vs Cloud billing, Cancel/Back fences, password fields) duplicates the app code/PRD; it will drift from `AlphaKeyboardDictationService.java`. | Keep only the OS binding facts (lines 3-7, 17-28) in the branding README; drop app behaviour. | Low |
| 2 | 30-46 | B5 | Qualification and "source checks do not establish" text, duplicated across branding READMEs. | Keep one checklist line; drop disclaimers. | — |
| 3 | 36-40 | — | Correctly names `test/aosp-fresh-presets.test.py` and its env vars; that test is itself not wired into CI (git grep `aosp-fresh-presets`: only READMEs). | Note for the tests chunk. | — |

## Local types and helpers
None.

## Proposed end state
Deleted here; ~15-line "Keyboard dictation binding" section in `branding/README.md`.

## Verification
None (documentation).
