# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMailPdfActivity.java
- Lines: 21 | Role: product configuration of the shared isolated PDF viewer (renderer service, admission, copy, colours). | Verdict: KEEP
- Importers: `AndroidManifest.xml`, `AlphaMailAttachmentsPlugin.java:120` (fallback viewer when no external PDF app exists). Text/path pins: `test/support/feature-parity.mjs`; androidTest `PdfViewerInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-20 | C6 / D12 | Hard-coded colours `Color.rgb(244,243,238)`, `rgb(32,32,25)`, `rgb(57,58,203)` duplicate the renderer theme tokens and do not follow dark mode. | Optional: read them from `res/values/colors.xml` (and `values-night`) instead of literals. Not a simplification of size; only do it if a colors resource already exists. | low |
| 2 | — | — | No dead code, no defensive code; each override is a required hook of `IsolatedPdfViewerActivity`. | none | — |

## Local types and helpers
None.

## Proposed end state
Unchanged, 21 lines.

## Verification
`PdfViewerInstrumentedTest`, Android build both flavors.
