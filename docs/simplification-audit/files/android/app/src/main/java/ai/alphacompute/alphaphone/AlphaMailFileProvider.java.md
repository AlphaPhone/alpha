# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMailFileProvider.java
- Lines: 15 | Role: `FileProvider` subclass that serves only fresh read-only reviewed attachment copies from `cache/mail-attachments`. | Verdict: KEEP (one small tidy)
- Importers: `AndroidManifest.xml` (provider `<package>.mailattachments`), referenced by name in `AlphaMailAttachmentsPlugin.java:50` comment. Text/path pins: `test/support/feature-parity.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/ReviewedCopiesTraces.java`, `reviewed-copies.mjs`, `reviewed-copies.md`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 11 | C6 | `"mail-attachments"` literal appears here twice and three more times in `AlphaMailAttachmentsPlugin.java:51,53` (`handoff(...,"mail-attachments","mail-attachments")`, `copyFolder()`). | One `static final String FOLDER="mail-attachments"` on `AlphaMailAttachmentsPlugin` (installed name, keep value byte-for-byte); use it here. | none (value unchanged) |
| 2 | 9-10 | D8 | Two guards packed per line. | Formatter pass only. | none |
| 3 | 12 | B1 | `file.delete()` result ignored before throwing; acceptable (expiry best effort). | Keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `"mail-attachments"` | const (literal) | 9, 11 | `AlphaMailAttachmentsPlugin.java:51,53` | `AlphaMailAttachmentsPlugin.FOLDER` |

## Proposed end state
Same class, 15 lines, folder name from the shared constant. Real security logic (mode, segment count, traversal, expiry) stays.

## Verification
`ReviewedCopiesTraces` (Quint refinement `reviewed-copies.mjs`), `MailAttachmentInstrumentedTest`, `PdfViewerInstrumentedTest`, Android build.
