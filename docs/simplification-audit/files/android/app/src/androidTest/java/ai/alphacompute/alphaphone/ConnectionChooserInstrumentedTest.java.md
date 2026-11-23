# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ConnectionChooserInstrumentedTest.java
- Lines: 62 | Role: test-mocks journey: cleared selection opens the chooser over an inert phone, closing saves no "offline" choice (P-43), Settings -> Agent connection -> Mock mode enter/exit preserves saved notes across recreation. | Verdict: SIMPLIFY
- Importers: none. Calls `new BrowserFlowInstrumentedTest().diagnostics()` (20).
  Text/path pins: `scripts/android-instrumentation.ts:222` (`requiresTestMocksBuild: true`); `test/android-instrumentation-runner.test.mjs:75-76, 215` (class name in parser tests).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | NEW (test class used as helper library) | `new BrowserFlowInstrumentedTest().diagnostics()` instantiates another @Test class for a DOM dump | Move `diagnostics()` to `WebViewTestDriver.diagnostics()` | Low |
| 2 | 14-25 | C3 / T7 | Private `until`/`click` (uses `NotesSecureFixture.evaluate` — a Notes fixture — as the generic evaluator) | Shared helpers; use `WebViewTestDriver.evaluate` | Low |
| 3 | 30, 42, 58 | C6 | Storage key literal `'alpha.connection.selection.v1'` ×5 in this file (12+ files per C6) | `AppNavigation.CONNECTION_SELECTION_KEY` (test-side constant; product key stays) | None |
| 4 | 10-11, 26 | D11 | Method name `offlineAndMockAreExplicit…` while the Javadoc says no "Continue offline" choice exists any more | Rename `closingSavesNoChoiceAndMockPreservesSavedNotes` (no runner pins the method) | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until`/`click` | helper | 14-25 | ~77 poll copies | `WebViewTestDriver`/`AppNavigation` |

## Proposed end state
Single test kept (only device evidence of P-43 closing behaviour and mock entry/exit); shared helpers, shared key
constant, accurate method name. Estimated 62 -> ~50 lines.

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes ConnectionChooser`; `node --test test/android-instrumentation-runner.test.mjs`.
