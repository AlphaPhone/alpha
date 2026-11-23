# test/pixel-spoken-acks.test.mjs
- Lines: 1678 | Kind: transplant (`cloudVoiceViewFixture` strips and `vm`-evals about 10 Alpha voice files; `loadSession` and `socketFixture` strip and `vm`-eval upstream `voice-assistant-session.ts` and `native-cloud-speech.ts` after regex-removing `import`/`export`) + source-text (2 tests) | Verdict: REWRITE as `test/integration/voice.test.ts` (about 15 cases)
- Covers: spoken model acknowledgements and the busy-hold mic contract on the Pixel routes: batch Cloud TTS, streaming Cloud speech socket, on-device live voice, on-device batch, open microphone. The ack is spoken once, preempted by the reply, silent when empty or refused, cancelled by Stop or Mute. Closed-capture echo and stale speech never barge in or send. Socket failures, protocol, owner and expiry errors end the turn at once. The native mute must confirm before a send, and a late reopen never happens. Duplicates: about 40 host files on the same `cloud-voice-view.mjs`/`shared-batch-voice.mjs` fixtures (`voice-calm-cloud-errors`, `voice-replies`, `cloud-streaming-conversation`, `voice-assistant.test.mjs`, ...; `research/tests-host.md:250`); the Quint speech and voice models; upstream session tests in `vendor/eliza/packages/voice`. Callers/importers: `npm test`; `test/fixtures/cloud-voice-view.mjs`, `test/fixtures/shared-batch-voice.mjs` (`voiceFakeClock`), `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-24 | T1 | Regex `/inputHeld/` on the upstream session source, as a guard that the right projection is loaded. | Delete. A real import of the session makes it unnecessary. | none |
| 2 | 1323-1330 | T1 | Regex-counts `cueSpeech={captureRetired:` in `voice-adapter.ts` and asserts `runtime/live-voice-cue.ts` does not exist (a tombstone, A8). | Delete. | none |
| 3 | 70-77, 429-433 | T2/T10 | The upstream session and native-cloud-speech modules are rewritten by `replace(/^import .*;\n/)` and `replaceAll('export class','class')`, then evaluated in a `vm` realm with stubbed `React`, `VoiceActivity`, `randomId`, `createHeardReporter`, timing recorders and `toSpeakableText`. A subclass captures `f.session`. | Rewrite: import `VoiceAssistantSession` and `createCloudStreamingSpeech` through the `@eliza/*` alias (D13) and the Alpha voice adapter as a real module, injecting the native port (`SpeechStreamBridgePlugin` shape) and a fake clock. Product modules need injectable ports for the Capacitor driver, the connection controller and the native port, rather than `vm` globals (D7 removal of the `import.meta.env` shims). | medium (needs those ports exported) |
| 4 | 280-1306 | T3/T7 | Combinatorial matrices: `socketEnds × audible`, `protocolFaults × audible`, `fences × route`, `holdStages × holdFaults` (12), `ack × fullDuplex × where × words × first × late` (lines 1277-1305), about 120 generated tests in all. Most vary a fault code that takes one code path. | Carry one representative per behaviour (list below). The rest are session-internal rules, so they belong upstream with `VoiceAssistantSession` (D14 follow-up). | low |
| 5 | 18, 29, 73 | C5 | Every fixture re-patches `f.box.Error`, `f.box.React` and `f.box.VoiceActivity` (repeated in sibling files). | Gone with the `vm` realm. | none |
| 6 | 1476-1660 | — | The "paired busy hold" and "paired idle Mute" sections mean the paired native close/open gates of the speech socket, not hosted-agent pairing (D5). Keep them in scope. | — | none |
| 7 | 1661-1678 | — | Open microphone on the on-device route (D7, kept). | Carry. | none |

Cases worth carrying into `test/integration/voice.test.ts`:
1. Native batch: the ack is spoken once, then the reply; repeat or changed labels are ignored (36).
2. Empty, oversized, unlabelled or activity-only ack is silent, with no canned line (46, one route).
3. reply_ready preempts a playing ack, and the reply waits for its cancellation or cleanup without overlap (163).
4. Stop cancels the ack and the turn and resolves only after cleanup (186).
5. Mute during the ack closes the mic at once; the cue never reopens it; Unmute does (200).
6. The ack's echo, during or just after it, neither interrupts nor is sent (215, 311).
7. Ack speech request refused or failing: silence, the reply is still spoken (265, 596).
8. Socket `protocol` failure, including Cloud completing the ack without audio, ends the conversation and cancels the request at once (509, 585).
9. Owner change on the socket during the ack closes the conversation without an error state (716).
10. Busy hold: the turn is sent only after the native mute confirms the close; a refused or unanswered close ends the conversation with nothing sent (1385, 1400, 1413).
11. A late native reopen after a terminal fault never sends or plays (1510).
12. A buffered old provider turn keeps input muted until it drains, then a fresh "Yes" is heard (467).
13. On-device live: the ack plays through on-device speech, and the next turn is heard (252, 552).
14. On-device batch: the ack plays only after the clip capture is retired (406).
15. Open microphone: resumed speech takes back the unheard turn and sends the joined text (1661).

## Proposed end state
`test/integration/voice.test.ts` (one file per voice area, shared with the other ~40 voice host files' surviving cases) imports
the real Alpha voice adapter and the upstream session and speech modules, with one fake native port and one fake clock
(`test/support/voice-harness.ts`, replacing `cloud-voice-view.mjs` + `shared-batch-voice.mjs`). It holds the 15 cases above in about 350 lines.
The fault and timing matrices are proposed upstream with the session. This file and its two source-text tests are deleted.
