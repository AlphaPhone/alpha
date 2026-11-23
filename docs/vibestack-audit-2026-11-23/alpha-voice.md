# Alpha Phone parity audit: voice

Slice: dictation, voice conversation, on-device speech (single profile, open mic), speech routes, the
always-on listener, spoken acknowledgements, voice during calls, local speech playback, the Cloud
speech relay, and the on-device speech packaging.

Trees: legacy `alpha-develop` (dd63c6bc, through #1454), port `alpha-vs` (3d7ca972, develop merged
through #1449), upstream `eliza-vs`. Paths below are relative to `/home/shaw/.cache/vibeaudit/`.
Nothing was built, generated or run (brief rule); every finding is from reading both sides.

## Summary

| Class | Count |
| --- | --- |
| OK | 22 |
| UNIMPLEMENTED | 17 |
| CHANGED | 9 |
| MISSING | 6 |
| UNMODELED | 2 |
| UNVERIFIED | 3 |
| KNOWN | 11 |
| RETIRED | 3 |

Verdict: **not at parity.** The models are thorough (every `###` rule in `spec/voice/*.md` has a
Quint block, and the pure decisions I compared with legacy match: route order, holds, clip limits,
VAD constants, the #1450 acknowledgement hold, text screening). The loss is in the wiring around
them. The owner cannot start a voice conversation from the chat at all: Talk publishes to a stream
nobody reads and the conversation control is mounted nowhere. On every stock-Android install the
startup listener stop cannot reach its bridge, so a permanent "could not be confirmed off" alert
shows. Network voice needs a disclosure that only the unmounted control can give. The on-device
speech packaging records contradict the port's own scripts (JNI library name, engine pin). Around
that, a dozen spec rules have code nobody calls (typed send, review settle, sign-out retire,
failure messages, Cloud warm-up, the device probe, the timing export), and several legacy
behaviours have neither spec nor code (microphone mute, interim transcript, the #1453 voice fix,
the latency release gate). Paired-agent voice is a deliberate retirement (#1422) and is listed as
such.

## Gaps

Most severe first. "Legacy" cites `alpha-develop/`, "Port" cites `alpha-vs/`.

### 1. UNIMPLEMENTED: Talk in the chat never starts a voice conversation

- Behaviour: pressing Talk starts a voice conversation (legacy `test/browser/chat-voice-mode.spec.ts:49`,
  `test/browser/voice-assistant.production.spec.ts:31`; legacy `apps/app/src/prototype/voice-adapter.ts:1018-1062`).
- Port: `apps/app/src/web/assistant/AssistantDock.tsx:97` and `AssistantScreen.tsx:32` call
  `Assistant.requestVoice()`, which only publishes to a PubSub (`apps/app/src/assistant/assistant.vibe:227`).
  Its stream `voiceRequests` (`assistant.vibe:216`) has no subscriber anywhere in `apps/app/src`.
  `ConversationControl` (`apps/app/src/web/voice/ConversationControl.tsx`), the only component that calls
  `VoiceConversation.start`, shows the disclosure and renders Stop, Stop speaking and Mute, is exported from
  `web/voice/index.tsx` and imported by nothing. The only live caller of `start` is
  `startFromInvocation` (`apps/app/src/shell/integration.vibe:51`), which exists only on the AOSP image.
- Not in `docs/vibestack-open-items.md`.
- Impact: no voice conversation on any phone from the chat; no Stop, Stop speaking or Mute control and no
  notice line even when an invocation does start one.
- Smallest fix: mount `ConversationControl` in `web/assistant/ChatPanel.tsx` (it already takes `onTalk`), or
  subscribe to `assistant.voiceRequests` in `shell/integration.vibe` and call `voice.start(...)` plus
  `navigation.send({ type: "startVoice" })`. No spec change needed.

### 2. CHANGED: on stock Android the startup listener stop cannot run, and an alert shows on every screen

- Behaviour: where the image does not admit the listener, a listener left on is stopped at startup and the
  stop is confirmed (legacy `apps/app/src/runtime/always-on-listener.ts:38-45`; the Sense plugin is
  registered for every variant, `android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java`).
- Port: spec rule exists (`apps/app/spec/voice/listener.md`, "The listener is admitted only on the AOSP
  variant whose image declares it; elsewhere on Android a listener left on is stopped at startup"). The
  shell calls `native.invoke("ElizaSense", "turnOff")` (`apps/app/src/voice/listener.vibe:127`), but
  `ElizaSense` is declared `reach: "AospImage"` (`apps/app/src/platform/native-plugins.ts:236-237`) and
  `nativeOver` throws `NativeUnavailable` for a plugin outside its variant
  (`apps/app/src/platform/native-live.vibe:24-31`, `offered` and `invoke`). On the launcher variant the reply is therefore always
  `undefined`, the machine settles `StopUnconfirmed`, and `VoiceIndicatorView.tsx:58-63` shows
  "Wake listening could not be confirmed off. Turn it off in Android settings." as a `role="alert"` at the
  top of every screen, for good. The port test passes only because its fake Native ignores reach
  (`apps/app/test/voice/voice.test.vibe:42`).
- Impact: a false privacy alarm on every non-AOSP phone, and a listener really left on is never stopped.
- Smallest fix: give `ElizaSense` `reach: "AnyNative"` (or a second entry for `turnOff`) in
  `platform/native-plugins.ts`; add a test that runs the listener over `nativeOver` with the Launcher variant.

### 3. CHANGED: network voice needs a disclosure that nothing can give, and it is forgotten on restart

- Legacy: no gate before a Cloud or Cartesia conversation; only note read-aloud names its recipient
  (`apps/app/src/prototype/voice-adapter.ts:57-59`, comment at `:1512` "No status or privacy narration").
- Port: `canStart` requires `disclosedFor(c, route)` (`apps/app/spec/voice/conversation.md`, "Network voice
  listens only after its recipient was disclosed and the owner started it"). `disclose` is sent only from
  `ConversationControl.tsx:44`, which is unmounted (gap 1). The flag lives in the in-memory conversation
  Machine (`apps/app/src/voice/layer.vibe:29`), so it is lost at every process start.
- Impact: with a Cloud account (the default route when signed in) a wake word or power press is refused
  silently; once gap 1 is fixed, the sheet reappears after each restart. An owner would notice a new
  consent step that legacy did not have.
- Smallest fix: mount the control (gap 1); persist the two flags in the owner-keyed KeyValueStore; decide
  whether an invocation on an undisclosed route opens the sheet (`spec/voice/conversation.md`, same rule).

### 4. CHANGED: the embedding host record contradicts the port's packaging scripts

- Legacy: record and scripts agree on `libelizavoicejni.so` bound to the product's `ElizaVoiceNative`
  (`android/embedding-host/qualified-host.json:19,124`, `scripts/stage-embedding-host.ts:13`).
- Port: scripts were moved to upstream's bridge: `scripts/stage-embedding-host.ts:13` and
  `scripts/native-build-inputs.ts:91,127,132` require `libparadeevoicejni.so`, and
  `scripts/embedding-native-contract.ts:36-39` binds `ai/eliza/voice/VoiceNative`. The committed record still
  lists `libelizavoicejni.so` and `ai/alphacompute/alphaphone/ElizaVoiceNative`
  (`android/embedding-host/qualified-host.json:19,59,124`), and the new
  `android/app/src/main/java/ai/alphacompute/alphaphone/runtime/NativeRuntimeEmbeddings.java:28` still names
  `libelizavoicejni.so`. `stage-embedding-host.ts --verify` (Gradle `preBuild`, `android/app/product.gradle:93`)
  throws "Invalid qualified embedding library" for a row not in `names` (`stage-embedding-host.ts:117`).
- Open items mention only the agent payload layout, not these records.
- Impact: the Android build stops at preBuild until the record is regenerated; if it is regenerated, the
  runtime class looks for a library that is no longer packaged, so on-device embeddings fail.
  UNVERIFIED by a build (none allowed here).
- Smallest fix: regenerate `android/embedding-host/qualified-host.json` with `agent:build-embedding-host`,
  and rename the library in `NativeRuntimeEmbeddings.NATIVE_LIBRARIES`.

### 5. CHANGED: the engine pin of both host records was relabelled

- Legacy: `android/voice-host/qualified-voice-host.json:5` and `android/embedding-host/qualified-host.json:3`
  carry `forkPin 6337fd4c…`, the engine the recorded bytes were built from (commit c2bee84e0).
- Port: both say `5c5d6163…` with every library hash unchanged (changed in 4bd6bb175). The retained
  `test/host-speech-admission.test.mjs:44-45` asserts the opposite: `forkPin === 6337fd4c…` and
  "old library bytes are not relabeled as the current engine".
- Impact: provenance of the shipped speech engine is misstated; the SBOM and notices
  (`scripts/generate-licenses.ts`) read this record.
- Smallest fix: restore `6337fd4c…` in both records, or rebuild and record the new hashes.

### 6. MISSING: the #1453 voice fix (a spoken turn's own keypad, Contacts and Messages steps) is not in the port

- Legacy (2dcfd18ee, after the port's merge point): a voice turn carries the conversation to each held view
  step through the navigation hold, and a Messages draft step that opens its thread no longer tears voice
  down (`apps/app/src/prototype/voice-adapter.ts:191,460-480`; `test/browser/voice-direct-view-step.spec.ts`).
- Port: `apps/app/src/telephony/operations.vibe:133-136` runs the step after the reply but with a plain
  `navigation.open`, outside any claim. `navigation.open` clears `voice` (`apps/app/spec/shell/navigation.md:137`)
  and `apps/app/src/shell/integration.vibe:86` then calls `voice.stop()`. This is the exact failure #1453
  describes. The spec file is absent from the port and from `lists/voice.tests.txt`.
- Impact: "call Sam" or "text Sam" by voice ends the conversation; the reply is not spoken.
- Smallest fix: route telephony presentations through `AssistantHost.openView` (which uses
  `voice.followScreen`), and let `followScreen`'s `go` await the step's placement before pinning;
  state it in `spec/voice/conversation.md`, "Voice stays on through a screen change only when the agent
  claimed it…".

### 7. UNIMPLEMENTED: a message typed while voice runs is not sequenced behind voice

- Legacy: `test/browser/chat-voice-mode.spec.ts:82` ("a send while a voice reply is pending aborts that reply"),
  #1305.
- Port: rule and Machine exist (`spec/voice/conversation.md`, "A message typed while voice retires waits for
  the stop and goes out once, unless its chat changed"); `VoiceConversation.typedSend`
  (`apps/app/src/voice/conversation.vibe:620`) has no caller; `apps/app/src/assistant/composer.vibe` imports
  only `Latency` and `DictationTarget` from voice.
- Impact: a typed send goes out while voice still listens and may speak over it.
- Smallest fix: call `voice.typedSend(send, chatCurrent)` from the composer's send path (through a port the
  shell fills, since assistant precedes voice in the layer order).

### 8. UNIMPLEMENTED: sign-out, an account switch and reset do not retire voice or dictation

- Legacy: `test/voice-assistant.test.mjs:409`, `test/browser/chat-voice-mode.spec.ts:155`,
  `test/browser/dev-speech-account-switch.spec.ts`; `apps/app/src/prototype/local-speech-playback.ts:27-31`.
- Port: rule exists ("Stop, a call, a hidden or sensitive screen, sign-out and reset retire voice").
  `voice.left()` is called only for a private app or a locked screen (`apps/app/src/shell/assistantHost.vibe:95-102`).
  `apps/app/src/account/bindings.vibe:337` only re-keys the route. Dictation has no account or visibility
  hook at all (`apps/app/src/voice/dictation.vibe`).
- Impact: a conversation or a held recording survives sign-out and can deliver into the next account.
- Smallest fix: in `account/bindings.vibe` (or `shell/integration.vibe`) call `voice.left()` and
  `dictation.cancel()` when the identity changes or a reset begins.

### 9. CHANGED: Clef end-of-turn in Cloud is on, and every Cloud turn posts its words

- Legacy: `apps/app/src/runtime/voice-selection.ts:14-22` keeps `CLEF_ENDPOINT_ENABLED = false` ("the owner
  decides when it ships"); streamed Cloud and the open microphone ask no scorer at all
  (`apps/app/src/prototype/voice-adapter.ts:788,871`); `test/voice-turn-routes.test.mjs:217-219` asserts it.
- Port: `apps/app/src/voice/conversation.vibe:432-437` posts `{ kind: "turn", transcript }` to Cloud
  `/api/v1/decisions` whenever the route is Cloud; with the Cloud stream profile (short gap 0) upstream's
  session asks at every pause (`eliza-vs/packages/agent/src/voice/session.vibe:141-151`). The spec says so
  (`spec/voice/route.md`, "Network speech receives my audio, the words used to decide my turn has ended…").
  Neither `alpha-vs/cloud` nor `alpha-develop/cloud` has a `decisions` route.
- Impact: transcript text leaves the phone for endpointing where legacy sent none; PRD AP-06 asks for Clef,
  but the owner had not switched it on. Needs an owner decision.
- Smallest fix: gate `endpointerOf(route) === "ClefInCloud"` behind the owner's switch in
  `spec/voice/conversation.md` ("Clef in Cloud judges the end of a turn…") until it is admitted.

### 10. UNIMPLEMENTED and CHANGED: a reviewed voice request never settles, and voice no longer resumes after approval

- Legacy: `test/voice-assistant.test.mjs:487` ("a Notes review keeps input closed through exact approval and
  approved playback before one reopen"); `BatchVoiceConversation.resume` in `voice-adapter.ts:192`.
- Port: `reviewSettled` (`conversation.vibe:617`) has no caller, so the panel stays "Waiting for your review"
  until Stop. The model retires voice on settle, so the legacy resume is gone by design, not noted as an
  owner choice. On review the shell calls only `live?.stop()` (`conversation.vibe:473`) and never
  `endStream()`, although the spec says review ends the relay session ("A Cloud stream listens…").
- Impact: voice hangs after a call or text card; the Cloud relay session stays open (muted) meanwhile.
- Smallest fix: call `voice.reviewSettled()` from the assistant's approval settlement; end the stream in the
  `reviewNeeded` branch; record resume-after-approval as an owner decision.

### 11. MISSING: microphone Mute

- Legacy: Mute and Unmute microphone with `aria-pressed`, and the automatic "Microphone paused while Alpha
  responds" state (`apps/app/src/prototype/voice-adapter.ts:1044-1046`, `template.html:4215,4410,4512`;
  `test/browser/voice-assistant.production.spec.ts:89`, `test/voice-assistant.test.mjs:396,434,594,645`).
- Port: only the speaker's mute (`spec/voice/conversation.md`, "Mute changes only the output…";
  `ConversationPanel.tsx:46-57`). Upstream `eliza-vs/spec/agent/voice/session.md` has no mute either
  (`grep -i mute` is empty in `packages/agent/src/voice/session.vibe`).
- Impact: the owner cannot close the microphone without ending the conversation.
- Smallest fix: a `muteMicrophone` action in `spec/voice/conversation.md` and upstream's session, a button in
  `ConversationPanel.tsx`.

### 12. UNIMPLEMENTED: voice failures give no reason

- Legacy: coded messages for 401, 402, 403, 429 (with plan limit and reset time), upload and transcript
  failures, "No speech heard. Nothing was sent.", "Audio taken", "Voice session ended. Start again.", and
  "Allow mic in Settings" (`apps/app/src/runtime/cloud-voice.ts:21-58`, `voice-adapter.ts:764-775,1033-1036`;
  `test/cloud-voice-limit.test.mjs:36`, `test/voice-denied-recovery.test.mjs`).
- Port: `failureMessage` (`apps/app/src/voice/failure.vibe:94-121`) is called only from
  `test/voice/stories.test.vibe:119-120`. `sessionFailed` sets `notice: NoNotice`, so a failed conversation
  shows red bars named "Voice stopped" and nothing else (`ConversationPanel.tsx`, `VoiceActivity.tsx:30`).
  Dictation shows the fixed "Transcription failed. Your recording is kept." (`web/voice/messages.ts:58`).
  A refused microphone in a conversation offers no settings button. The allowance reset time
  (legacy `cloud-voice.ts:26`) is not in `failureMessage`.
- Impact: sign-in expired, plan limit and denied microphone all look the same.
- Smallest fix: keep the last `RefusalFacts` in the conversation and dictation services and render
  `failureMessage`/`microphoneMessage` in `ConversationPanel.tsx` and `DictationButton.tsx`; add the reset time.

### 13. UNIMPLEMENTED: the duplex ignores whether the capture really cancels echo

- Legacy: the session keeps its busy hold when the capture reports no echo cancellation
  (`voice-adapter.ts:831-833,872` `own.fullDuplex=opened.fullDuplex===true`;
  `test/voice-assistant.test.mjs:380`, `test/browser/voice-assistant.production.spec.ts:118`).
- Port: rule exists ("A reply can be interrupted only over an echo-cancelled live capture, and Alpha says so
  once a start when it cannot"). The shell feeds a constant, `const echoCancelled = route !== "Direct"`
  (`conversation.vibe:581`), and starts upstream's session `FullDuplex` whenever the route is live
  (`conversation.vibe:532`). The capture's own answer (`LiveCaptureStarted.echoCancelled`, `conversation.vibe:214`)
  reaches only upstream's transcript echo filter. Upstream uses it for the echo tail only
  (`eliza-vs/packages/agent/src/voice/session.vibe:73`).
- Impact: on a phone without a working canceller the reply's own sound, held 400 ms, can interrupt the reply;
  the "can't interrupt here" line never shows.
- Smallest fix: open the capture before choosing the duplex, or restart half-duplex when `opened` reports
  `echoCancelled: false`; feed that fact to `start`.

### 14. CHANGED: Stop during a pending reply aborts the agent's turn

- Legacy (#1305): `test/browser/chat-voice-mode.spec.ts:49` ("stopping voice releases capture and lets the
  accepted reply finish in chat"); only a send or a read-aloud aborts it.
- Port: Stop calls `session.stop()` (`conversation.vibe:551-557`); upstream aborts an awaited turn on stop and
  posts `/api/turns/{room}/abort` (`eliza-vs/packages/agent/src/voice/session.vibe:86-88,189-195`).
- Impact: Stop while Alpha is thinking loses the answer. Confidence medium: read from code, not run.
- Smallest fix: on the owner's Stop, detach the turn instead of aborting it (a `stopKeepsReply` profile field
  upstream), stated in `spec/voice/conversation.md`, "Stop, a call, a hidden or sensitive screen…".

### 15. UNIMPLEMENTED: the reply is not spoken while it is generated

- Legacy: confirmed direct frames are spoken sentence by sentence as they arrive
  (`voice-adapter.ts:746` `onText`; `test/voice-assistant.test.mjs:794,811`).
- Port: rules exist ("Streamed text is spoken early only from confirmed frames of a reply proven direct";
  `spec/voice/speech.md`, "Each finished sentence is spoken while the rest is generated…"). `speaksEarly` has
  no use in `src`; `answerOf` uses previews only for a latency mark and the cue
  (`conversation.vibe:354-358`) and speech starts after the Done frame (`conversation.vibe:480`).
- Impact: first audio waits for the whole reply.
- Smallest fix: feed confirmed previews to `speech.speakPieces` in `answerOf`, skipping spoken sentences at Done.

### 16. CHANGED: on-device reply sentences are no longer pipelined

- Legacy: each next sentence joins the playing utterance (`synthesizeLocal` with `append`), settled by
  `playbackSegmentStarted` (`apps/app/src/runtime/local-reply-speech.ts:7-40`; `test/local-reply-speech.test.mjs`).
- Port: `speech.vibe:198-231` synthesizes and plays each piece after the previous one ended; no `append`;
  `playbackSegmentStarted` is not an admitted event (`platform/native-plugins.ts:204`).
- Impact: an audible gap between sentences on the phone's own voice.
- Smallest fix: pass `append: true` for pieces after the first and listen for `playbackSegmentStarted`.

### 17. UNIMPLEMENTED: dictation in Messages and Phone bars

- Legacy: `test/browser/comms-dictation.spec.ts:56,69,80`, `test/browser/chat-dictation-api.spec.ts:141,166` (#1249).
- Port: `spec/voice/dictation.md` names "a person's message … a list filter" as targets, but
  `apps/app/src/web/telephony/CommsBar.tsx:96` disables the button unless `onDictate` is passed, and no
  parent passes it. `DictationControl` is mounted only in `web/assistant/ChatPanel.tsx:148`.
- Smallest fix: mount `DictationControl` with a comms `DictationTarget` in the Messages and Phone bars.

### 18. UNIMPLEMENTED: voice timing no longer reaches the diagnostics export

- Legacy: `apps/app/src/runtime/diagnostics-export.ts:28-29,61-62,120-123` (`alpha-voice-timing-v1`,
  `alpha-native-voice-timing-v3`); native `cloudVoiceTiming` (`AlphaVoiceCloudPlugin.java:59`).
- Port: `spec/voice/latency.md` says marks "are kept for the diagnostics export"; `Latency.entries()`
  (`apps/app/src/voice/latency.vibe:176`) has no consumer and `apps/app/src/settings/diagnostics.vibe` has no
  voice field. The port deleted `cloudVoiceTiming` from `AlphaVoiceCloudPlugin.java` while still collecting
  `cloudTimings` (port `AlphaVoiceCloudPlugin.java:56-61`).
- Smallest fix: add the entries to `settings/diagnostics.vibe`; restore the getter or drop the collector.

### 19. MISSING: the voice latency release gate

- Legacy: `scripts/native-voice-latency.ts`, `scripts/aggregate-voice-latency.ts`,
  `scripts/native-voice-latency-emulator.ts`; `test/native-voice-latency.test.mjs` (p50/p95 cold and warm, the
  six-second bound, cohorts, thermal state).
- Port: the three scripts are "removed" in `scripts/legacy-retirement.json:16919,17259,17266` with the note
  that the area spec owns the behaviour; `spec/voice/latency.md` has no budget rule; upstream has only the
  collector (`eliza-vs/packages/os/android/local-inference/.../VoiceLatencyTrials.java`). The test file is
  kept but imports a script that is gone.
- Smallest fix: restore the aggregator against the `VoiceTimingEntry` format, or record the retirement.

### 20. UNIMPLEMENTED: "the rest was not read" is never shown

- Legacy: `voice-adapter.ts:893` toast "Couldn't read the rest aloud. The full reply is above."
- Port: rule and `replyBroke` action exist; the shell never sends `replyBroke` (the event list of
  `conversation.vibe` has no such type). Stop speaking and a playback failure both reach upstream as `broke`
  (`conversation.vibe:423`), so the owner's interruption and a failure are not told apart.
- Smallest fix: send `replyBroke` in the speaker's `catch` when the error is `SpeechInterrupted` with `failed`.

### 21. UNIMPLEMENTED: nothing probes whether on-device speech is ready

- Legacy: "On-device speech is not ready", "Preparing on-device speech", `clearNetworkSpeechHold`
  (`voice-selection.ts:85`); `test/browser/native-speech.production.spec.ts` ("unavailable local speech offers keyboard…").
- Port: `VoiceRoute.probeOnDevice` (`route.vibe:115`) has no caller, so `onDevice` stays `true`: the privacy
  row can never say `RouteUnavailable` (`spec/voice/route.md`, last rule) and a network hold is never lifted
  when the phone cannot speak.
- Smallest fix: call it at voice layer start and before each start in `conversation.vibe` and `dictation.vibe`.

### 22. UNIMPLEMENTED: Cloud is never warmed

- Legacy: `apps/app/src/runtime/connection-ui.tsx:2392-2403` (`POST /api/cloud/warm` on foreground, chat
  opened, typing, Talk, new connection).
- Port: rule exists (`spec/voice/speech.md`, "A sent turn warms the phone's output, and Cloud is warmed at most
  once a minute…"); `Speech.warmCloud` (`speech.vibe:330`) has no caller. Legacy also skipped it offline and
  while a turn is in flight; the rule does not.
- Smallest fix: call it from `shell/integration.vibe` on return to front and from the dock on open.

### 23. MISSING: what Alpha heard is not shown

- Legacy: "Heard so far, not sent" interim text and the last voice message (`template.html:4207-4208`;
  `test/browser/live-voice.spec.ts`, `test/browser/voice-composer-recovery.spec.ts`), and 44 live level bars
  in a conversation (`voice-adapter.ts:1062`).
- Port: `onPartial` only stamps a latency mark (`conversation.vibe:506`); `ConversationPanel.tsx` shows five
  pulsing bars. `spec/voice/capture.md` "Levels are drawn only from the open capture" is implemented for
  dictation only.
- Smallest fix: an `interim` stream on `VoiceConversation` and a line in `ConversationPanel.tsx`.

### 24. UNIMPLEMENTED: the browser build has no voice

- Legacy: `apps/app/src/browser/voice.ts` (457 lines), `browser/agent-speech.ts`;
  `test/browser/cloud-tts-streaming.spec.ts`, `test/browser/voice-levels.spec.ts`.
- Port: `AlphaVoiceCloud` is `reach: "AnyNative"` (`platform/native-plugins.ts:192-193`) and there is no
  browser capture or player. The spec still describes a browser capture (`spec/voice/vad.md` intro,
  `spec/voice/capture.md` "A browser's message names its own site settings"). The `CloudReading` channel of
  `spec/voice/speech.md` has no speaker in `src`.
- Smallest fix: owner decision (the open-items doc lists other browser-build losses, not this one).

### 25. UNIMPLEMENTED: after an agent-opened screen keeps voice, the shell no longer knows voice runs

- Port: `assistantHost.vibe:106-111` opens the app (which clears `nav.voice`) and nothing sends `startVoice`
  again; `integration.vibe:86-87` stops voice only on a `voice` true-to-false edge. After a kept screen the
  owner's own navigation or Back therefore does not retire voice, against "Any navigation by the owner…
  retires voice as leaving does". UNVERIFIED at run time.
- Smallest fix: re-send `startVoice` after a kept `followScreen`, or key the stop on `VoiceConversation.changes`.

### 26. MISSING: the acknowledgement's echo window

- Legacy: speech starting while the cue plays, or 1.5 s after, is held; a cue never starts over the user
  (`voice-adapter.ts:807-858`, `CUE_TAIL_MS=1500`, `if(liveCapture?.speaking)return`).
- Port: `microphoneClear` is constantly true on a live route (`conversation.vibe:453`); upstream's echo
  filter compares only the reply, not the cue. Low impact today because cues never speak (KNOWN, below).

### 27. UNIMPLEMENTED: the microphone Machine is never told about the foreground or the permission

- `Microphone.foregroundChanged` and `permissionAnswered` (`apps/app/src/voice/capture.vibe:83-84`) have no
  caller; only `callChanged` has (`telephony/call-bar.vibe:111`). `deniedSettingsOffered` from the capture
  Machine is therefore never true; dictation gets by on its own failure code.
- Smallest fix: feed both from `shell/permissions.vibe` and the visibility loop in `shell/integration.vibe`.

### 28. UNIMPLEMENTED: dictation drops two effects and has no cancel while transcribing

- `perform` handles only `Insert` and `DiscardClip` (`dictation.vibe:108-114`); `DiscloseUpload` and
  `SayCallPaused` are dropped. A call closes the dictation, `targetId()` then answers `undefined`, so the
  "Voice paused for a phone call." line has no surface. `DictationButton.tsx:68` shows only a spinner while
  transcribing (legacy "Cancel transcription", `test/browser/chat-dictation-api.spec.ts:42`). Leaving the
  foreground does not cancel (`chat-dictation-api.spec.ts:49`).

### 29. UNIMPLEMENTED: refused starts say nothing, and an invocation start is under-admitted

- `speech.entry` answers `FinishOrDiscard` or `MediaNotStopped` and the start is dropped
  (`conversation.vibe:576-584`); legacy said "Finish or discard the Notes recording before starting a voice
  conversation." `integration.vibe:46-50` admits on `!nav.hidden && holds == 0` only (no owner, sensitive
  surface or reset check), passes `chatCurrent: () => true`, no `voiceUi`, and an empty `conversationId` when
  there is no conversation yet.

### 30. CHANGED: smaller differences an owner could notice

- A short call that starts and ends behind the call screen is not reported on return: `integration.vibe:56-67`
  reads the call at hide and at return, legacy read "since" (`runtime/voice-call-pause.ts:44-55`).
- A 12-digit run was refused as a likely card; the port needs 13 (`spoken-text.ts:10` vs legacy
  `runtime/local-speech-text.ts:1`).

### 31. MISSING (developer surface): development Cartesia realtime conversation and voice host scripts

- Legacy: `apps/app/src/runtime/development-cartesia-conversation.ts`, `scripts/start-local-voice-agent.ts`,
  `scripts/test-agent-speech-bridge.ts`, `scripts/test-agent-tts-bridge.ts`, `scripts/test-tts-startup.ts`;
  `test/development-cartesia-conversation.test.mjs` (35 cases), `test/local-agent-voice-bridge.test.mjs` (21).
- Port: none; not in the open-items list of unported developer pieces.

### 32. UNMODELED

- Text folding and the credential pattern live in `apps/app/src/voice/spoken-text.ts`; the model's
  `screenReply`, `screenReading`, `passageFits` and `firstBoundaryChars` are used nowhere in `src`.
- The refusal-code mapping (`failure.vibe:24-45`, HTTP code pattern, call and pause codes) has no rule.

### 33. UNVERIFIED

- Listener admission: legacy required the image's declared `sense` capability
  (`runtime/always-on-listener.ts:12-15`); the port uses "plugin registered and variant is aosp"
  (`listener.vibe:124`). I could not see what the port's AOSP image declares.
- A voice 429 becoming the account's shared limit (`test/cloud-voice-limit.test.mjs:58`): the port passes
  limits from account to voice only (`account/bindings.vibe:346`); I did not trace upstream's route for the
  reverse.
- A reading or reply that keeps playing after the page hides: the renderer has no stop on hide for the
  Reading channel; upstream's bridge may stop it natively (`LocalSpeechBridgePlugin.java:289`), not traced.

### Vibestack usage

- No `*.proof.dfy` anywhere under `apps/app/spec`. Legacy had `specs/lemma/apps/app/src/runtime/cloud-voice-limit.dfy`
  and `voice-states.dfy`; `boundedWaitSeconds` in `spec/voice/route.md` is the same property with no proof.
- No conformance driver for any voice Machine (`apps/app/test/drivers/` has ten files, none `voice__*`).
  The tests in `apps/app/test/voice/*.test.vibe` are hand-written story tests over a fake Native.
- Shell re-implements model decisions: local `keyOf` in `route.vibe:76-82` (model `keyOf` unused), local
  `spokenLineOf` in `spoken-text.ts`, hard-coded phone-only engines in `reading.vibe`/`voicemail.vibe`
  (`engineFor` unused), `duplexOf` unused (gap 13). Decorative laws with no shell use: `speaksEarly`,
  `onTheRelay`, `endsTheRelay`, `limitTellsAWait`, `replyMayStart`.
- Rules whose Quint has no `always`/`step`/`law`/`sometimes`: three behavioural ones
  (`conversation.md` "What the conversation shows follows the session…", "A reply that stops partway…";
  `listener.md` "A status read is shown only when no action runs…"; `dictation.md` "A dictation opens for one
  draft…") plus the nine Domain rules.
- No `.meta.tsx` for `ConversationControl`, `DictationControl`, `VoiceIndicator` (runtime-bound wrappers).
- All 107 surviving legacy voice tests are byte-identical in `alpha-vs/test/**` and target deleted modules,
  so they cannot run. `lists/voice.tests.txt` names three files that exist in neither tree
  (`test/browser/voice-entry-context.spec.ts`, `voice-route-preference.spec.ts`, `voice-save-ownership.spec.ts`).

### KNOWN (already in `docs/vibestack-open-items.md`)

| Item | Bullet |
| --- | --- |
| Cues are wired but never speak: `StatusFrame` has no label | Upstream, agent/client |
| Longest cue line 120, legacy 160 (`local-agent-stream.ts`, `label.length > 160`) | Owner decisions |
| `spokenCue.replyReady()` does nothing when no cue was said | Assistant |
| Strict DoneFrame refuses `awaitingReview`, so the voice review stop cannot trigger on the stream | Upstream, agent/client |
| "The email action failed" line unreachable: `VoiceReplyAction` has no failure flag | Upstream, agent/voice |
| Relay listener registered after one `yieldNow` | Voice |
| No capability header on `Resident.stream` in `conversation.vibe` | Voice |
| No native conformance driver for `voice__keyboard` | Android / native |
| Generated names of `voice__acknowledgement` and `voice__latency` unchecked | Unverified, generated names |
| `legacy-retirement.json` still marks `test/batch-voice-progress-ack.test.mjs` "mapped" | Tooling |
| Android still carries `PairedSpeechContract` and the paired branch of `AlphaVoiceCloudPlugin` (`connectPaired`, now unreachable) | After merging develop through #1449 |

### RETIRED

- Paired-agent voice (`pairedVoiceStatus`, `synthesizePaired`, `transcribePairedRecording`): deliberate.
  Alpha #1422 (057fdc5a2) deleted `apps/app/src/runtime/paired-voice.ts`; the port removed the four plugin
  methods from `AlphaVoiceCloudPlugin.java`; open-items lists it under Owner decisions.
- The voice route preference: `test/browser/voice-route-preference.spec.ts` is gone from develop;
  `spec/voice/route.md` says the route is "never by a setting". (`voicePreferenceKeys` survives in legacy
  `voice-selection.ts:9-13` only for test-mocks builds.)
- `test/batch-voice-progress-ack.test.mjs`: deleted in the port, replaced by `spec/voice/acknowledgement.md`
  and `apps/app/test/voice/acknowledgement.test.vibe`.

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Route order: Cartesia key, usable Cloud account, phone; own keys without Cartesia stay on the phone | `apps/app/src/runtime/voice-selection.ts:92-104` | `spec/voice/route.md` "A Cloud account speaks under its credential…" | `src/voice/route.vibe:76-88` |
| Network failure before audio falls back once; holds of 1 min, 10 min, server wait up to 1 h | `voice-selection.ts:46-80` | `route.md` intro; `eliza-vs/spec/localInference/speechRoute.md:89,153` | `route.vibe:90-101` (`speakOnRoute`; upstream code not read) |
| 429 facts bounded: wait 1 s to 86,400 s, reset within 400 days, short lower-case code | `runtime/cloud-voice-limit.ts`, `test/cloud-voice-limit.test.mjs:73` | `route.md` "A Cloud refusal's limit…" | `src/voice/failure.vibe:24-45` |
| Dictation inserts once, on a new line, never sends; clip 29 s on the phone, 59 s over the network | `voice-adapter.ts:73,359,420`; `test/browser/chat-dictation-api.spec.ts` | `spec/voice/dictation.md` "The words are inserted once…", "Stop keeps the clip…" | `src/voice/dictation.vibe:106-116,198-206` |
| Failed network transcription finishes on the phone when the clip fits; clip kept otherwise | `voice-adapter.ts:420` | `dictation.md` "A network failure that falls back…" | `dictation.vibe:153-183` |
| Dictation refused while Alpha's speech is stopping or latched | `voice-adapter.ts` "Finish or discard…" | `dictation.md` "Recording starts only on a free microphone…" | `dictation.vibe:66-71,191-199` |
| Acknowledgement (#1450): 300 ms hold, dropped when the reply is ready first, audible cue finishes within 2.5 s, thinking line only, once a turn, recorded clip must be closed | `runtime/local-agent-stream.ts:65-130` (009960a3c) | `spec/voice/acknowledgement.md` (all six rules); `spec/assistant/reply.md:121-129` | `src/voice/acknowledgement.vibe`, `src/assistant/cue.vibe`, `conversation.vibe:451-478`; `test/voice/acknowledgement.test.vibe` (10 cases) |
| Open microphone: 256 ms hangover, turn sent at first pause, 400 ms hold interrupts; Cloud stream 400 ms after final | `voice-adapter.ts:66-73` | `spec/voice/conversation.md` "An open microphone ends a turn at the first pause…" | `conversation.vibe:201,528-532` |
| Echo of the reply is never a turn (2+ words, 70 % overlap, 1.5 s tail) | `test/voice-assistant.test.mjs:361` | `eliza-vs/spec/agent/voice/session.md:227` | `eliza-vs/packages/agent/src/voice/echo-filter.ts`, `session.vibe:60-74` |
| Busy Cloud retried quietly at most twice; wait over 30 s pauses; own keys shown | `specs/quint/application/QuietVoiceRetry.qnt` | `conversation.md` "A busy Cloud is retried quietly…" | `conversation.vibe:178-186` |
| Call refuses a start with one line; a call retires voice; hidden page tells of a call on return | `runtime/voice-call-pause.ts` (#1386) | `conversation.md` "Voice starts only from the owner…", "Voice closed by hiding the page…" | `conversation.vibe:164-177,577-580,607-616`; `telephony/call-bar.vibe:111-112`; `shell/integration.vibe:56-67` |
| A reply needing review stops voice with the microphone off; nothing is spoken | `specs/quint/application/VoiceTurnReview.qnt`; `test/voice-assistant.test.mjs:470` | `conversation.md` "A reply that needs review stops voice…" | `conversation.vibe:469-476` (blocked upstream, see KNOWN) |
| Unconfirmed media stop keeps voice closed until restart | `specs/quint/application/VoiceSurfaceRetirement.qnt` | `conversation.md` `cleanupSettled`, `alwaysUnconfirmedMediaKeepsVoiceClosed` | `conversation.vibe:540-567` |
| One passage per channel; unconfirmed stop latches; app speech gets one recovery stop | `specs/quint/native/SpeechCleanupLatch.qnt`; `apps/app/src/local-speech-playback.ts` | `spec/voice/speech.md` first two rules | `src/voice/speech.vibe:126-145` |
| Reply and reading screening: secrets refused, links and odd characters refused for readings, 16,000 characters, pieces of at most 300 with a first boundary at 20 | `runtime/local-speech-text.ts` | `speech.md` "A spoken reply refuses only…", "A reading also refuses…" | `src/voice/spoken-text.ts:10-125` (same expressions, bar the digit run) |
| Concise spoken action lines (#1379) | 5c3ead539; `test/local-speech-text.test.mjs` | `speech.md` "An email draft is said as one line…" | `spoken-text.ts:128-179`, `conversation.vibe:480` |
| Reviewed page and voicemail use only the phone | `runtime/native-reading-voice.ts`, `runtime/voicemail-transcription.ts` | `speech.md` "A reviewed page, a local reading and voicemail audio use only the phone…" | `src/voice/reading.vibe`, `src/voice/voicemail.vibe`, `speech.vibe:257-300` |
| Speaker mute only where the phone can; ends with the conversation (#1305) | 78d3cbf3e | `conversation.md` "Mute changes only the output…" | `conversation.vibe:583,604-606`, `speech.vibe:335-340` |
| Stop reports nothing as heard; barge-in reports the played prefix | `test/voice-turn-routes.test.mjs` | `conversation.md` `lawStopNeverReportsWhatWasHeard`; `eliza-vs/spec/agent/voice/session.md:308,348` | `conversation.vibe:488-491,531` |
| Listener on the AOSP image: status, Pause, Turn off, never turn on; stale reads dropped; invocation once, bound to the verified session; blocked power press discarded | `runtime/always-on-listener.ts`, `ui/voice/sense-invocation.ts`; `specs/quint/application/SettingsListenerReads.qnt`, `native/WakeListenerStop.qnt` | `spec/voice/listener.md` (rules 3 to 8) | `src/voice/listener.vibe:132-205`, `src/settings/privacy.vibe` |
| VAD energy gate: 250 ms grace, 180 ms speech, 650 ms silence, 12 s cap, 0.003 RMS, 0.012 peak, echo gate | `apps/app/src/ui/voice/voice-activity.ts:29-41,82` | `spec/voice/vad.md` first three rules | `src/voice/vad.vibe`, `conversation.vibe:319` |
| Packaging scripts for on-device voice kept and re-pathed to upstream os (`android-stage-voice-models.ts`, `voice-host.ts --verify` at preBuild, `paradee-runtime.ts --app-linkage`, `build-pinned-voice.ts`); `android/sense/**`, `android/paradee-voice/**`, keyboard dictation Java identical | `scripts/*.ts`, `android/app/product.gradle:101-105` | README "native voice and embedding libraries" (same text both sides); `spec/voice/keyboard.md` | `alpha-vs/scripts/*.ts`, `android/app/product.gradle:104-108` (records: see gaps 4 and 5) |

## Not covered

- Notes voice recorder and voice-note read-aloud, transcript and deletion (`AlphaNoteAudioPlugin`, the Notes
  parts of `voice-adapter.ts:1380-1500`, `PermanentVoiceDeletion*.qnt`, `test/browser/voice-preparation-ownership.spec.ts`,
  `cloud-notes-voice-fixture.ts`): notes slice.
- Workflow speech and pickup (`test/browser/dev-workflow-speech.spec.ts`, `dev-workflow-automatic-speech.spec.ts`,
  `apps/app/src/browser/workflow-speech.ts`, `specs/quint/services/WorkflowWakeups.qnt`) against
  `src/workflows/operations.vibe:76`.
- Maps guidance speech (`apps/app/src/maps/navigation-voice.ts` against `src/voice/guidance.vibe`, `src/maps/voice.vibe`).
- Soft-keyboard models `KeyboardDetectors.qnt`, `KeyboardFocus.qnt`, `KeyboardGeometry.qnt` and their tests
  (composer geometry; likely shell or assistant).
- Upstream native code behind the specs I only read at heading level: `eliza-vs/spec/os/voice/{listener,indicatorLease,invocation,speechOutput,cloudSpeech,liveCapture,microphone}.md`
  against legacy `NativeListener*.qnt`, `ListenerLease*.qnt`, `AlwaysOnListenerIndicatorReadback.qnt`,
  `NativeAsrPipe.qnt`, `NativeSpeechGate.qnt`, `NativeSpeechOutputPreparation.qnt`, `NativeSpeechWarmup.qnt`,
  `SpeechResources.qnt`, `VoiceIpcAssembly.qnt`, `RendererSpeechChunk.qnt`; and
  `@elizaos/plugin-local-inference/speech-route` and `createCloudStreamingSpeech` implementations
  (relay renewals, `test/cloud-speech-stream.test.mjs`).
- `VoiceTranscriptFollow.qnt` (accepted voice follows new history only while following) against the
  assistant's transcript.
- Native Java tests in `android/app/src/androidTest/**` (identical files; whether they still compile against
  the port's plugins was not checked).
- AOSP listener staging: `scripts/aosp-listener*.ts`, `aosp-sense-*.ts`, `verify-aosp-listener.ts` against
  `scripts/os-ported/os/sense-listener.mjs` and `@elizaos/os/image`.
- `scripts/voice-host.ts`, `paradee-runtime.ts`, `build-embedding-host.ts`, `embedding-native-contract.ts`
  beyond their diffs; `android/upstream-native-sources.json` (deleted in the port); `android/consumer-host.json`.
- Legacy renderer latency records `alpha-voice-timing-v1` (entry source, review policy, cold and warm) against
  `spec/voice/latency.md` field by field.
- Developer speech settings (`scripts/dev-cartesia.ts`, `dev-speech-settings.ts`, `speech-env.ts`: files identical; consumers not traced).
- Copy: only the strings quoted above were compared.

## Acknowledgement wire after the repin (from the #1458 author, 2026-11-23)
On the repinned wire (vibestack-dp ≥ 1ff497fc4f0), simplify the no-frame tool-text fallback away. It is not a supported path: the agent always clears streamed text before tools and ships in the same release. When simplifying, keep these invariants:
1. One acknowledgement per turn, and it comes only from the `acknowledgment {text}` frame.
2. The frame stays the working label until text or the reply arrives. A tool label or status must not overwrite it.
3. Voice speaks the frame at once. A cue that is not yet audible is dropped only by `reply_ready` or by the end of the turn, never by the first streamed text.
4. No 300 ms hold.
Run apps/app/test/assistant/journeys.test.vibe and test/voice/acknowledgement.test.vibe. Report each result separately for: (a) the frame is taken once, kept out of the answer and shown as the working label; (b) the old no-frame fallback case (update or remove it to match the simplification, and say which); (c) no second acknowledgement whether the frame or the fallback comes first.
