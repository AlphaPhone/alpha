# specs/quint/native/NativeStreamBridge.qnt
- Lines: 77 | Kind: Quint model with witnesses, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness imports and runs the real `streamNativeAgent` (esbuild bundle via `test/fixtures/browser-source.mjs`) | Verdict: KEEP
- Covers: One streamed native agent reply: first terminal outcome wins, "not dispatched" only when refused before any response, chunks need a response, the listener is removed and a started stream cancelled on settle (6 runs, 6 invariants, 4 witnesses). Duplicates: the same replay runs in two tests: `test/quint-native-stream-bridge.test.mjs` and `specs/quint/refinement/native/forward-replays.mjs` (via `test/quint-forward-receipts.test.mjs`). Callers/importers: manifest (`symbols` pins `streamNativeAgent`, `requestStream`, `cancelStream`, `beforeDispatch`, …); `specs/quint/refinement/native/native-stream-bridge.mjs`; `forward-replays.mjs`; the two tests above. Not in `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | Imports the real module and replays model traces against it. This is the target shape for every renderer-side harness (T10 ported example). | None. | — |
| 2 | tests | T4 | Replayed twice: once directly (asserts exactly 70 traces, >1500 checkpoints, every action) and once in `forward-replays.mjs` (same counts). | Keep one (the manifest-driven runner or `quint-forward-receipts`); delete `test/quint-native-stream-bridge.test.mjs`. | None |
| 3 | manifest `symbols` | T10 | Symbol pins break on rename of local variables (`beforeDispatch`, `onReplyReady`). | Drop `symbols`; keep `sources`. | None |
| 4 | tests | B5 | Exact trace count (70) and checkpoint floors. | Assert `> 0` and pass/fail. | None |

## Proposed end state
Model and harness unchanged. One test runs the replay; manifest pins the file only. Path-filtered to `apps/app/src/runtime/local-agent-native-stream.ts`. Add a `native/README.md` line.
