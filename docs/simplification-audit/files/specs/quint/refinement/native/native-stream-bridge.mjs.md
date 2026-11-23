# specs/quint/refinement/native/native-stream-bridge.mjs
- Lines: 111 | Kind: Quint MBT replay; imports the real module through esbuild (`loadBrowserModule`) | Verdict: KEEP
- Covers: `streamNativeAgent` (`apps/app/src/runtime/local-agent-native-stream.ts`): listener attach before request, busy refusal before dispatch vs. unknown after response, interrupted replies, abort cancels a started stream, late listener removal, ready-callback revocation. Model `NativeStreamBridge` (`manifest.json:3461`). Duplicates: none. Callers/importers: `native/forward-replays.mjs:9`, `test/quint-native-stream-bridge.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 108 | — | Imports and runs the real module; no source text. This is the target shape for the other harnesses. | Keep. | — |
| 2 | 14 | C7 | Formal code imports `test/fixtures/browser-source.mjs`. If the test-fixtures cleanup moves or deletes that loader, Quint breaks. | Move `loadBrowserModule` into a shared harness support module (`specs/quint/refinement/support/`) and have tests import it from there. | Low |
| 3 | 22 | C3 | `flush()` redefined (research: 23 copies). | Shared helper. | None |

## Proposed end state
Unchanged apart from importing `flush` and the module loader from one shared support file.
