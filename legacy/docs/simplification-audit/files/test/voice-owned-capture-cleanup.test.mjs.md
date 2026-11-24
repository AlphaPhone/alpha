# test/voice-owned-capture-cleanup.test.mjs
- Lines: 80 | Kind: transplant (`cloud-voice-view.mjs` vm copy of the voice adapter with `developmentCartesiaConversation` replaced; optional `ALPHA_VOICE_ADAPTER_SOURCE` env knob substitutes a different adapter file) | Verdict: DELETE
- Covers: realtime (development Cartesia) Stop uses its owned client, a pending Stop blocks replacement, a failed retirement latches "Microphone status unconfirmed", ordinary dictation cancels its own recording, Back dismisses a failed retirement without allowing another capture. Duplicates: `test/browser/voice-composer-recovery.spec.ts` ("Microphone status unconfirmed"), `voice-copy-presentation.test.mjs` (same latch and notice), `voice-owned-navigation.spec.ts` (Stop while held). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | T9 | `ALPHA_VOICE_ADAPTER_SOURCE` is set by nothing in the repo (grep: only this file and the research report); a mutation-testing hook left behind. | Delete. | Low |
| 2 | 8-28 | T2/A5 | Exercises the development realtime path (`developmentCartesiaConversation`) through a transplant. | Delete. | Low |
| 3 | 53-71 | T3 | Dictation recorder cancel ownership via counters of a fake driver. | Drop; latched-cleanup journey case (see `voice-copy-presentation` report) covers the user-visible outcome. | Low |

## Proposed end state
File deleted. The single carried behaviour (failed cleanup latches and blocks the next capture) is one case in
`journeys/voice.spec.ts`, shared with the carry from `voice-copy-presentation.test.mjs`.
