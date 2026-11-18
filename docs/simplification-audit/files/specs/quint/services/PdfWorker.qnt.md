# specs/quint/services/PdfWorker.qnt
- Lines: 100 | Kind: Quint model (services family, live; 7 tests, 3 witnesses) | Verdict: KEEP
- Covers: `IsolatedPdfService.java`: isolated-process admission with a busy CAS, input descriptor / bitmap / mapping closed before the main-thread reply, read-only output before transfer, timeout and memory-pressure kill. Source exists. Duplicates: none in Quint; upstream `IsolatedPdfRenderService.java`/`PdfPageLimits.java` are compiled into the same campaign. Callers/importers: manifest; harness `refinement/services/pdf.mjs` + `ServicePdfTraces.java` + `pdf-platform.mjs` (compiles the real Java against stubs; no slicing); services aggregate only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | structure | Android-native model filed under services. | Move to the native family with the other Java-refined models (optional, same commit as other moves). | Low |
| 2 | 68 | — | `memoryLimit = all { s.busy, s.isolated, kill }` duplicates `kill` with an extra guard; fine as documentation of a distinct trigger. | None. | — |

## Proposed end state
Unchanged model; one campaign run.
