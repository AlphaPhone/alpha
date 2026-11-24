# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PdfViewerInstrumentedTest.java
- Lines: 54 | Role: opens a two-page mail-attachment PDF in `AlphaMailPdfActivity`, pages forward/back across recreation and closes it, via accessibility text | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Asset `inbox-fixtures/two-page.pdf` (androidTest assets). Text/path pins: `scripts/android-instrumentation.ts:251` (`PdfViewer: { args: { isolatedPdfNative: "1" } }` → runner test requires `"1".equals(InstrumentationRegistry.getArguments().getString("isolatedPdfNative")` text, l.40). The same gate is used by `IsolatedPdf` (registry l.229).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-26, 29, 35, 50 | NEW (deprecated no-op ceremony) | `AccessibilityNodeInfo.obtain(node)` and `recycle()` in `finally` blocks: both are deprecated no-ops since API 33 (the emulator targets 36), and the recursive `find` recycles children it may still need on older APIs. | Drop `obtain`/`recycle`; use a shared a11y BFS (`A11yTree.find`, see PasswordBrowserFill finding 3). | None on API 33+. |
| 2 | 19 | B5 | `assertTrue("Bounded PDF accessibility hierarchy",++count[0]<=1000)` — exact-count ceremony inside the search. | Bound once in the shared helper. | None. |
| 3 | 27-37 | C3 | `awaitText`, `click` poll loops — same shape as NotificationAccessTestDriver/PasswordBrowserFill. | Shared helpers. | None. |
| 4 | 52 | KEEP | `assertTrue(!file.exists()||file.delete())` cleanup. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `find` (recursive) | helper | 16-26 | PasswordBrowserFill:76-82, NotificationAccessTestDriver:42-43, NotificationChannels:22-23 | `A11yTree.find` |
| `awaitText`/`click`/`page` | helper | 27-37 | none exact | keep `page`; others shared |

## Proposed end state
One test, ~35 lines, using shared accessibility helpers without recycle ceremony.

## Verification
`npm run test:android:instrumentation -- --classes PdfViewer` (passes `isolatedPdfNative=1`).
