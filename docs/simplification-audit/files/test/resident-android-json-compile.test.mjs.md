# test/resident-android-json-compile.test.mjs
- Lines: 35 | Kind: compile check (javac of `ResidentResultTransport.java` + `ResidentResultSession.java` against `android.jar` with stubbed `HostedInbox`/`HostedResultNotices`) | Verdict: DELETE
- Covers: the two classes compile against Android's checked `JSONException` signatures. Duplicates: `npm run android:build` compiles them against the real SDK; `specs/quint/refinement/native/hosted-inbox.mjs` and `resident-platform.mjs` compile and run them. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-35 | T4 | A compile-only check that the Android build already performs; skipped when no SDK. | Delete. | Low |
| 2 | 9-14 | C3 | Own Android SDK discovery (4 roots, newest platform) duplicating `jvm-tools.mjs`/other tests. | Goes with the file. | Low |
| 3 | 31 | T9 | `ALPHA_RESIDENT_SESSION_SOURCE` env knob: grep finds no setter in repo. | Goes with the file. | Low |

## Proposed end state
File deleted. Compilation is proven by the APK build lane.
