# android/app/src/launcher/res/values/alpha_keyboard_dictation.xml
- Lines: 1 | Role: string resource `alpha_keyboard_dictation_name` ("Alpha voice typing"), the IME label and subtype label. | Verdict: KEEP
- Importers: `src/launcher/AndroidManifest.xml:56` (`@string/alpha_keyboard_dictation_name`), `res/xml/alpha_keyboard_dictation.xml:3`. Text/path pins: `specs/quint/native/manifest.json:3202`.

Data resource; user-visible copy. Shares its base name with `res/xml/alpha_keyboard_dictation.xml` (legal: different resource types). Could move into the flavor's general `strings.xml` if one exists, but no gain. No findings.
