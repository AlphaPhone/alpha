# test/browser/login-field-reporter.spec.ts
- Lines: 147 | Kind: Playwright setContent/route harness, `chromium`, 7 tests; no Alpha renderer. Reads `vendor/eliza/plugins/plugin-native-browser-surface/.../BrowserLoginFields.java` with `fs.readFileSync`, cuts the `SCRIPT = """…"""` text block and un-escapes it, then injects it into synthetic pages (T1, T2, T5) | Verdict: DELETE (move upstream, D14 follow-up)
- Covers: the upstream login-field reporter script: reports focus only for trusted focus of login fields in its own frame without origin, fills only registered fields of this document and origin, reports submit only on real submit, ignores cross-origin and cleartext frames, reports unload, reports once while loading. Duplicates: `android/app/src/androidTest/.../BrowserSigninsInstrumentedTest.java` (device-level sign-in fills, partly). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | T2, T10 | Slices a Java text block out of the vendor checkout by literal markers and undoes escapes; any upstream reformat breaks it. | Delete here; propose the same cases as a test inside `plugin-native-browser-surface` upstream, where the script can be a resource file. | Medium: until upstream adopts it, the reporter's origin/frame rules have no browser-level test in this repo. |
| 2 | 1-147 | T5 | Tests upstream code only; nothing of Alpha runs. | As above. | - |

## Proposed end state
File deleted. Upstream follow-up listed in `cross-file-actions.md` §6. Alpha keeps device coverage of saved sign-ins in the androidTest browser sign-in test and the browser journey's passwords section.
