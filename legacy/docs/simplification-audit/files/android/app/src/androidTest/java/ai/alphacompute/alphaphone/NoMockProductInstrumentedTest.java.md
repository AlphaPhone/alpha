# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoMockProductInstrumentedTest.java
- Lines: 65 | Role: flag-off build: no mock entry point, signed-out install shows a non-dismissable sign-in page, and a saved `{kind:'mock'}` selection is retired. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:145,354` (`DEFAULT_CLASSES` first entry); `test/android-instrumentation-runner.test.mjs:20-29,66-67` (result parsing fixtures use the class name); `test/ci-emulator-evidence.test.mjs:250-258` reads every `DEFAULT_CLASSES` source and regex-checks that at least one `@Test` is not gated on `ELIZA_DEV_ALLOW_TEST_MOCKS` (T1 — this file uses `assumeFalse`, which passes).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 25-27, 33-58 | D11/D4 | Uses `NotesSecureFixture.evaluate(...)` as a generic WebView evaluator although nothing touches Notes; that method is a pass-through to `WebViewTestDriver.evaluate` when the expression lacks `__notesEnvelope`. | Call `WebViewTestDriver.evaluate` directly. | None |
| 2 | 47-64 | A1 | `legacyMockSelectionRequiresSignIn` checks the renderer retires a stored `{kind:'mock'}` selection on product builds (`apps/app/src/runtime/connection-ui.tsx:1602` reader). Under D1 that legacy-selection reader is a deletion candidate; product builds never write `kind:'mock'` (written only at `connection-ui.tsx:3319` behind test mocks). | If the renderer retire path is deleted, delete this method in the same change; `productBuildOffersNoMockEntryPoint` stays. | Medium (cross-file with connection-ui.tsx) |
| 3 | 15-22 | C3 | Private `until` copy. | Shared driver. | Low |
| 4 | 33, 43, 51, 61 | C3 | localStorage save/restore of `alpha.connection.selection.v1` duplicated in both methods and in `NoteAudioInstrumentedTest`/`InboxDraftInstrumentedTest`. | `Keys.SELECTION` + a `LocalStorageRestore` try-with-resources helper. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SELECTION` | const | 14 | `InboxDraftInstrumentedTest.SELECTION`, literals in `NoteAudioInstrumentedTest:72-108` | `Keys` |
| `until` | helper | 15-22 | ~13 copies | `WebViewTestDriver.until` |
| `assertNoMockEntry` | helper | 23-28 | none | keep |

## Proposed end state
One method (`productBuildOffersNoMockEntryPoint`) on `WebViewTestDriver`, plus the legacy-selection method only while the renderer keeps that reader. About 30-40 lines. Must keep at least one ungated `@Test` (default-class rule).

## Verification
Default instrumentation run (`DEFAULT_CLASSES`) on both flag-off variants; `node --test test/android-instrumentation-runner.test.mjs test/ci-emulator-evidence.test.mjs`.
