# specs/quint/refinement/native/ListenerInputPorts.java
- Lines: 21 | Kind: harness support port (synthetic ASR replies, records utterance samples and the epoch ticket) | Verdict: KEEP
- Covers: nothing alone; the ASR boundary for `ListenerInputTraces`. Callers/importers: `listener-input.mjs` (compiled list), `listener-input-platform.mjs:24` (stub `AudioRecord.read` calls `ticket()`) and `:55` (string-edits the harness's own `NativeAsr` stub from `listener-service-platform.mjs:74`, replacing `return "alpha";` with a call to `transcribe`), `ListenerInputTraces.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | platform `:55` | C5 | The ASR port is wired by string-replacing a line of another platform's stub (`listener-service-platform.mjs` `NativeAsr`), and `AudioManager` is extended the same way (13 `.replace` calls). Product/upstream text is not touched, but stub-on-stub string edits fail silently if the base stub changes (`String.replace` does not assert a match). | Give the shared stub a hook (`static Function<float[],String> transcriber`) and set it from this port; same for the AudioManager listeners. | low |
| 2 | 13 | — | 8 s response deadline; harness always supplies a reply. | Keep. | — |

## Proposed end state
Unchanged port; wired through a hook on the shared stub instead of string edits.
