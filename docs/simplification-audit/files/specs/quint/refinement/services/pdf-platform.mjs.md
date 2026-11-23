# specs/quint/refinement/services/pdf-platform.mjs
- Lines: 57 | Kind: harness support (hand-written Android framework stubs written to a temp dir for host `javac`) | Verdict: KEEP, MERGE stubs into a shared Android stub set
- Covers: stubs `Service`, `Bundle`, `Message`, `Handler`, `Messenger`, `ParcelFileDescriptor`, `SharedMemory`, `Bitmap`, `PdfRenderer`, `Process`, `BuildConfig` etc. so `IsolatedPdfService` and the upstream `IsolatedPdfRenderService` compile and run on the JVM. Duplicates: `Bundle`/`Handler` stubs also in `native/{main-activity,mms-dispatch,indicator-provider,assistant-entry}-platform.mjs` and `application/os-host-support.mjs` (10 files define a `Handler` stub). Importers: `pdf.mjs:4` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-53 | C5 | Sixth copy of Android framework stubs; each copy differs slightly (fields added per harness). | One `refinement/native/android-stubs/` source tree (real `.java` files) compiled once; harness-specific behaviour via small subclasses or static flags. | Medium (stubs are behaviour-bearing: `SharedMemory.protectionWorks`, `Process.isolated`) |
| 2 | 52 | — | Stubs `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS=false`: production configuration, correct. | Keep. | — |
| 3 | 1-57 | D8 | Java in JS strings, one line per class. | Real `.java` files make them readable and lintable. | Low |

## Proposed end state
Deleted once the shared Android stub tree exists; `pdf.mjs` passes the shared stub paths plus any PDF-only stubs.
