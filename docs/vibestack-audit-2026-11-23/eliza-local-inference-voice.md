# eliza-local-inference-voice: develop → vibestack parity

Slice: develop `plugins/plugin-local-inference`, `plugin-native-inference`, `plugin-embeddings`,
`packages/voice`, `plugin-vision` against vibestack `packages/localInference`,
`packages/agent/src/voice`, `spec/localInference`, `spec/agent/voice`. Where the develop code moved
outside those vibestack paths (native Android to `packages/os/android/{local-inference,voice-io}`,
the Cloud speech transport to `packages/os/src/bridges/voice.vibe`, the engine to
`packages/os/src/inference`), I followed it far enough to say whether the behaviour survived.

Trees: develop `7a124190a1`; eliza-vs `769b4f00d9` (branch vibestack-dp); alpha-vs `3d7ca9727`
(pins eliza `c84e5d68e3`, an ancestor of eliza-vs HEAD); alpha-develop `dd63c6bc6`.
Read-only. Nothing was built, generated or run; every claim is from reading source.

## Summary

| Class | Count |
|---|---|
| OK | 24 |
| NOT_APPLICABLE | 12 |
| CHANGED | 6 |
| MISSING | 8 |
| UNIMPLEMENTED | 3 |
| UNMODELED | 2 |
| UNVERIFIED | 3 |
| Gaps total | 22 (2 already named in wave3.md) |
| Contract mismatches with Alpha's port | 9 |

Verdict: **not at parity.** The pure pieces ported faithfully: the echo and filler gate, the
non-speech annotation fix, the end-of-turn heuristic, the gap timings, the heard-report protocol,
the Cloud speech piece planner, the Cloud streaming transport, the embedding model pin and vector
space, the native speech bridge's method set and refusal texts, and the engine pin. What did not
survive is the upstream voice turn controller the phone ran on develop
(`VoiceAssistantSession`, 1,585 lines): vibestack's `VoiceSession` (235 lines) drops speculative-turn
rejoin, streamed early speech, the owner-review pause, microphone mute and its diagnostics.
On-device live recognition went from streaming to batch. Two wire fields the Alpha port reads
(`awaitingReview`, the status `label`) are never written by upstream, and the Alpha port's native
build scripts name upstream paths that do not exist.

PRs since 2026-11-13 touching the slice (11): #39796, #39805 OK; #39654 OK; #39827 UNMODELED (gap 12);
#39784 CHANGED-low (gap 21, ledger already has it partial); #39833 UNIMPLEMENTED (gap 10);
#39669 partly contradicted (gap 18); #39645, #39713, #39715, #39732 NOT_APPLICABLE.

## Gaps

Most severe first. Ids are stable.

### eliza-local-inference-voice-01 · CHANGED · high — on-device live recognition is batch-only, no interim transcript
- Behaviour: on develop the resident's live route ran a streaming transcriber: interim partials went
  out as `voice-transcript` `partial` events, the answer carried `mode: "stream"|"batch"`, and status
  reported `streaming: true|false|null`. The phone was verified with `ready:true, streaming:true`.
- Develop: `plugins/plugin-local-inference/src/routes/local-inference-asr-live.ts:164-180,331`;
  `src/services/voice/live-streaming-asr-session.ts:3,107,203`; `packages/voice/src/live-voice-session.ts:59`.
- Vibestack: `spec/agent/voice/clientAudio.md:292` ("recognised once … as one mono PCM16 WAV; … `mode: "batch"` …
  `streaming: false`"); `packages/agent/src/voice/live-asr.vibe:42,98-99,132,140`. The inference host has no
  streaming op (`packages/os/src/inference/index.vibe`: load, unload, warmEmbedding, embed, capabilities,
  synthesize, transcribe, endOfTurn).
- Impact: on the Device route the owner sees no words while speaking, the final arrives only after the
  whole segment is transcribed, and `live-session.vibe`'s partial handling (annotation check before a
  barge-in hold) never runs on the phone. `asrFinalFromSpeechEndMs` grows with utterance length.
- Smallest fix: add a streaming transcribe op to the host and `InferenceEngine`, publish `partial` from
  `live-asr.vibe`, and let `mode`/`streaming` say what ran; or record the batch decision as accepted.

### eliza-local-inference-voice-02 · MISSING · high — an open-microphone turn taken back mid-sentence loses its first half
- Behaviour: with the open microphone a turn is sent at the first pause. On develop, speech that resumed
  before any reply audio aborted that request and **carried its text into the utterance in progress**; the
  next submission sent the joined text and named the aborted turn in `supersedes`.
- Develop: `packages/voice/src/voice-assistant-session.ts:40-49,250,436,901-913,1090-1132`; used by
  `alpha-develop/apps/app/src/prototype/voice-adapter.ts:69,714,920` (`openMic:true`, gaps 0/0, holds 400/400).
- Vibestack: `packages/agent/src/voice/session.vibe:174-178` clears the text when it sends; a confirmed
  barge-in (`spec/agent/voice/session.md:283-300`, `cutTurn` at :321) aborts the turn and "the speech becomes
  the next utterance". `VoiceTurn` (`ports.vibe:27-32`) has no `supersedes`. `grep supersedes` finds nothing
  under `packages/agent/src/voice`, `spec/agent/voice` or `alpha-vs/apps/app/src/voice`.
- Impact: "Text Sam … (pause) … that I'm running late" is sent as "that I'm running late" alone after the
  first half is aborted; the aborted user message is not replaced in history.
- Smallest fix: keep the sent text until reply audio starts, rejoin it on `TurnAborted` by barge-in, add
  `supersedes` to `VoiceTurn`, and a rule for it in `session.md`.

### eliza-local-inference-voice-03 · MISSING · high — voice does not stop for an owner review
- Behaviour: on develop a reply carrying a proposal ended the voice session, and an owner-input pause held
  the session in `awaiting-user-input` until the host delivered the approved result through `resume()`.
  Develop also closes the microphone during owner review (88019e7ca5).
- Develop: `voice-assistant-session.ts:63-66,82,108,118,635,1395-1454`; `alpha-develop/.../voice-adapter.ts:965`.
- Vibestack: `VoiceReply` is `{messageId, text, action?}` (`ports.vibe:40-44`); `DoneFrame`
  (`packages/agent/src/client/reply-frame.schema.vibe:13-25`) has no review flag and frames decode with
  `onExcessProperty: "error"` (`stream-reader.vibe:23`). The proposal action writes
  `actionResults[].data.awaitingUserInput` (`packages/agent/src/device-actions/proposal/action.vibe:158`).
  No pause or resume event in `spec/agent/voice/session.md`.
- Alpha's port reads a top-level `awaitingReview` that upstream never writes
  (`alpha-vs/apps/app/src/voice/conversation.vibe:369,469`, `native.schema.vibe:55`), so `reviewNeeded` never fires.
- Impact: with a call/SMS/calendar card waiting for approval, the phone keeps the microphone open and
  speaks the reply text as if the turn were done.
- Smallest fix: have the voice answer and `done` frame say a review is pending (or have the port read
  `actionResults[].data.awaitingUserInput`), and model the pause in `session.md`.

### eliza-local-inference-voice-04 · MISSING · high · listed in wave 3 (I, B) — the spoken acknowledgement line never arrives
- Behaviour: develop's status frame was `{type:"status", kind, label?, actionName?, toolName?}`; the model's own
  line rode in `label` (`emitStatus({kind:"thinking", label:text})`) and the phone spoke it as the cue.
- Develop: `packages/contracts/src/contracts/chat.ts:30-44`; `packages/agent/src/api/chat-routes.ts:2590-2602,2950`;
  `packages/agent/src/api/chat-stream-writer.ts:98-103`.
- Vibestack: `StatusFrame {type, activity}` (`reply-frame.schema.vibe:6`), `onStatus(activity)`
  (`stream-reader.vibe:9,78`), written at `packages/agent/src/conversation/stream.vibe:148`.
- Alpha's port passes `(activity, label?)` (`alpha-vs/apps/app/src/voice/conversation.vibe:353`) and admits a
  cue only when `labelChars >= 1` (`alpha-vs/apps/app/spec/voice/acknowledgement.md:49-50`,
  `src/voice/acknowledgement.vibe`), so no cue is ever spoken.
- wave3.md I assigns "the 'Sure' acknowledgement and all ack/cache work" to another session; it does not
  name the `label` wire field, so check their PR carries it.

### eliza-local-inference-voice-05 · MISSING · medium — a streamed reply is not spoken until it is complete
- Behaviour: develop spoke each finished sentence of a confirmed, proven-direct reply as it streamed
  (`send`'s `onText` with `AssistantTextFrame`), then played the rest from the first sentence not yet spoken.
- Develop: `voice-assistant-session.ts:57-62,150-160,236-251`; `pipelineSpeech` at :435-457.
- Vibestack: `TurnPort.send` resolves one whole `VoiceReply` (`ports.vibe:46-49`); `session.vibe` `#speak` runs
  after it. Alpha's port waits for `Done` and uses previews only for latency marks.
- Impact: time to first audio is the whole reply time, not the first sentence's.
- Smallest fix: a streaming variant of `TurnPort.send` that hands confirmed direct sentences to the speaker.

### eliza-local-inference-voice-06 · MISSING · medium — no microphone mute or "paused while responding" state in the session
- Develop: `voice-assistant-session.ts:99,104,432,596-620` (`setMuted`, `muted`, `inputHeld`); shown by
  `alpha-develop/.../voice-adapter.ts:1044-1046` ("Mute microphone", "Microphone paused while Alpha responds").
- Vibestack: no mute event or state in `spec/agent/voice/session.md` or `session.vibe`. Alpha's port mutes
  only the speaker (`alpha-vs/apps/app/spec/voice/conversation.md:226-234`).
- Impact: the owner cannot mute the microphone without ending voice.

### eliza-local-inference-voice-07 · MISSING · medium — the resident's one-shot speech routes are gone
- Develop: `/api/tts/paradee`, `/api/tts/paradee/status`, `/api/asr/libelizainference`,
  `/api/asr/libelizainference/status` (`packages/agent/src/api/runtime-mode/route-mode-matrix.ts:201-222`;
  `plugins/plugin-local-inference/src/routes/local-inference-tts-route.ts`, `local-inference-asr-route.ts`).
- Vibestack: `packages/localInference/src/routes.vibe` serves only `/api/local-inference/*` and the
  end-of-turn route; `packages/agent/src/voice/live-asr.vibe` serves the live route. Speech is reachable
  only as the `TEXT_TO_SPEECH`/`TRANSCRIPTION` model handlers (`plugin.vibe:63-70`).
- Alpha's port still calls them: `alpha-vs/android/.../PairedSpeechContract.java:7` (paired development
  host) and `alpha-vs/scripts/android-browser-reading-live.ts:79,101,248`.
- Impact: paired-agent speech and the browser-reading live script fail with 404. The production phone uses
  the native bridge and is not affected.

### eliza-local-inference-voice-08 · MISSING · medium — voice qualification harness is not in the tree
- Develop: `plugins/plugin-local-inference/native/android/src/main/java/ai/eliza/voice/Wer.java` and
  `packages/app/scripts/paradee-voice/qualify/**` (`AsrWerTest`, `ParadeeRoundTripTest`).
- Vibestack: no `Wer.java`, no qualify project under `packages/os/android/local-inference`.
- Impact: the engine cannot be requalified at the vibestack pin (ASR WER and round-trip figures), which is
  what the owner's voice acceptance record rests on.

### eliza-local-inference-voice-20 · CHANGED · medium — the inference engine is no longer a pinned gitlink
- Develop: `plugins/plugin-local-inference/native/llama.cpp` is a submodule at `5c5d6163c8`.
- Vibestack: `packages/os/android/local-inference/engine.lock.json` names the same commit; the consumer
  must check it out and pass `elizaInferenceEngineDir` (`consumer.gradle:15-19`). No `.gitmodules`.
- Impact: Alpha's native input scripts still resolve the engine as a gitlink of the eliza tree (see contract
  mismatches); they fail before any build.

### eliza-local-inference-voice-10 · UNIMPLEMENTED · medium — the speech-output model is bound to code nothing runs
- `spec/localInference/speechOutput.md` (11 rules: publication, bootstrap) is implemented by
  `packages/localInference/src/speech-output.vibe` (`publishReply`, `bootstrapStreamedSpeech`), whose only
  caller is `packages/localInference/test/local-inference.test.vibe`. The phone runs the Java
  `LocalSpeechBridgePlugin`/`SpeechStreamBridgePlugin`.
- Develop bound the Java source itself to the model: `plugins/plugin-local-inference/quint/check-prepared-speech-publication.mjs`
  and `check-speech-bootstrap-connection.mjs` extract the method bodies and replay the cases (#39833 kept that binding).
- Smallest fix: a JVM conformance test over the generated cases, as `packages/os/android/voice-io/src/test` does
  for warm-up and lead trim.

### eliza-local-inference-voice-09 · UNVERIFIED · medium — native speech tests were not carried over
- Develop `native/android/test/speech/`: `SpeechAppendTest` (gapless append, and #39827's mute-under-duck
  check), `SpeechCoresTest`, `SpeechEngineHoldTest`, `LiveVadHangoverTest`; `test/assets/VoiceBundleAssetsTest`;
  `speech-bridge/test/failure-settlement.test.mjs`.
- Vibestack has `LiveCaptureTest`, `SpeechLeadTrimTest`, `SpeechOutputWarmupTest`, `CloudSpeechWireTest` only.
- The ported sources for those classes are byte-identical or refactor-only (statement diff), so the behaviour
  is probably intact; nothing in the tree checks it.

### eliza-local-inference-voice-19 · UNVERIFIED · medium · listed in wave 3 (B) — heard reports for replies over 64 KiB
- Named in wave3.md B; not re-derived. Client side: `packages/agent/src/voice/session.vibe` sends
  `playback.text.slice(0, sourceEnd)` unbounded; server `packages/agent/src/conversation/heard.vibe:8`.

### eliza-local-inference-voice-22 · UNVERIFIED · medium — nothing in the slice is locked, proved or driven by generated cases
- `spec/lock.json` has entries only for `spec/app/*` and `spec/index.md`; none for `spec/localInference/**` or
  `spec/agent/voice/**`. `unproved` is empty because nothing is recorded, not because everything is proved.
- One proof file in the slice: `spec/localInference/models.proof.dfy`. None for speechOutput, speechRoute,
  textAndEmbeddings, transcriptPrivacy, or `spec/agent/voice/{session,clientAudio}.md`
  (`voice/echo-filter.ts` carries inline Dafny annotations).
- No conformance driver: `packages/agent/test/drivers/` has none for `agent__voice__*`, and
  `packages/localInference/test` has no drivers directory; the six voice test files and
  `local-inference.test.vibe` are hand-written. Every rule in the slice does have a Quint block.

### eliza-local-inference-voice-14 · MISSING · low — upstream timing and diagnostics modules
- Develop: `packages/voice/src/voice-turn-timing.ts` (`createVoiceTurnTiming`), `realtime-voice-timing.ts`
  (`sanitizeRealtimeTiming`, used by Alpha's diagnostics export), `native-live-voice.ts`
  (`nativeVoiceStageSink`, `readNativeVoiceTiming`), the session's `onTurn` endpoint record
  (`voice-assistant-session.ts:138-147,267`) and `latencyMs` on the end-of-turn answer.
- Vibestack: none upstream; Alpha's port has its own `voice/latency.vibe`. Equivalence not checked here.

### eliza-local-inference-voice-15 · CHANGED · low — the Clef endpoint chain is not upstream
- Develop: `packages/voice/src/voice-endpoint-chain.ts:48-52,154` (local scorer then Clef, 300 ms timeout,
  2,000 characters, six recent turns).
- Vibestack: no chain; Alpha's port posts `{kind:"turn", transcript}` to `/api/v1/decisions` itself under the
  session's 600 ms deadline, with no recent turns and no local-then-Clef order.

### eliza-local-inference-voice-12 · UNMODELED · low — speaker mute (#39827)
- Code: `packages/os/android/local-inference/speech-bridge/.../LocalSpeechBridgePlugin.java:576-587`,
  `SpeechStreamBridgePlugin.java:536-552`, `voice-io/.../StreamingSpeechPlayback.java:169-176,238`,
  `packages/os/src/bridges/voice.vibe` `setOutputMuted`.
- No rule: "mute" in `spec/os/voice/*.md` and `spec/localInference/*.md` is the microphone only.

### eliza-local-inference-voice-13 · UNMODELED · low — end-of-turn heuristic and turn signal
- `scoreEndOfTurnHeuristic` and `buildVoiceTurnSignal` (`packages/agent/src/voice/heuristics.vibe:92-166`) match
  develop (`packages/voice/src/voice-eot.ts`, `respond-gate.ts:211-284`) but no rule states them.
- One difference: develop's acoustic self-voice check applied while the reply was at most 9,000 ms old
  (`respond-gate.ts:92`); vibestack uses the echo window (1,500 ms after playback, 3,000 ms when the start is
  unknown, none when echo-cancelled). The phone passes no `selfVoiceSimilarity`.

### eliza-local-inference-voice-16 · CHANGED · low — the voice turn carries no turn signal
- Develop sent `voiceTurnSignal` with each turn (`voice-assistant-session.ts:236-251`;
  `alpha-develop/apps/app/src/runtime/alpha-client.ts:153,576`), read by
  `plugins/plugin-assistant/src/services/message/voice-signals.ts`.
- Vibestack `VoiceTurn` is `{text, channelType, metadata.voiceUi, clientMessageId}` (`ports.vibe:27-32`); no
  server reader. The client gate already ran before sending, so the phone's replies are unlikely to change.

### eliza-local-inference-voice-17 · CHANGED · low — a heard report has no request timeout
- Develop: `AbortSignal.timeout(10_000)` and uuid/assistant-reply/stale-binding checks
  (`packages/voice/src/voice-turn-routes.ts:196,231-245`).
- Vibestack: `new AbortController().signal` (`packages/agent/src/voice/agent-ports.vibe:81`); a request that
  never answers leaves the receipt dispatched and never retried.

### eliza-local-inference-voice-18 · UNIMPLEMENTED · low — an unreadable staged model is treated as absent
- Rule: `spec/localInference/models.md:136` ("reported unreadable, never as absent … nothing downloads over it").
- Code: `packages/localInference/src/models.vibe:303-311` — a staged file whose `stat` or digest read fails
  "stays absent", so a download may start over the packaged embedding model. Develop #39669 made the same
  distinction for the GGUF check (`plugins/plugin-native-inference/src/model-catalog/verify.ts`).

### eliza-local-inference-voice-11 · UNIMPLEMENTED · low — transcript privacy has rules and no code
- `spec/localInference/transcriptPrivacy.md` (6 rules); nothing under `packages/localInference/src` implements
  consent, redaction or sharing. Develop: `plugins/plugin-local-inference/src/routes/transcripts-routes.ts`,
  `actions/transcript-permissioning.ts`. The phone never called these routes.

### eliza-local-inference-voice-21 · CHANGED · low — Cloud speech port types are narrower than the bridge (#39784)
- Develop `CloudStreamPort`/`CloudStreamEvent` declare `muted` on start, `pace` on speak, `playedMs` on cancel,
  and `elapsedMs`/`playedMs`/`receivedMs`/`silent` on events (`packages/voice/src/native-cloud-speech.ts:9-66`).
- Vibestack `packages/os/src/bridges/definitions/voice.ts:19-45` omits them, though the Java supports them
  (`SpeechStreamBridgePlugin.java:206,278,657,1395`). The ledger already records #39784 as partial. Alpha does not use them.

## Contract mismatches with Alpha's port

1. `awaitingReview` on the voice turn answer and `done` outcome (`alpha-vs/apps/app/src/voice/conversation.vibe`,
   `native.schema.vibe:55`): not a field of `DoneFrame` or of any upstream answer. See gap 03.
2. `onStatus(activity, label?)`: upstream `ReplyStreamHooks.onStatus` takes `(activity)` only and `StatusFrame`
   has no `label` (`stream-reader.vibe:9`, `reply-frame.schema.vibe:6`). See gap 04.
3. `PairedSpeechContract.java:7` `ASR_PATH="/api/asr/libelizainference"`, `TTS_PATH="/api/tts/paradee"`, and
   `scripts/android-browser-reading-live.ts:79` `/api/tts/paradee/status`: no such routes. See gap 07.
4. `scripts/native-build-inputs.ts:38,41-42` and `scripts/paradee-runtime.ts:30-31`: `packages/os/android/local-inference/llama.cpp`
   as a gitlink; absent (engine is `engine.lock.json`).
5. `scripts/native-build-inputs.ts:38`, `scripts/ci/admit-cloud-signing-input.py:190,211`:
   `packages/os/android/local-inference/model-catalog/voice-model-versions.json`; the file is
   `packages/os/android/local-inference/voice-model-versions.json`.
6. `scripts/build-pinned-voice.ts:14,36`, `native-build-inputs.ts:38`, `admit-cloud-signing-input.py:207-209`:
   `scripts/paradee-voice/build-native.ts` and `scripts/voice/build-phonon2-gguf.ts`; they are
   `scripts/build-native.ts` and `scripts/build-phonon2-gguf.ts`.
7. `admit-cloud-signing-input.py:193-205`: `local-inference/package.json`, `elizavoice-jni/CMakeLists.txt` and
   `elizavoice-jni.cpp` (they are under `src/main/elizavoice-jni/`), `src/main/java/ai/elizaos/app/ElizaVoiceNative.java`
   (the class is `ai/eliza/voice/VoiceNative.java`), `scripts/aosp/*`, `scripts/build-helpers/omnivoice-merged.ts`,
   `scripts/lib/repo-root.ts`: all absent.
8. `scripts/voice-host.ts:202-203`: `packages/os/android/local-inference/native` and `paradee-voice/native`; absent.
9. `scripts/resident/entry.vibe` bundles `entry(localInferencePluginName, localInference)`, which reads
   `module.default ?? module.plugin`; `@elizaos/plugin-local-inference` exports neither. It works only because
   the same name is in `hostModules`. Not a failure if `runAgentCli` skips an undefined plugin for a host
   module; not verified.

Verified present with the shape the port uses: every `@elizaos/agent/voice` import
(`VOICE_TRANSCRIPT_STREAM`, `createLiveVoiceSession`, `defaultVoiceProfile`, `CaptureEvents`, `LiveVoiceSession`,
`SpeakerEvents`, `VoiceProfile`, `VoiceReply`, `VoiceSessionPorts`, `VoiceReplyAction`); every
`@elizaos/plugin-local-inference/speech-route` import (13 names); `localInferenceModule`,
`localInferencePluginName`; `AndroidInferenceEngine`, `androidInferenceLayer`; `AssistantCapture`,
`AssistantListenHandlers`, `CloudStreamingSpeech`; routes `/api/asr/local-inference/{end-of-turn,live,live/status}`,
`/api/local-inference/*`, `/api/conversations/:id/messages/:messageId/heard`, `/api/turns/:roomId/abort`;
the 28 `@PluginMethod` names of the two speech bridges; all 19 bridge refusal texts Alpha words.

## Confirmed OK

| Behaviour | Develop | Vibestack rule | Vibestack code |
|---|---|---|---|
| Filler and echo gate (70 %, 2+ words, 1,500/3,000 ms, none after playback when echo-cancelled) | `packages/voice/src/respond-gate.ts:150-193` | `spec/agent/voice/session.md:236-266` | `voice/heuristics.vibe:33-90`, `voice/echo-filter.ts` |
| Sound annotations are never a turn; a partial that may become one does not interrupt (#39796, #39805) | `respond-gate.ts:42-89` | same rule | `heuristics.vibe:27-50`, `live-session.vibe:136-140` |
| Short gap, long gap, 600 ms scorer deadline (300/1,200) | `voice-assistant-session.ts:293-299` | `session.md:112,171-176` | `session.vibe:139-166` |
| Open-microphone profile 0/0/400 with no heard report on Stop | `alpha-develop voice-adapter.ts:69` | `session.md:103-128` | `live-session.vibe:167-172` |
| Barge-in by accepted transcript or hold | `voice-assistant-session.ts:49-52` | `session.md:283-300` | `session.vibe:74-76`, `live-session.vibe:90-96` |
| Half-duplex closes the microphone per turn and reopens after | `voice-assistant-session.ts:26-36` | `session.md` capture rules | `session.vibe:84-131` |
| Dictation never submits; draft guard | `live-voice-session.ts:747` | `session.md:270-279`, `clientAudio.md` dictation story | `recorded-transcription.vibe` |
| End-of-turn route: path, 4,096 limit, 400 answers, text never audio | `routes/local-inference-eot-route.ts` | `session.md` end-of-turn rule; `spec/os/agentService/inference.md:126` | `localInference/src/routes.vibe:16,80-88` |
| Heard report: played prefix, `nothingHeard`, one retry after 1,500 ms, 409/404 outcomes, nothing sent when playback failed before any sentence | `voice-turn-routes.ts:104-260` | `session.md` report rules (:360-390) | `voice/heard-reports.vibe`, `session.vibe:216-229` |
| Cloud speech piece plan (220 first, 5,000 later, abbreviations) | `cloud-speech-chunks.ts` | `clientAudio.md:130-133` | `voice/speech-pieces.vibe` |
| Cloud streaming speech transport | `native-cloud-speech.ts` | `spec/os/voice/cloudSpeech.md` | `packages/os/src/bridges/voice.vibe` |
| Owned native speech request | `native-speech-request.ts` | `cloudSpeech.md:64` | `bridges/voice.vibe` `createNativeSpeechRequests` |
| Recording decode and WAV encode (16 kHz, 60 s, 16 MB, 8–48 kHz) | `browser-capture/recording-pcm.ts` | `clientAudio.md` first rule | `voice/capture.vibe` |
| Live route shapes and limits (4 sessions, 60 s idle, 128-char id, 429/503/502/409 codes) | `routes/local-inference-asr-live.ts:59-63,191-339` | `clientAudio.md:292` | `voice/live-asr.vibe` |
| `voice-transcript` envelope | `live-voice-session.ts:132` | same rule | `voice/live-session.vibe:36-60` |
| Embedding model pin and space (bge-small f16, 384, CLS, unit length, same digest and revision) | `plugin-native-inference/src/model-catalog/bge-embedding-model.ts`, `runtime/embedding-presets.ts:33-35` | `textAndEmbeddings.md` vector-space rule | `catalog.vibe:44-66`, `embeddings.vibe` |
| Embedding owner order (operator, hosted when chosen, device) | `plugin-embeddings/src/index.ts` priority note | `textAndEmbeddings.md` last rule | `plugin.vibe:48-56` |
| Unreadable models directory is not "nothing installed" (#39654) | `services/providers.ts` | `models.md:136` | `models.vibe:91-101,168-187` |
| Download verified by digest, cancel discards, partial removed | `services/downloader` | `models.md` download rules | `models.vibe:243-288` |
| Speech route order, one fallback to the device, holds (Alpha app code on develop, now upstream) | `alpha-develop` runtime | `spec/localInference/speechRoute.md` | `speech-route.vibe` |
| On-device synthesis and transcription handlers | `provider.ts` | `speechRoute.md` first rule | `plugin.vibe:63-70`, `speech.vibe` |
| Voice reply action label decode | (new shape) | `spec/agent/conversation/planning.md:261` | `voice/ports.vibe:34-38`, `agent-ports.vibe:27-30` |
| Native bridge: 28 plugin methods, refusal texts, VAD options; diffs are interface extraction only | `native/android/**` | `spec/os/voice/{liveCapture,microphone,speechOutput}.md` | `packages/os/android/{local-inference,voice-io}` |
| Engine commit, `inputs.json`, `voice-product-inputs.mjs`, mobile-voice 1.4.2 | `native/android/inputs.json`, `voice-model-versions.json` | — | `packages/os/android/local-inference/{engine.lock.json,inputs.json,voice-model-versions.json}` |

NOT_APPLICABLE (12): `plugin-vision` and #39713, #39732 (the phone never loaded it; no vibestack package);
`plugin-embeddings` bring-your-own endpoint (no `EMBEDDING_BASE_URL` on the phone); #39715 (comment only);
#39645 bionic host loader (the engine now runs in the app process over a socket; the phone loads no text model);
the Capacitor `ElizaInferencePlugin` transport (Alpha never enabled it); on-device text generation
(`spec/agent/models/binding.md`: no text handler is served on the device; the phone uses Cloud);
wake word, diarizer, speaker encoder, voice emotion and Kokoro model entries; voice-profile, speaker and
live-diarization routes; `generate-media`, `identify-speaker` and local-inference-management actions;
the Apple Foundation backend and capacitor-llama adapter; PII scrub service; voice workbench.

## Not covered

- Server side of the heard route, the `VOICE_DM` turn, the reply stream and the turn abort route
  (`packages/agent/src/conversation/**`): read only where the voice client's contract needed it.
- `packages/os/android` beyond the speech bridge: `SpeechStreamBridgePlugin` grew from 35 KB to 52 KB of
  code (statement-level rewrite); I compared its method set and wire codes, not its state machine against
  `spec/os/voice/cloudSpeech.md`. `CloudSpeechWire`, `CartesiaSpeech`, `SpeechAudioFocus`,
  `StreamingSpeechPlayback`, `LocalMicrophoneLease` were not diffed line by line.
- `elizavoice-jni.cpp` and the native build scripts (`build-native.ts`, `stage-elizavoice-lib.ts`) against
  develop's `packages/app/scripts/paradee-voice`.
- `LocalInferenceHost.java`/`HostInferenceNative.java` against develop's bionic host and fused embedding
  bundle (protocol, idle release, concurrency); `spec/os/agentService/inference.md` was only skimmed.
- Whether Alpha's own reimplementations (`voice/latency.vibe`, `dictation.vibe`, `vad.vibe`, `listener.vibe`,
  `speech.vibe`) equal the develop upstream modules they replace; that is the alpha-side audit.
- `packages/voice` acoustic modules never used by the phone (NLMS echo canceller, delay calibrator, echo
  metrics, first-sentence snip, owner inference, speech disclosure, cloud-clef client).
- `plugins/plugin-local-inference/src/services/**` (about 100 K lines: router handler, downloader, engine,
  voice pipeline) beyond the files cited; the routing preferences file (`local-inference/routing.json`) and
  `installRouterHandler`, which an Alpha check script imports, were not traced.
- Develop history before 2026-11-08 (shallow clone).
- Nothing was run: no `gen`, no tests, no Quint, no Dafny.
