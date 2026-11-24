# test/voice-repeated-interim.test.mjs
- Lines: 23 | Kind: transplant (slices `onTranscript:` and `onState:` out of the block starting `const direct=await developmentCartesiaConversation(` in `prototype/voice-adapter.ts`, plus the single source line containing `out.voiceInterim=`, glued into a `create()` function with five injected flags) | Verdict: DELETE (carry one case)
- Covers: the inline interim transcript shows a repeated phrase across a renewed session until its new final user message arrives; a superseded owner cannot update it; listening after complete/interrupted clears stale interim; own-key voice does not hide a repeated transcript behind older messages. Duplicates: `test/browser/live-voice.spec.ts` and `voice-composer-recovery.spec.ts` assert interim text in the page. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-8 | T2 | Three text slices of `voice-adapter.ts` including "the line that contains `out.voiceInterim=`"; breaks on any edit. | Delete. | Low |
| 2 | 9-12 | gap | Repeating the same sentence in a later turn must still show its interim text (a user-visible bug fixed once). | Carry: say "Open notes." twice in two turns in `journeys/voice.spec.ts` and assert the interim shows the second time until its final message lands. | Medium |
| 3 | 13-23 | T3 | Owner supersession and own-key variants. | Drop. | Low |

## Proposed end state
File deleted. One repeated-phrase case in `journeys/voice.spec.ts`, on the existing live voice fixture.
