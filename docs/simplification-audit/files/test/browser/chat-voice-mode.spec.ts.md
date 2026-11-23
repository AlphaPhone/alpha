# test/browser/chat-voice-mode.spec.ts
- Lines: 169 | Kind: Playwright, `chromium` project; voice UI driven after replacing 11 `BrowserVoice.prototype` methods, 5 `Component.prototype` methods and `connectionController.getSnapshot/getCloudEnvironment/getCloudClient` in the page (P3, T6) | Verdict: **REWRITE** as `journeys/voice.spec.ts` steps on the voice bridge fixture; DELETE the policy and diagnostics cases
- Covers: unsigned Talk shows "Microphone off" disabled and Stop works without capture; Cloud voice over Calendar keeps the app, the draft and Notes and sends only the new transcript; recorded-clip conversations show no interruption toast and record `batch` in diagnostics; auto-send vs review send policy; minimise to the compact pill keeps the capture and Stop retires it; account change discards held ASR; chat header and voice controls geometry in half/full; paused awaiting-input keeps the review card and Stop visible; composer and pill keep their footprint between text and voice. Duplicates: Talk/Stop/Mute in `voice-assistant.production.spec.ts`; account change in `dev-speech-account-switch.spec.ts`; timing records in `voice-timing.spec.ts`; route choice in `voice-route-preference.spec.ts`. Callers/importers: none. Helper: `helpers/page-modules.ts` (4 other importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-37 | P3 | All voice I/O, the conversation binding, turn sending and the connection snapshot are replaced at the class level. The test therefore checks the shell's state machine with every collaborator faked. | Rewrite on the bridge boundary: `voice-assistant-fixture.ts` / `cloud-voice-fixture.ts` already fake `AlphaVoiceCloud` captures, and the resident stub answers turns. | Medium: some states (held start, held transcript) need fixture switches (`holdStart`, `holdTranscript`). |
| 2 | 97-112 | A4 (D8) | "holds review for edited Send or zero-send Discard" depends on `setVoiceSendPolicyForTests('review')` (`runtime/voice-selection.ts:25`), the test-only send-policy override D8 deletes. | Delete with the override. | none |
| 3 | 88-96 | T3 | "uses auto-send" asserts `voiceSendPolicy()==='auto-send'` then checks no review step. The no-review part is the default voice journey. | Delete; the default journey covers it. | none |
| 4 | 72-87 | T6 | Reads `voiceTimingRecords()` and `buildDiagnostics()` through imports to check `mode:'batch'`. | Delete here; `voice-timing.spec.ts` owns diagnostics. Keep "no interruption toast" as one assertion in the voice journey. | Low. |
| 5 | 53 | T6 | `onDeviceRoute` calls `noteNetworkSpeechFailure` to force the device route. | Trigger the route through the fixture (Cloud answers 402) or the route preference in Settings. | Low. |
| 6 | 56-71, 113-114, 128-136, 160-169 | none | Unsigned stop, Cloud voice over another app with draft preserved, minimise to pill, account change discarding held ASR, paused awaiting-input review, pill footprint are user-visible behaviour. | Carry these six into `journeys/voice.spec.ts` "conversation". | none |
| 7 | 116-126, 138-158 | T1-adjacent | Geometry of brand/grabber/header (44/48 px, centring) and composer footprint at three viewports by two detents. | Keep one footprint check (390 px, half) in the voice journey; move tap-target sizes to the accessibility sweep; drop the rest. | Low. |
| 8 | 48 | T8 | `utterance` sleeps 950 ms with a raised peak to simulate speech. | Use the fixture's speech-start/speech-end frames (as `voice-assistant-fixture.ts` `say` does) or `page.clock`. | Low. |
| 9 | 167 | B5 | `console.log` of measurements. | Drop. | none |

## Proposed end state
`journeys/voice.spec.ts` "conversation" gains about six tests on the shared voice fixture: unsigned Talk and Stop,
Cloud voice over another app keeps app and draft, minimise to pill and Stop, account change discards held speech,
paused review keeps controls reachable, composer/pill footprint unchanged. The send-policy and diagnostics cases are
deleted. Delete this file.
