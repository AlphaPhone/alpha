# specs/quint/refinement/native/asr-pipe.mjs
- Lines: 20 | Kind: Quint refinement driver (Node; compiles current upstream `LiveSegmentPipe.java` whole and runs `AsrPipeTraces.java` in campaign mode) | Verdict: KEEP
- Covers: model `NativeAsrPipe`: the native ASR segment pipe (FIFO batches, byte/frame bounds, warm/batch/close provider outcomes, owner cancellation). 39 scenarios. Duplicates: `test/quint-asr-pipe.test.mjs` re-runs it (T4). Callers: `index.mjs:26`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | — | Compiles the real class via `currentNativeSource`; no slicing. Target shape. | Keep. | — |
| 2 | 13 | C5 | `campaign` mode makes the Java driver spawn one JVM per scenario itself (same pattern as `VoiceDraftTraces`). | Use `javaTraceCampaign` with one argument set per scenario. | Low |
| 3 | — | P6 | Upstream code (`plugin-local-inference`); keep here while it is patched, but gate the lane on lock/patch/driver changes. | Path filter. | — |
| 4 | — | A7 | Sibling `AsrPipeFailureProbe.java` is unreferenced (delete-candidates A154); this driver does not compile it. | Delete the probe (separate report). | — |

## Proposed end state
Unchanged except scenarios launched by `javaTraceCampaign`; path-gated.
