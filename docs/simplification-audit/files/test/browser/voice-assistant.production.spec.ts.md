# test/browser/voice-assistant.production.spec.ts
- Lines: 208 | Kind: Playwright production (flag-off bundle), 9 tests (+3-viewport loop); real UI over the synthetic native voice path (`voice-assistant-fixture.ts`), no renderer injection (s0 r16 w3) | Verdict: KEEP as the basis of `journeys/voice.spec.ts` (production section)
- Covers: one Talk control and no Transcribe; Stop drains playback before the next capture, keeps only the played sentence and reports exactly the heard text; Mute stops capture and an unplayed reply reports `nothingHeard`; without echo cancellation speech during playback is not routed; stopping before the pause discards the utterance and late transcripts; first-pause submission does not ask the semantic scorer; with echo cancellation a new utterance replaces an unheard speculative turn, output is pipelined and barge-in interrupts through the open mic; composer geometry is unchanged through listening/muted/speaking at three widths and two detents. Duplicates: `voice-composer-recovery.spec.ts` (dev presentation of mute/stop), `chat-voice-mode.spec.ts`, `voice-stop-speaking.spec.ts`. Callers/importers: production; imports `flag-off-android`, `voice-assistant-fixture`, `voice-fixture-failure-metadata`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | T8 | `say()` sleeps 150 ms between speech-start and speech-end on every utterance. | Advance on a condition (route received) or `page.clock`. | Low |
| 2 | 133, 151 | T8 | `waitForTimeout(1600)` twice to prove nothing is routed or posted later. | `page.clock.runFor` past the endpoint window. | Low |
| 3 | 203 | — | `console.log(JSON.stringify(...))` left in the geometry test. | Delete. | None |
| 4 | 140 | T4 | Geometry loop runs a full voice turn at three viewports × two detents (six turns). | Phone width both detents; one desktop check. | None |
| 5 | 77-78, 110 | P2 | Reads `alphaphone:voice-timing:v1` from localStorage to assert `endpoint.semantic:'not-asked'`; `eotCalls` already proves the scorer was not asked. | Drop the localStorage reads. | None |
| 6 | 23-80 | — | The Stop/drain/heard test is long but is the only end-to-end check of truncation reporting. | Keep. | None |

## Proposed end state
The production section of `journeys/voice.spec.ts`, case for case, with condition waits replacing the three sleeps, no `console.log`, no timing-journal reads, and a reduced geometry matrix. The dev-only voice presentation cases worth keeping (error and pending states) join from `voice-composer-recovery.spec.ts`.
