# test/always-on-listener.test.mjs
- Lines: 87 | Kind: upstream test re-run (line 1 imports `vendor/eliza/packages/app/test/android/sense.test.mjs`), two javac compile checks against `android.jar`, two source-text tests over Alpha Java, vendor Java/TS and a vendor patch | Verdict: DELETE
- Covers: Alpha's `android/sense` component compiles against the shared listener; `AlphaListenerPlugin` compiles; a cold wake is bound to the native owner; power long-press reaches voice only via SystemUI identity. Duplicates: Gradle compiles `android/sense` and the app in every Android build; vendor's own suite covers Sense. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | T5 | Re-runs an upstream test file inside Alpha's suite. | Delete. | None |
| 2 | 9-27 | T4 | Compiles shared + Alpha Sense sources with stub BuildConfig/R: a slower copy of the Gradle compile. Needs Android SDK 36. | Delete. | None |
| 3 | 29-44 | A7 | Compiles `AlphaListenerPlugin.java`, which delete-candidates A60 lists as dead (renderer uses only Sense; this test is its last reference besides `feature-parity.mjs` and the native Quint manifest). | Delete with the plugin. | None |
| 4 | 45-87 | T1, T5 | Regex over `AlphaApplication`, `AlphaLocalAgentPlugin`, `AlphaAssistActivity` and five vendor files (config overlay, patch manifest). | Delete. | Low |
| 5 | - | D7 | Always-on listening and Power invocation are kept dormant (D7); their device behaviour is image/emulator evidence, which host text checks never were. | Owner question: which emulator/image test gates P-78 when it is enabled. | - |

## Proposed end state
File deleted. Compile coverage is the Android build; owner binding of cold wakes is the native Quint model if it stays
listed in `specs/quint/native/manifest.json`. `AlphaListenerPlugin` and its registration go in the Android pass.
