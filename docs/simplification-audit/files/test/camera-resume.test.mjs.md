# test/camera-resume.test.mjs
- Lines: 42 | Kind: tests 1-3 unit of upstream code (`.eliza/client-features/plugins/plugin-native-camera/src/host-ports.ts` `restartAfterResume`); tests 4-5 source-text (regexes over `prototype/camera-adapter.ts` import lines and local variable names) | Verdict: DELETE
- Covers: after "Don't allow" a resume never re-asks for the camera; a grant in Android settings restarts on return; the adapter uses the shared rule and shared session (no local copies). Duplicates: `vendor/eliza/plugins/plugin-native-camera/src/host-ports.test.ts` (upstream tests of `restartAfterResume`); device behaviour is the API 36 emulator finding in the comment. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-26 | T5 / P5 | Tests upstream `restartAfterResume`, which upstream already tests. | Delete; confirm the "never requests, only reads" case exists upstream, else D14 follow-up. | Low |
| 2 | 27-42 | T1 | Eleven regexes on adapter source, including exact import lines and "no `let phase`" anti-copy checks. | Delete. | None |
| 3 | - | - | The user-visible behaviour (deny → resume → no second dialog) needs Android. | Instrumentation (`CameraPermissionInstrumentedTest` or similar) if the owner wants it; not a host test. | Medium |

## Proposed end state
Deleted. Upstream keeps the decision tests; the adapter wiring is exercised by the camera journey (permission denied →
Open settings → granted on return restarts the preview, with the Camera bridge fake).
