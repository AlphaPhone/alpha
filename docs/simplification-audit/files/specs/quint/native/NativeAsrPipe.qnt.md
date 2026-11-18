# specs/quint/native/NativeAsrPipe.qnt
- Lines: 118 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (run only on upstream pin changes; upstream move is a D14 follow-up)
- Covers: the shared `LiveSegmentPipe` worker: 8-batch queue bound, cancellation empties the queue, one warm/one close post, cutoff filtering, ASR failure does not retire the pipe. Duplicates: partial overlap with `NativePipedCapture` (whose harness `piped-capture.mjs` imports this one) by design; no twin. Callers/importers: `native/manifest.json` (7 tests, 5 invariants, no `bounds`), harness `refinement/native/asr-pipe.mjs` (20 lines, via `current-sources.mjs` → `prepare-patched-native.ts`), `piped-capture.mjs`, `test/quint-asr-pipe.test.mjs`, native aggregate; README `:307,333`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Only source is `vendor/eliza/.../LiveSegmentPipe.java` (research §2.9). It can only change on an `upstream.lock.json` bump but runs on every PR. | Path-scope its lane to `upstream.lock.json`, `android/upstream-native-sources.json` and its own files. | L |
| 2 | harness | - | Harness compiles the staged upstream class whole (no text slice). Good. | None. | - |
| 3 | 4, 99-107 | - | Invariants are meaningful (`QueueBound`, `CancelledQueueEmpty`, `FinishedSettlesFutures`). | None. | - |
| 4 | test wrapper | T4 | Run twice (per-model + aggregate). | One runner. | L |

## Proposed end state
Unchanged model, executed only when the upstream pin or its harness changes. List as an upstream follow-up: the model
belongs beside `plugin-local-inference` upstream.
