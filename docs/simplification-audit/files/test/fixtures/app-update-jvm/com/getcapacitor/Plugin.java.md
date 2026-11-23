# test/fixtures/app-update-jvm/com/getcapacitor/Plugin.java
- Lines: 15 | Kind: fixture (Android/Capacitor host-JVM stub) | Verdict: KEEP (part of the app-update JVM stub tree)
- Covers: Capacitor Plugin base: activity/context fields, recorded `notifyListeners` events, and a `ready` hook that reflectively calls the plugin's private `activateUpdate` when `alphaUpdateReady` fires. Duplicates: none. Callers/importers: `test/app-update.test.mjs` (compiles the whole tree via `javaFiles(fixture('app-update-jvm'))` with real `AlphaDevicePlugin` update members, `PluginWorkers`, `AlphaUpdateStatusReceiver`, `UpdateConfirmationReceipt`, upstream `RuntimeUpdatePause` and `test/fixtures/UpdateFlowTest.java`), and four live Quint native harnesses that compile the same directory recursively: `specs/quint/refinement/native/update-barrier.mjs:13-16`, `update-composition.mjs:16`, `update-staging.mjs:20`, `runtime-update-pause.mjs:16,53`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10 | D7 | Reflective call of the product's private `activateUpdate` couples the stub to a private method name. | Keep while UpdateFlowTest exists; when the flow moves to Gradle `android/app/src/test`, call it through the real bridge. | Low |

## Proposed end state
Keep as part of the one Android host-JVM stub set (see chunk summary: merge `app-update-jvm`, `reviewed-copies-jvm`, `note-recorder-jvm`, `secure-store-memory`, `scoped-calendar-jvm`, `android-stubs`, `calendar-provider-jvm` into `test/jvm-stubs/` or `android/app/src/test` stubs). The directory is compiled as a whole, so no single stub can be dropped while `UpdateFlowTest` and the four update harnesses run. It moves with the update harnesses when `specs/quint/refinement` stops importing from `test/fixtures` (ci-and-formal: specs depends on test).
