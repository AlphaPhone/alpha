# Chunk specs-23: `specs/quint/native` (StreamingPlayback … WorkflowNoticeDelivery, conformance.mjs)

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `specs/quint/native/StreamingPlayback.qnt` | Quint model, upstream-only sources | KEEP | Upstream-pin lane only; replayed by `PlaybackTraces.java` (real class, javac) |
| `specs/quint/native/TelephonyAttention.qnt` | Quint model | KEEP | Trim manifest `sources` to `telephony-presenters.ts`; esbuild import harness `telephony.mjs` is already the right style |
| `specs/quint/native/VadSegmentation.qnt` | Quint model, upstream-only | KEEP | Upstream-pin lane; keep only the `FinitePolicyTraces` replay, drop the VAD path of `recovery-vad-conformance.mjs` |
| `specs/quint/native/VideoEditReview.qnt` | Quint model | KEEP | Delete manifest `symbols`; one import-based replay; delete string-rewrite mutation cases in `test/quint-video-edit-review.test.mjs` |
| `specs/quint/native/VideoRecorder.qnt` | Quint model | KEEP | Delete `symbols`, drop `camera-adapter.ts` from sources (not executed); one replay; delete mutation cases |
| `specs/quint/native/VoiceIpcAssembly.qnt` | Quint model | KEEP | Drop Alpha Java from `sources` (never executed); becomes upstream-only lane |
| `specs/quint/native/VoiceSession.qnt` | Quint model, composition component | KEEP | Reduce `sources` to imported entry modules; harness `renderer.mjs` is import-based |
| `specs/quint/native/Voicemail.qnt` | Quint model | KEEP | Reduce `sources` to `voicemail-state.ts`; owner question on invariant strength |
| `specs/quint/native/WorkflowNoticeDelivery.qnt` | Quint model | KEEP + PORT harness | `workflow-notice-platform.mjs` slices Java by literal anchors; compile real `AlphaNotificationsPlugin` + upstream host plugin with Capacitor stubs instead |
| `specs/quint/native/conformance.mjs` | Refinement harness (misplaced) | MERGE | Move/trim to `specs/quint/refinement/native/always-on-listener-indicator.mjs` + `IndicatorReadbackTraces.java`; drop side assertions, Maps asserts, script mode, and `test/quint-native-conformance.test.mjs` |

No model in this chunk models deleted code (DECISIONS D1–D5, D20): all product sources exist and none is a
legacy reader, Wallet, backup, client Calendar sync or hosted pairing path. All nine models stay live (D11).

## Behaviours that would lose coverage
None if the proposals are followed. Every removal here is a duplicate:
- Hand-written Java checks in `conformance.mjs` (ResetAuthorization, SpeechAudioFocusPolicy, IndicatorLease,
  CrashLoopBreaker, ResidentScheduleRearm) are covered by model-driven `ComponentTraces.java` /
  `FinitePolicyTraces.java`. One check to carry over first: "a granted request is abandoned after a loss, never
  twice; a denied request is never abandoned" (`focus.released()`). `ComponentTraces.java` does **not** call
  `released()` (it calls only `granted(true)` and reads `state`), so conformance.mjs:170-172 is the only coverage of
  that rule. Carry those three checks into the SpeechResources trace group before deleting them.
- Maps `usableNavigationFix` / `atStep` boundary asserts (conformance.mjs:235-253) are upstream unit checks. If the
  `NavigationProgress` campaign does not reach the 30 m / 30 s / -5 s skew boundaries, that coverage moves upstream.
- VAD replay in `recovery-vad-conformance.mjs` is strictly weaker than `FinitePolicyTraces`.
- String-rewrite mutation cases in the video tests check only that the replay can fail (T5).

## Shared helpers worth keeping
- `refinement/native/telephony.mjs` `capture()` and `refinement/native/renderer.mjs` `captureRendererImplementation()`
  are two copies of the same "esbuild bundle + hash metafile inputs + data-URL import" loader; with
  `application/notes-files-media-itf.mjs` `loadProductModule()` that is three (C3/C5). Keep one
  (`loadProductModule` with optional `stubs`) in `refinement/support/`.
- `refinement/native/java.mjs` (JDK discovery, `javaTraces`) should replace the private `run()` in `conformance.mjs`
  and `recovery-vad-conformance.mjs`.

## Cross-file actions
1. Native manifest: delete `symbols` on VideoRecorder/VideoEditReview; trim `sources` on TelephonyAttention, VoiceSession,
   Voicemail, VideoRecorder, VoiceIpcAssembly to what the harness actually loads (better: derive changed-model
   selection from the harness receipt input graph and drop hand-listed sources).
2. Tag StreamingPlayback, VadSegmentation, VoiceIpcAssembly (and AlwaysOnListenerIndicatorReadback) as
   upstream-only; CI runs them only on `upstream.lock.json` / `android/upstream-native-sources.json` changes.
3. Keep one replay per model: per-model wrappers vs `refinement/native/index.mjs` / `forward-replays.mjs`
   aggregate (VideoRecorder, VideoEditReview, WorkflowNoticeDelivery, AlwaysOnListenerIndicatorReadback run twice).
4. Delete `test/quint-native-conformance.test.mjs`; delete the VAD half of `specs/quint/native/recovery-vad-conformance.mjs`
   and its test (RendererRecovery half: see that file's reviewer; it is also covered by `FinitePolicyTraces`).
5. Port `refinement/native/workflow-notice-platform.mjs` from text slicing to compiling real classes with stubs;
   drop exact `traces === 14` / `checkpoints === 204` in `test/quint-workflow-notice-delivery-refinement.test.mjs`.
6. `ControllerComposition` (imports VoiceSession + CalendarLinkedSync): confirm `refinement/composition/controllers.mjs`
   does not drive renderer Calendar linked-sync modules deleted under D4.
7. `specs/quint/native/README.md:125,132` must follow the conformance.mjs move.

## Owner questions
- Move the upstream-only models (StreamingPlayback, VadSegmentation, VoiceIpcAssembly, AlwaysOnListenerIndicatorReadback) and their Java harnesses into `vendor/eliza` upstream (D14 follow-up), or keep them here in an upstream-pin-only lane?
- VideoRecorder's `LeaveFinalisesBeforePreviewStop` describes `camera-adapter.ts`, which no harness executes. Add an adapter seam and replay it, or record it as a model-only contract?
- Voicemail `CloudOnlyWhenChosen` does not state "no cloud upload while the setting is local". Strengthen the invariant with a ghost flag?
- WorkflowNoticeDelivery manifest text says "legacy ownerless mode", but no legacy Java path exists. It means "no owner selected yet". OK to reword?
