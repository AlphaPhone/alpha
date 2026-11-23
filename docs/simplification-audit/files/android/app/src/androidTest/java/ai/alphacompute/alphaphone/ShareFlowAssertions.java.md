# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ShareFlowAssertions.java
- Lines: 94 | Role: shared share-sheet assertions: (1) the real chooser is launched with ACTION_SEND, exact bytes, read-only grant, then cancelled; (2) the test-APK `ShareReceiverActivity` is chosen in the real chooser and reports the exact SHA-256 from a separate UID. | Verdict: SIMPLIFY
- Importers: 2 — `CameraFlowInstrumentedTest:96,98`, `SelectedDocumentInstrumentedTest:148,150`. Depends on `ShareReceiverActivity` and its manifest label "Alpha share verification" (`android/app/src/androidTest/AndroidManifest.xml:8-9`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-46, 52-62 | C3 | Two copies in this file of "read `dumpsys activity activities` and test `topResumedActivity` for X" (chooser, then MainActivity), plus 9 more files. | `TestShell.awaitTopResumed(componentSubstring, ms)`. | None. |
| 2 | 78 | C3 | SHA-256 hex loop (one of ~30). | Shared digest helper. | None. |
| 3 | 57 | C6 | Hard-coded `"ai.alphacompute.alphaphone/.MainActivity"`. | `BuildConfig.APPLICATION_ID + "/.MainActivity"` (survives a future package rename). | None. |
| 4 | 14 | C1 | `interface Action { void run() throws Exception; }` — a throwing Runnable; `BoundedActivityScenario`/`WebViewTestDriver` have their own functional shapes. | One `ThrowingRunnable` (JUnit 4.13 ships `org.junit.function.ThrowingRunnable`). | None. |
| 5 | 63-67 | C3 | BFS over the accessibility tree — same as `SelectedDocumentInstrumentedTest.find:74-84`. | `UiNodes.all()` / `UiNodes.find(pred)`. | None. |
| 6 | 94 | NEW (whitespace) | Trailing blank line inside the class. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Action` | type | 14 | `org.junit.function.ThrowingRunnable`; other local throwing lambdas in androidTest | JUnit's `ThrowingRunnable` |
| `awaitMainForeground` | helper | 52-62 | top-resumed scans in 11 files | `TestShell` |
| `nodes()` | helper | 63-67 | `SelectedDocumentInstrumentedTest.find` | `UiNodes` |

## Proposed end state
~65 lines: two assertion methods over shared shell/node/digest helpers. Receiver label and marker strings ("Read access verified",
"SHA-256: ", "Receiver UID: ") stay in sync with `ShareReceiverActivity`.

## Verification
`node scripts/android-instrumentation.ts --classes SelectedDocument,PhotosMultiShare` and `node scripts/test-native-permissions.ts` camera cases (CameraFlow is campaign-only, `scripts/test-native-permissions.ts:29,39`).
