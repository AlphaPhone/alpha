# android/app/src/launcher/res/xml/alpha_keyboard_dictation.xml
- Lines: 5 | Role: input-method metadata for `AlphaKeyboardDictationService` (one auxiliary voice subtype). | Verdict: KEEP
- Importers: `src/launcher/AndroidManifest.xml:59` (`@xml/alpha_keyboard_dictation`). Text/path pins: `test/keyboard-dictation.test.mjs:16` (reads file), `test/aosp-fresh-presets.test.py:96-97` (parses subtype), `specs/quint/native/manifest.json:3201`.

Platform-required IME metadata; no findings. Keep attribute values exactly (the AOSP preset test checks them).
