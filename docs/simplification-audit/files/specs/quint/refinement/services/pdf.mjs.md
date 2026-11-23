# specs/quint/refinement/services/pdf.mjs
- Lines: 14 | Kind: Quint refinement wrapper (compiles real `IsolatedPdfService.java` + upstream `IsolatedPdfRenderService.java`/`PdfPageLimits.java` with `ServicePdfTraces.java` on the JVM) | Verdict: KEEP
- Covers: `PdfWorker` (live, `manifest.json:1079`): busy CAS rejection, refused descriptor cleanup, bitmap/mapping cleanup, protection outcome and reply close in the isolated PDF render service. Duplicates: none (the model's kernel obligations are owned by `IsolatedPdfInstrumentedTest`). Callers: `services/index.mjs:22,77` only; there is no per-model host test, so it runs only inside the services aggregate that the host-test review deletes (T4) - it must get its own `test()` in the manifest-driven runner or it loses all execution.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | — | Pins three product Java files by path and compiles them whole: no slicing. | Keep. | — |
| 2 | — | P1 | Only reachable through `runServicesRefinement`. | Add to the per-model runner when the aggregate goes. | High if forgotten (silent loss) |

## Proposed end state
Unchanged, using the shared Android stub set instead of `pdf-platform.mjs`.
