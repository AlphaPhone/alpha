# specs/quint/refinement/services/sign-in-platform.mjs
- Lines: 140 | Kind: harness support (writes Java stubs of Android/Capacitor/androidx classes to a temp dir) | Verdict: KEEP (SIMPLIFY; merge the shared stubs)
- Covers: compile-time stand-ins for `Context`, `Activity`, `Intent`, `PluginCall`, `Plugin`, `JSObject`, `PackageManager`, Custom Tabs, `AlertDialog` (auto-confirms authorization), and an in-memory `AlphaCredentialStore` that drives `SignInTestPorts` failure/pause injection. Duplicates: the same Android/Capacitor stub-writer idea and many of the same classes exist in `refinement/native/{note-bridge,listener-service,clock-review,calendar-sync-enable,sms-dispatch,resident,listener-store,assistant-entry}-platform.mjs`, `native/reset-orchestration.mjs` and `services/credential-platform.mjs`. Callers/importers: only `sign-in-coordinator.mjs:7`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 82-89 | A1/A7 | `legacyCloudRecoveryEligible()`, `RecoveryRefused`, `restoreLegacyCloudCredential()` stub the deleted Android legacy Cloud recovery (C5). grep finds no caller in `android/app/src/main` or the shared auth sources; they only throw. | Delete the three members. | None (javac would fail if still referenced) |
| 2 | 9-71 | C5 | ~20 Android/Capacitor stub classes re-declared as strings; at least ten sibling `*-platform.mjs` files do the same with slightly different method sets. | One `refinement/native/android-stubs.mjs` exporting a base stub set plus per-harness overrides (here: `AlertDialog` auto-confirm, `PluginCall` outcome capture, `Activity.startActivity`). | Medium (javac surface differs per harness; diff each set) |
| 3 | 137-139 | C3 | mkdtemp + write-each-file + `close()` loop repeated in every platform file. | Move into the shared stub writer. | Low |
| 4 | 71 | – | `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS=false` matches the production gate. | Keep. | – |
| 5 | 9-136 | D8 | One-line Java classes hundreds of characters wide. | Format when moved. | None |

## Proposed end state
~50 lines: `signInPlatform()` returns the shared Android stub set plus three sign-in overrides (`AlertDialog`,
`AlphaCredentialStore` port with failure/pause injection, `AlphaLocalAgentPlugin` intent counter). No legacy recovery
members.
