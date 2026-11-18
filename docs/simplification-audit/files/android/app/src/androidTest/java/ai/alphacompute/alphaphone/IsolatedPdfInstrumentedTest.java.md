# android/app/src/androidTest/java/ai/alphacompute/alphaphone/IsolatedPdfInstrumentedTest.java
- Lines: 45 | Role: binds the isolated-process `IsolatedPdfService` and checks real rendering, read-only shared memory, error fixtures, cancellation/unbind death and the watchdog kill. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:229` (`requiresTestMocksBuild: true`, arg `isolatedPdfNative`); `specs/quint/refinement/services/index.mjs:149` names `IsolatedPdfInstrumentedTest` as the evidence for the `PdfWorker` model obligation; assets `androidTest/assets/inbox-fixtures/{synthetic.pdf,password.pdf.base64,too-many-pages.pdf.base64,oversize-page.pdf.base64}`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 41 | D6/P12 | Sends `data.putString("fixture","watchdog")`, which relies on the `stallFixture` hook inside main-source `IsolatedPdfService.java:13` (android research P12). The test already requires a test-mocks build (L30). | Keep; when P12 moves the stall hook to the test-mocks source set, keep the `"fixture"` key unchanged. | Low |
| 2 | 35-36 | D8 | 400-char assertion lines. | Split when touched. | None |
| 3 | 15-28 | - | `Connection` helper is local and specific; no twin. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Connection` | type | 15-28 | `PdfViewerInstrumentedTest` uses the same service (check when touching) | keep local |

## Proposed end state
Unchanged apart from formatting. About 45 lines.

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes IsolatedPdf`; Quint refinement collector (`specs/quint/refinement/services/index.mjs`) still lists the obligation.
