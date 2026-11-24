# specs/quint/refinement/services/ServicePdfTraces.java
- Lines: 39 | Kind: formal harness JVM driver (real `IsolatedPdfService` + upstream `IsolatedPdfRenderService` over stub `android.os`/`Bitmap`/`SharedMemory` from `pdf-platform.mjs`) | Verdict: KEEP
- Covers: model `PdfWorker`: busy CAS rejects a second request and closes its descriptor; the worker renders, unmaps, protects and cleans up before replying; protection failure is visible. Duplicates: `IsolatedPdfInstrumentedTest` covers the installed path (the obligation in `index.mjs` names it); this covers interleaving the device test cannot pin. Importers: `pdf.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 22 | T10 | Reflection on private fields `busy` and `endpoint` of `IsolatedPdfService` (`Trace.read`). A rename breaks the harness at run time, not compile time. | Acceptable for two fields; if the class is touched, make them package-private and read them directly so `javac` catches renames. | Low |
| 2 | 30-31 | T8 | Busy-wait `Thread.sleep(1)` poll for up to 5 s for cleanup. | Fine as a condition wait; keep. | — |
| 3 | 13-37 | D8 | Dense multi-statement lines. | Reformat with the Java pass. | None |

## Proposed end state
Unchanged behaviour, reformatted; optionally package-private fields instead of reflection.
