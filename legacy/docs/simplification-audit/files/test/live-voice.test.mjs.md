# test/live-voice.test.mjs
- Lines: 183 | Kind: mixed. Tests 1-5: unit tests of `runtime/live-voice.ts`, which is a pure re-export of upstream `@elizaos/voice/live-session` (34 lines, "adds no behavior of its own"); test 6: integration of `voice-timing.ts` + `diagnostics-export.ts`; tests 7, 8, 10: source-text over renderer, `.eliza` and Java/vendor files; test 9: upstream `LiveVadGateTest.java` re-run | Verdict: DELETE; MERGE test 6 into `test/integration/voice.test.ts` (or the diagnostics integration)
- Covers: live ASR frame wire format, partial/final de-duplication, stale turn drop, HTTP-only final, unavailable route; live latency recorded as numbers only and copied into diagnostics without text; interim text never stored/logged; Android routes and shared bridge wiring. Duplicates: tests 1-2 are repeated in `test/browser/live-voice.spec.ts` (T6: `page.evaluate(import('/src/runtime/live-voice.ts'))`); the upstream package has its own tests; `test/diagnostics-export.test.mjs:330` covers live-vs-batch voice rows. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 29-109 | T5, D4 | Five tests of upstream code through a re-export shim. | Delete; the shim itself is a D4 candidate (import `@elizaos/voice/live-session` directly). | Low |
| 2 | 111-122 | T3 | `recordLiveVoiceTiming` accepts one record per turn, rejects negatives, strips text; diagnostics copy has no transcript text. Privacy-relevant; only test of `recordLiveVoiceTiming`. | MERGE as one case in the voice/diagnostics integration (real `voice-timing.ts` + `buildDiagnostics`). | Medium |
| 3 | 124-134 | T1, A4 | Regex asserts `const VOICE_SEND_POLICY: VoiceSendPolicy = 'auto-send'`; D8 deletes that constant switch. Other regexes count `send:sendTurn` occurrences in `voice-adapter.ts`. | Delete. | Low |
| 4 | 136-150, 157-183 | T1, T5 | Regexes over `AlphaLocalAgentPlugin.java`, vendor `LiveVoiceCapture.java`/`LocalSpeechBridgePlugin.java`, and absence checks of moved symbols and deleted files (tombstone tests). | Delete. | Low |
| 5 | 152-155 | T5 | Re-runs upstream `LiveVadGateTest`. | Delete (upstream follow-up). | Low |
| 6 | 9-10 | B4 | Installs a global `localStorage` fake for the whole file. | Gone. | Low |

## Proposed end state
File deleted. One case "live latency is numbers only and reaches diagnostics without text" in the voice integration
file. `test/browser/live-voice.spec.ts` should become (or fold into) `journeys/voice.spec.ts` driving the assistant UI
with the stub agent instead of importing the module (separate browser-chunk decision).
