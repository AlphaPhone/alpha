# Chunk specs-22: specs/quint/native (NavigationProgress … SpeechResources, README)

| File | Kind | Verdict | Target |
|---|---|---|---|
| `specs/quint/native/NavigationProgress.qnt` | Quint model, esbuild import harness | KEEP | trim manifest Java sources; drop prepared-input re-hash |
| `specs/quint/native/PhoneCalls.qnt` | Quint model, esbuild import harness | KEEP | drop write-only `ownerPlaced` |
| `specs/quint/native/README.md` | model documentation | SIMPLIFY | ~150 lines; delete dated proof sweeps, commit narratives, stale counts |
| `specs/quint/native/RendererBackgroundRebuild.qnt` | Quint model, Java replay | KEEP | owner question: merge with `RendererRecovery` |
| `specs/quint/native/RendererRecovery.qnt` | Quint model, 3 Java ties | KEEP | drop RendererRecovery half of `recovery-vad-conformance.mjs` + its test |
| `specs/quint/native/RendererSpeechChunk.qnt` | Quint model, text-eval harness | KEEP; PORT harness | esbuild-import `playOwnedSpeech` with port modules |
| `specs/quint/native/ResetRecovery.qnt` | Quint model (composed) | KEEP; PORT harness | port stubs into files instead of scraping `test/reset-startup.test.mjs` |
| `specs/quint/native/ResidentRuntime.qnt` | Quint model (composed) | KEEP | delete dead `profile`/`chooseProfile`/`history` (+ composition action) |
| `specs/quint/native/ResidentScheduling.qnt` | Quint model, finite helper replay | MERGE | into `ResidentSchedulingServiceAdmission.qnt`, renamed `ResidentScheduling.qnt` |
| `specs/quint/native/ResidentSchedulingServiceAdmission.qnt` | Quint model ("audit twin"), seam-rewrite harness | KEEP (canonical); PORT harness | observe `Decision` via return value/log port; compile product Java unmodified |
| `specs/quint/native/ResidentStartCancel.qnt` | Quint model, Java replay | KEEP | stub rewrites → port hooks; file pins |
| `specs/quint/native/ReviewedCopies.qnt` | Quint model, Java replay | KEEP | — |
| `specs/quint/native/RuntimeUpdatePause.qnt` | Quint model (composed), text-slice harness | KEEP; PORT harness | compile `UpdatePause` directly after U-A1 split |
| `specs/quint/native/SavedSignInRecovery.qnt` | already deleted (working tree) | DELETE (done) | — |
| `specs/quint/native/SharedRecordingAdmission.qnt` | Quint model of patched upstream Java | KEEP | path-scope to pin/patch changes |
| `specs/quint/native/SpeechCleanupLatch.qnt` | Quint model, text-slice harness | KEEP; PORT harness | esbuild-import `speakAppText`/`speakCloudText` |
| `specs/quint/native/SpeechResources.qnt` | Quint model of upstream Java helpers | KEEP | drop constant `engineReady`; trim renderer source pin |

All 15 remaining models are live (listed in `native/manifest.json`, checked by `scripts/check-quint.ts`; every
`.qnt` must be in the manifest, `scripts/quint-lib.ts:249`) and every listed product source still exists after the
Stage A deletions. None models a DECISIONS-deleted feature. Apparent "legacy" items are not legacy readers:
`ResetRecovery.loadLegacy` models upstream `DataReset.failureState` handling of a pending marker with a missing or
two-field budget, and `SpeechResources.legacyPlatform` models API < 31 (app minSdk 29).

## Coverage lost if the DELETEs happen
None. `SavedSignInRecovery` is already gone with its product code. The `ResidentScheduling` merge keeps every
scenario and canary (the surviving model contains them verbatim with stronger confirmed-stop semantics) and a stronger
harness (`resident-scheduling-service-admission.mjs` runs the full 120-case decision table on unmodified Java). Dropping
the RendererRecovery half of `recovery-vad-conformance.mjs` loses nothing that `FinitePolicyTraces` does not already
replay through `RendererRecoveryBudget.onLoss`.

## Shared helpers worth keeping
- The esbuild "bundle the real module, alias platform imports to ports" pattern in `refinement/native/telephony.mjs:12-21`
  and `navigation-progress.mjs:28-55`: make it one helper (`refinement/support.mjs#bundleModules(entries, aliases)`)
  and use it for the three TypeScript ports below.
- `refinement/native/java.mjs` (`javaTraces`, `javaTraceCampaign`), `itf-replay.mjs` (`modelTraces`, `replayJava`),
  `resident-platform.mjs`, `main-activity-platform.mjs`: the compile-real-Java-with-ports harnesses; keep.
- `currentNativeSource` / `nativePatchInputs` currently live in `shared-recording.mjs` with an import-time
  `preparePatchedNative()`; move to a side-effect-free module.
- Retire one of the two type-strippers (`test/fixtures/ts-source.mjs`, `test/support/strip-types.mjs`); both are only
  needed by the text-eval harnesses that are being ported.

## Cross-file actions
1. PORT `refinement/native/renderer-speech-chunk.mjs` and `speech-cleanup-latch.mjs` to esbuild imports of
   `local-speech-playback.ts`, `runtime/app-speech.ts`, `runtime/cloud-voice.ts`; then replace manifest `symbols`
   for `RendererSpeechChunk` (7) and `SpeechCleanupLatch` (14) with file pins. Must land before Stage F moves
   `local-speech-playback.ts` (cross-file-actions §1 line 819).
2. PORT `runtime-update-pause.mjs` (and per cross-file-actions U-A1 `update-barrier.mjs`) together with the
   `AlphaDevicePlugin` → `update/` split; `hex`/`appSigner` move to `AlphaUtil` first.
3. Move the 18 Android port stubs out of `test/reset-startup.test.mjs` into
   `specs/quint/refinement/native/reset-ports/`; repoint `reset-orchestration.mjs`. Do this before the host-test
   review deletes or rewrites `reset-startup.test.mjs`.
4. Merge `ResidentScheduling` into `ResidentSchedulingServiceAdmission` (rename to `ResidentScheduling`), update
   `native/manifest.json`, `FinitePolicyTraces.java` / `index.mjs:97-109` model list, the SSA harness compile list,
   and README.
5. Remove `ResidentRuntime.profile`/`chooseProfile`/`history` and `ApplicationComposition.chooseResidentProfile`
   (`ApplicationComposition.qnt:71,471-476`).
6. Delete per-model wrappers `test/quint-renderer-background-rebuild.test.mjs`, `quint-renderer-speech-chunk.test.mjs`,
   `quint-resident-start-cancel.test.mjs`, `quint-speech-cleanup-latch.test.mjs` (the native aggregate already runs
   `forward-replays.mjs`), and relax exact counts in `forward-replays.mjs:42-44` to `> 0`.
7. Drop the `RendererRecovery` part of `specs/quint/native/recovery-vad-conformance.mjs` and
   `test/quint-recovery-vad-conformance.test.mjs` (keep VAD if not covered by `FinitePolicyTraces`, which it is).
8. CI path matrix: `SharedRecordingAdmission`, `SpeechResources` (and other upstream-only native models) run only on
   `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**` or harness changes.
9. Rewrite `native/README.md` (see its report); delete `specs/quint/ui-return-review-20261109.md` reference to
   `ResidentRuntime` with that file.

## Owner questions
- Merge `RendererBackgroundRebuild` and `RendererRecovery` into one renderer-recovery model (both model the shared
  budget, shared renderer deaths and the assistant surface), or keep two models with the overlap removed from one?
- Should models whose sources are only patched upstream Java (`SharedRecordingAdmission`, `SpeechResources`) move
  upstream with the code (D14 follow-up), or stay here path-scoped to pin/patch changes?
- Keep the harness mutation modes in `resident-scheduling-service-admission.mjs` (`ignore-lifecycle`, `lose-refusal`),
  which test the harness rather than the product?
