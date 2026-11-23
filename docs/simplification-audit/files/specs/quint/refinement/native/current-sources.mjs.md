# specs/quint/refinement/native/current-sources.mjs
- Lines: 32 | Kind: harness support (resolves a Java class name to the current file: direct upstream table, staged patched-native tree, app source, upstream agent folders) | Verdict: KEEP (SIMPLIFY)
- Covers: no behaviour; picks which source file a campaign compiles. Duplicates: `shared-recording.mjs:13` exports a *different* function with the same name `currentNativeSource` (voice-only resolver), which `live-capture.mjs` imports. Callers/importers: `indicator-provider`, `listener-input`, `listener-service`, `listener-store`, `listener-admission-probe`, `asr-pipe`, `piped-capture`, `speech-gate`, `speech-warmup`, `speech-output-preparation`, `recognizer-availability`, `recognizer-retirement`, `on-device-recognizer` (13 files).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | — (cost) | `preparePatchedNative()` runs at **import time**, so merely importing any of 13 harnesses stages the patched upstream tree. | Make it lazy (first call). | Low |
| 2 | 7-10 | A7 / A8 | `aliases` maps four old class names (`PhotoAttachmentSource`, `NativeVoiceIpc`, `AlphaListeningPolicy`, `AlphaListeningLease`) to new ones. No caller requests any alias name (grep of all `currentNativeSource(...)` / `.map(currentNativeSource)` call sites). | Delete the alias table. | None |
| 3 | 25 | B1 | `try { readFileSync(...); return app+name } catch {}` is an existence test that also reads the file. | `existsSync`. | None |
| 4 | 26 | A7 / D8 | Fallback loop over upstream `agent/runtime|connection` folders; none of the 25 names the callers pass resolves there by inspection. One-line minified loop. | Delete unless a caller needs it; otherwise format. | Low |
| 5 | 11-17 vs `java.mjs:11` | C6 | `sense` path literal redefined (also `indicator-provider.mjs:6`). | Import `sense` from `java.mjs`. | None |
| 6 | — | D11 | Two exported `currentNativeSource` functions with different resolution rules (`current-sources.mjs`, `shared-recording.mjs`). | Keep one resolver (this one, which already consults the staged tree) and delete the other. | Low |
| 7 | 30-32 | B5 | `nativePatchInputs` exists to add the patch files to receipt hashes. | Keep only if receipts survive. | None |

## Proposed end state
A lazy `currentNativeSource(name)` with three lookups (direct table, staged tree, app source), no aliases, no exception
control flow, the only resolver in the folder.
