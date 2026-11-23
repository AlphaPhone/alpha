# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosMultiShareInstrumentedTest.java
- Lines: 60 | Role: Photos long-press multi-select, real system chooser, cross-UID recipient read and stale-selection refusal. | Verdict: SIMPLIFY
- Importers: none (JUnit class). Text/path pins: `scripts/android-instrumentation.ts:275` `CLASS_REGISTRY.PhotosMultiShare: {}`; `test/android-instrumentation-runner.test.mjs:132-205` scans every androidTest class for reachability. No Quint/feature-parity/LemmaScript pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 9 | A7 | Unused imports `android.database.Cursor`, `android.graphics.Bitmap`, `android.provider.MediaStore` (fixtures come from `PhotosTestFixture.fixture`). | Delete the three imports. | none |
| 2 | 24-26 | C3 / T7 | Private `js(`, `until(` (150x100 ms poll) and `click(` re-implement the WebView poll helpers also copied in `PhotosTestFixture.until`, `PhotosTrash.ready/host/click`, `ReminderStale.js/until`, `RealClock.waitJs/click` and ~40 other androidTest files. | Use one `WebViewTestDriver.until(script, timeoutMs, label)` / `click(label)` (add them to `WebViewTestDriver`). | low |
| 3 | 27, 39-40 | C3 | `mainForeground` focus poll, `nodes()` BFS over `AccessibilityNodeInfo`, `press()` click-up-the-parents duplicate `RealClock.nodes/tap` (35, 39), `PrototypeFlow.accessibleLabel` (102-112) and `ReminderTapProcessDeath.visibleNode/awaitVisible` (26-39). | One `AccessibilityTestDriver` (`nodes()`, `find(pred)`, `await(pred,ms)`, `press(node)`). | low |
| 4 | 48-52 | D8 | Five lines of 300-1,000 characters, each packing 5-15 statements and assertions (chooser intent checks, recipient scan). | Split into named steps: `assertChooserCarriesExactly(send, fixtures)`, `pickRecipient()`, `awaitRecipientHashes(h1,h2,h3)`. | none |
| 5 | 54-57 | C3 | Hand-rolled primary/cleanup `addSuppressed` aggregation, same shape as `PhotosTrash.cleanup` (76-85), `PrivateResidentSocket` (82-92), `PrototypeFlow` (95-98), `RealClock` (104-107). | Shared `TestCleanup` (collect `Runnable`s, rethrow with suppressed) in the androidTest support package. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js` | helper | 24 | ~38 androidTest files define `String js(` (e.g. `ReminderStaleInstrumentedTest.java:10`) | `WebViewTestDriver.evaluate` (call directly) |
| `until` | helper | 25 | `PhotosTestFixture.java:17`, `PhotosTrashInstrumentedTest.java:23` (`ready`), ~42 files | `WebViewTestDriver.until` |
| `click` | helper | 26 | `PhotosTrashInstrumentedTest.java:24`, `ReminderRecoveryInstrumentedTest.java:19`, `ReminderRecurrenceRecoveryInstrumentedTest.java:26` (identical selector) | `WebViewTestDriver.clickLabel` |
| `mainForeground` / `chooserForeground` | helper | 27-38 | `RealClockInstrumentedTest.java:40-49` (`front`/shade checks) | `AccessibilityTestDriver.awaitPackage(pkg)` |
| `nodes` / `press` | helper | 39-40 | `RealClockInstrumentedTest.java:35,39`, `PrototypeFlowInstrumentedTest.java:102-112`, `ReminderTapProcessDeathInstrumentedTest.java:26-39` | `AccessibilityTestDriver` |

## Proposed end state
Same single journey test. Delete three unused imports; replace `js/until/click` with `WebViewTestDriver` helpers,
`nodes/press/*Foreground` with `AccessibilityTestDriver`, the cleanup block with `TestCleanup`, and split lines 48-52 into
three named private steps. Behaviour and assertions unchanged. Estimated ~45 lines.

## Verification
Runs only via `npm run test:android:instrumentation -- --owned-emulator --classes PhotosMultiShare` (registered, no gate).
Re-run that class on both variants plus `PhotosBatch` (shares `PhotosTestFixture`); `node --test test/android-instrumentation-runner.test.mjs`.
