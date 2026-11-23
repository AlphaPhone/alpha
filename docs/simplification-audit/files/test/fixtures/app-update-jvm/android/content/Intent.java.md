# test/fixtures/app-update-jvm/android/content/Intent.java
- Lines: 41 | Kind: fixture (Android/Capacitor host-JVM stub) | Verdict: KEEP (part of the app-update JVM stub tree)
- Covers: Intent stand-in with extras, flags, `filterEquals`, and a hand-rolled `toUri`/`parseUri` for the one confirmation shape the receipt test stores. Duplicates: see finding 1. Callers/importers: `test/app-update.test.mjs` (compiles the whole tree via `javaFiles(fixture('app-update-jvm'))` with real `AlphaDevicePlugin` update members, `PluginWorkers`, `AlphaUpdateStatusReceiver`, `UpdateConfirmationReceipt`, upstream `RuntimeUpdatePause` and `test/fixtures/UpdateFlowTest.java`), and four live Quint native harnesses that compile the same directory recursively: `specs/quint/refinement/native/update-barrier.mjs:13-16`, `update-composition.mjs:16`, `update-staging.mjs:20`, `runtime-update-pause.mjs:16,53`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C4 | `test/fixtures/reviewed-copies-jvm/android/content/Intent.java` declares another Intent. | Fold into one stub set; keep the richest behaviour this tree needs. | Low: compile-only collision if two trees are on one classpath. |
| 2 | 39-40 | - | `parseUri` only accepts the exact 5-part string its own `toUri` writes; a product change to the stored confirmation shape fails here, not in the product. Acceptable, documented in-line. | none | Low |

## Proposed end state
Keep as part of the one Android host-JVM stub set (see chunk summary: merge `app-update-jvm`, `reviewed-copies-jvm`, `note-recorder-jvm`, `secure-store-memory`, `scoped-calendar-jvm`, `android-stubs`, `calendar-provider-jvm` into `test/jvm-stubs/` or `android/app/src/test` stubs). The directory is compiled as a whole, so no single stub can be dropped while `UpdateFlowTest` and the four update harnesses run. It moves with the update harnesses when `specs/quint/refinement` stops importing from `test/fixtures` (ci-and-formal: specs depends on test).
