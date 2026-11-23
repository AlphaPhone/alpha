# scripts/fingerprint-voice-assets.ts
- Lines: 30 | Kind: script (one-off macOS evidence tool: hash local voice assets and Mach-O dylib closure) | Verdict: DELETE
- Covers: writes a closure hash record of configured speech model dirs and the native inference library with its `otool` dependencies. Callers: none. The only reference is an allow-list regex entry in `test/llama-cpp-only.test.mjs:36`. Its default input/output paths (`test-results/combined-agent/voice-assets.json`, `voice-asset-closure.json`) are referenced nowhere else.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / B5 | Unreferenced evidence-receipt generator (closure hash nothing reads). | Delete, and remove `fingerprint-voice-assets` from the regex in `test/llama-cpp-only.test.mjs:36`. | Low |
| 2 | 4,8 | C3 / D8 | Another SHA-256 helper; four imports on one line. | Gone with the file. | — |

## Proposed end state
File removed.
