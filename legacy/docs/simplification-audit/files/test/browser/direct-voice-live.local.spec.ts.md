# test/browser/direct-voice-live.local.spec.ts
- Lines: 47 | Kind: Playwright, `live` project (only when named on the command line; it is also skipped unless `ALPHA_LIVE_VOICE_QA=1`). A real-provider voice journey: Chrome fake mic, real local agent | Verdict: **KEEP, SIMPLIFY** (rename to `journeys/voice.local.spec.ts`)
- Covers: with real voice, Talk opens a session, the spoken "open notes" opens Notes through the renderer channel, both spoken replies complete, the app returns Home, mute and unmute work, Stop preserves the chat, and optionally (`ALPHA_LONG_VOICE_QA`) the session rotates after 125 s with a single concurrent capture. Duplicates: none in the live lane; the fixture-based voice specs cover the same UI against fakes. Callers: the manual live lane only; no CI workflow runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | P3 / T6 | `Component.prototype.renderVals`, `startVoice`, `prepareVoiceConversation` and `voiceConversationCurrent` are monkey-patched to record a `lifecycle` array that nothing asserts. It is written only into the receipt. | Delete the patch. | none |
| 2 | 23 | P3 | `voiceLiveShell.swallowed()` waits on a private shell method, captured through the patch. | Wait on the visible state instead: the "Message Alpha" textbox is enabled and the Talk button is enabled. | Low |
| 3 | 9-12, 33, 43-45 | B5 | A `receipt.json` with timings, console errors, health envelopes and visible body text is written to the output dir and read by nothing. The `try{…}catch{}` blocks in the response listeners swallow parse errors (B1). | Keep timings only if the owner reads them for latency QA. Otherwise delete the receipt and the listeners and rely on assertions and the Playwright trace. | Low (owner question) |
| 4 | 14-16 | — | The WebSocket proxy and `getUserMedia` wrapper count frames and concurrent captures. This is legitimate boundary instrumentation that the long-session assertions use (`rendererConnections`, `maxConcurrentCaptures`, `spokenAudioBytes`). | Keep. Move it to `harness/voice-probe.ts` if another live spec needs it. | none |
| 5 | 19 | P2 | It polls `connectionController.getSnapshot()` in the page for readiness. | Replace with a visible-state wait (no connection scrim, Talk enabled). | Low |
| 6 | 34, 40, 41 | — | Screenshots are written as evidence, with no assertion on them. | Keep or drop; they are cheap and the lane is manual. | none |

## Proposed end state
About 25 lines: an opt-in skip, a frame/capture probe at the WebSocket and media boundary, and the visible voice
journey (Talk → Notes → Home → mute/unmute → Stop) with the optional long-session rotation check. It has no product
monkey-patching and no receipt file, unless the owner uses the receipt for latency tracking.
