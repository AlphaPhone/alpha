# test/keyboard-dictation.test.mjs
- Lines: 119 | Kind: mixed. (1) host-JVM unit test (`KeyboardDictationPolicy.java` + `test/fixtures/KeyboardDictationPolicyTest.java`); (2) source-text over launcher/main manifests and `alpha_keyboard_dictation.xml`; (3) Quint trace conformance (runs `quint test` and `quint run` of `specs/quint/native/KeyboardDictation.qnt`, writes a Java conformance harness); (4) javac compile check against android-36 `android.jar` with 5 stub classes; (5) host-JVM authority test of `KeyboardDictationCloud` with 7 stub classes and a fake `URLStreamHandlerFactory` | Verdict: DELETE
- Covers: voice IME (launcher only) fences duplicate/cancelled/replaced results and changed field/account; Direct vs Cloud route ownership and stale results. Duplicates: (1)+(3) `specs/quint/refinement/native/keyboard-dictation.mjs` + `KeyboardDictationTraces.java` (run from `specs/quint/refinement/native/index.mjs`) replay the same model against the real policy; (5) `specs/quint/native/KeyboardDictationCloud.qnt` (authority/provider mutation, failed request, settle) replayed by `test/quint-keyboard-dictation-cloud.test.mjs` (31 traces); (2) `test/apk-keyboard-dictation.test.mjs` + `scripts/apk.ts` `distributionProblems` check the IME permission/subtype in the built APK; (4) the APK build compiles the service. Callers/importers: `npm test` glob; sole importer of `test/fixtures/KeyboardDictationPolicyTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-46 | T4, T10 | A second, private Quint conformance runner for a model the native refinement runner already replays; spawns quint twice (40 traces × 30 steps, notable runtime) and reads `generation` by reflection. | Delete; the manifest-driven runner owns it. | Low |
| 2 | 12-19 | T1 | Manifest/XML regexes. The built-APK audit already enforces the permission; launcher-only and `isAuxiliary` belong there too. | Delete; if `isAuxiliary`/`imeSubtypeMode=voice` are release rules, add them to `distributionProblems`. | Low |
| 3 | 48-66 | T1, B5 | A compile-only check with stubbed collaborators against a locally installed SDK: the Gradle build is the real check. | Delete. | Low |
| 4 | 68-119 | T3, T4 | 50-line Java harness in a template string, 7 hand-written stubs; covered by the KeyboardDictationCloud Quint replay. | Delete. | Low |
| 5 | 9-11 | T3, T4 | Policy unit fixture; same transitions as the Quint replay. | Delete with `test/fixtures/KeyboardDictationPolicyTest.java`. | Low |

## Proposed end state
File and `test/fixtures/KeyboardDictationPolicyTest.java` deleted. Coverage stays with the two KeyboardDictation Quint
replays and the APK distribution audit (add the voice-subtype attributes there if they are release rules).
