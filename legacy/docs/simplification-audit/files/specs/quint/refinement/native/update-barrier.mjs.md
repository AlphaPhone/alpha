# specs/quint/refinement/native/update-barrier.mjs
- Lines: 81 | Kind: Quint refinement harness (Java) over **sliced product text** (T10) + shared slicer | Verdict: PORT
- Covers: model `NativeUpdateActivation` (live) — bridge registration/acknowledgement barrier, seal, confirmation ownership, reconnect eligibility. Also exports `exactUpdateMembers` and `updateConfirmationSources`, used by `update-composition.mjs`, `update-staging.mjs` and `test/app-update.test.mjs:8,41`. Duplicates: `test/quint-native-update-activation.test.mjs` (T4). Callers/importers: `index.mjs`, the two siblings, the two tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-48 | T10/D7 | `exactUpdateMembers` cuts `AlphaDevicePlugin.java` from `' static final long UPDATE_MAX_BYTES='` to the **product marker comment** `' // End of updater methods for host replay.'`, plus regex `^ private static Intent handOff\(Intent intent\)\{[^\n]*$` (one-line body) and `/ static boolean shareForeground\(android\.app\.Activity activity\)\{[\s\S]*?\n \}/`; wraps in a synthetic class with its own `diagnosticsWorker`. The marker comment exists only for this harness (D7). | With U-A1, compile `update/AppUpdater.java` whole (it owns all updater members) plus whatever owns `handOff`/`shareForeground` (`SettingsHandoff`/`AlphaUtil`). Delete the marker comment and `exactUpdateMembers`; `test/app-update.test.mjs` then compiles `AppUpdater.java` directly (it currently also string-replaces `UPDATE_DEADLINE_NANOS`; make the deadline a constructor/field seam). | M |
| 2 | 15-16 | – | Fixtures include `test/fixtures/UpdateFlowTest.java` and all `test/fixtures/app-update-jvm/**`; shared with composition/staging. | Keep as the one update stub set. | – |
| 3 | 64-69 | – | Name-order assertion and Quint set conversion. | Keep. | – |

## Proposed end state
No exported slicer; `runNativeUpdateActivationRefinement` compiles `AppUpdater.java`, confirmation classes, the pinned
journal and stubs. The three update harnesses share one `updateSources()` list in this file.
