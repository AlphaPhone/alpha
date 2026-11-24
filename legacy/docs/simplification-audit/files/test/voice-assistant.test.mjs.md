# test/voice-assistant.test.mjs
- Lines: 917 | Kind: unit of upstream code (real `VoiceAssistantSession`, `createLiveSegmentStream`, `residentEndpoint` imported through the pass-through shims `apps/app/src/runtime/voice-assistant.ts`, `live-segment-stream.ts`, `voice-turn-routes.ts`, which re-export `.eliza/client-features/packages/voice/src/*`; fake clock, capture, agent, speaker) plus one source-text test and one host-JVM test of upstream Java | Verdict: DELETE
- Covers: the shared voice assistant turn controller (endpointing, closed input, barge-in, mute, heard prefix, streamed playback) and the live segment stream. Duplicates: `vendor/eliza/packages/voice/src/voice-assistant-session.test.ts` (71 cases; same scenarios, often the same wording: long-gap submit, short-gap semantic finish, racing decision, closed input during thinking/playback, echo, Mute close failure, binding change, never approves, sentence splitting, streamed playback, provisional frames, replyFailed vs playbackFailed) and `vendor/eliza/packages/voice/src/live-voice-session.test.ts` (ASR_FAILED null, stop reconciliation, cancel). Product wiring is driven by `test/browser/voice-stop-speaking.spec.ts`, `chat-voice-mode.spec.ts`, `voice-assistant.production.spec.ts`. Callers/importers: `npm test` glob.
- Research correction: `research/tests-host.md:1402` proposes keeping this as the "voice integration core". It is not Alpha code: the three runtime files say "it adds no behavior of its own". Keeping it re-tests upstream (T5) and pins Alpha to upstream internals.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9, 145 | T5/D4 | Tests upstream controller through one-line re-export shims; the upstream package carries its own suite of the same behaviour. | Delete the file. Diff its case list against the upstream suite first; any case missing upstream (candidates: "unconfirmed request/conversation id never reaches playback" lines 807-819, "Notes review keeps input closed through exact approval" lines 488-525) goes to `cross-file-actions.md` §6 as an upstream follow-up (D14). | Medium |
| 2 | 11-31 | C3 | Private fake clock; `fixtures/shared-batch-voice.mjs` has a second one (`voiceFakeClock`). | Gone with the file. | Low |
| 3 | 749-775 | T1 | Regex over seven source files (no `console.`/storage), `voice-adapter.ts`, `native-live-voice.ts`, `vendor/eliza` sources and `template.html` markup. | Delete; storage/logging bans belong in `scripts/audit-production-bundle.ts` if wanted. | Low |
| 4 | 777-783 | T5 | Compiles upstream Java (`vendor/eliza/plugins/plugin-local-inference/.../LiveCaptureSource.java`) with an upstream fixture on the host JVM, then regex-matches `LiveVoiceCapture.java`. Upstream test of upstream code. | Delete. | Low |

## Proposed end state
File deleted (about 4 s of runtime saved). Alpha's voice behaviour is covered by `journeys/voice.spec.ts`; the controller
is covered where it lives, in `vendor/eliza`. If the shims `voice-assistant.ts`/`live-segment-stream.ts`/`voice-turn-routes.ts`
remain only "for its adapter and tests", the adapter should import `@elizaos/voice/*` directly and the shims go (D4).
