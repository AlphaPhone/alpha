# Chunk specs-21: `specs/quint/native` models (MMS … VoiceDraft)

22 Quint models, 3,446 lines. Every one is live: listed in `specs/quint/native/manifest.json`, checked by
`scripts/check-quint.ts`, refined by a harness under `specs/quint/refinement/native/` that is run by a
per-model `test/quint-*.test.mjs` wrapper **and** by the family aggregate `refinement/native/index.mjs`
(`test/quint-native-refinement.test.mjs`); `NativeStreamBridge` is the exception (wrapper + `forward-replays.mjs`).
Every manifest source still exists. No model covers a deleted feature, so there are no DELETEs.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| NativeMmsDispatch.qnt | model; harness compiles Alpha Java + upstream members spliced by text | KEEP | Harness: drop historical `b1817660` probe (legacy import) |
| NativeNavigationOwnership.qnt | model; harness compiles whole product classes | KEEP | Target shape already |
| NativeNotePermission.qnt | model; whole-class compile | KEEP | Harness: use `current-sources.mjs` |
| NativeNoteRecording.qnt | model; whole-class compile | KEEP | Drop or rename `legacyRestart` / `legacyAudioRetainsNoOwnerTest` (A1, model-only) |
| NativeNoteRecordingService.qnt | model; whole-class compile | KEEP | Rename `discardedRecordingAcceptsLegacyStopTest` → `…BlankStopTest` (blank stop is current) |
| NativeOnDeviceRecognizer.qnt | upstream-only model | KEEP | Gate on upstream pin |
| NativePipedCapture.qnt | upstream-only model | KEEP | Gate on upstream pin |
| NativeRecognizerAvailability.qnt | upstream-only model | KEEP | Gate on upstream pin |
| NativeReminderDelivery.qnt | model; Alpha + upstream reminder engine | KEEP | Drop `seedLegacy`/`legacy` (never driven by harness); harness uses `java.mjs` |
| NativeRequestWithdrawal.qnt | model; renderer imported (esbuild), Java sliced | KEEP / PORT | Extract `LocalAgentRequests` from `AlphaLocalAgentPlugin`; stop regex-parsing the `.qnt` |
| NativeSettingsHandoff.qnt | model; `AlphaDevicePlugin` + `PluginCall` sliced | KEEP / PORT | Extract `SystemSettingsHandoff` |
| NativeSmsDispatch.qnt | model; Alpha Java + upstream spliced | KEEP | Drop historical probe |
| NativeSourceRenewal.qnt | model; `AlphaHostedResultsPlugin` sliced in 5 places | KEEP / PORT | Move bridge logic into `SourceRenewalNotices` |
| NativeSpeechGate.qnt | upstream-only model (always-on, D7) | KEEP | Gate on upstream pin |
| NativeSpeechOutputPreparation.qnt | upstream-only model | KEEP | Trim manifest `sources` |
| NativeSpeechWarmup.qnt | upstream-only model | KEEP | Trim manifest `sources` |
| NativeStreamBridge.qnt | model; harness imports real module | KEEP | Delete duplicate wrapper test; drop manifest `symbols` |
| NativeTextScaleLifecycle.qnt | model; `AlphaDevicePlugin` + `PluginCall` sliced | KEEP / PORT | Extract `TextScale` |
| NativeUpdateActivation.qnt | model; `AlphaDevicePlugin` sliced at marker comment | KEEP / PORT | Extract `AlphaUpdater`; delete marker comment |
| NativeUpdateComposition.qnt | composition model | KEEP | Follows `AlphaUpdater` port |
| NativeUpdateStaging.qnt | model; `settings-adapter.ts` transplanted into `vm`, Java sliced | KEEP / PORT | Export update module, load with `loadBrowserModule`; `AlphaUpdater` |
| NativeVoiceDraft.qnt | upstream-only model | KEEP | Harness: use `current-sources.mjs` |

## Behaviours that would lose coverage

None: no model in this chunk is deleted. The only proposed removals are two model-only legacy actions
(`NativeNoteRecording.legacyRestart`, `NativeReminderDelivery.seedLegacy`) that no harness scenario drives.
Removing them loses formal coverage only of the ownerless-journal recovery and the upstream `legacyAlarm`
row. A fresh package cannot produce either, unless a current start can be ownerless (owner question 1).

## Harness ports (T10), ordered by how soon a planned refactor breaks them

1. `update-barrier.mjs` `exactUpdateMembers`: slices `AlphaDevicePlugin.java` between ` static final long UPDATE_MAX_BYTES=`
   and the product marker comment ` // End of updater methods for host replay.`, and regex-extracts `handOff`/`shareForeground`.
   Four consumers: `update-barrier.mjs`, `update-composition.mjs`, `update-staging.mjs`, `test/app-update.test.mjs`.
   Port to an extracted `AlphaUpdater.java` in the AlphaDevicePlugin split.
2. `settings-handoff-platform.mjs` and `text-scale-platform.mjs`: also slice `AlphaDevicePlugin.java` (`handOff`,
   `openSettings`…`diagnosticsWorker`, `textScalePercent`…`snapshot`) and slice `node_modules/@capacitor/.../PluginCall.java`.
   Extract `SystemSettingsHandoff` and `TextScale`. Replace the PluginCall slice with one hand-written stub that both use.
3. `update-staging.mjs:53-64`: transplants two blocks of `apps/app/src/prototype/settings-adapter.ts` (anchors
   `export const UPDATE_SCHEMA`, `/** Field updates wait for Home`, `const UPDATE_KEY`, `/** Keep the reference settings
   components`) through `stripTypeScriptTypes` and `vm`. The `prototype/` restructure breaks this. Export the update module and import it.
4. `request-withdrawal-platform.mjs:14-22`: slices `AlphaLocalAgentPlugin.java` from ` @PluginMethod public void request(`.
   Extract `LocalAgentRequests`. `request-withdrawal.mjs:25-55` also regex-parses the model's own `run` text.
5. `source-renewal-platform.mjs:10-27`: nine anchors in `AlphaHostedResultsPlugin.java`. Merge the bridge logic into `SourceRenewalNotices`.
6. Upstream-only splices (`sms-/mms-dispatch-platform.mjs`, `speech-output-preparation.mjs` constant regexes): these
   anchors are in `vendor/eliza`, so they move only on a pin bump. This is a D14 follow-up and does not block Alpha refactors.

I checked every Alpha-side anchor above against the current worktree and all are still present, after the stage-A edits to
`AlphaDevicePlugin`, `AlphaHostedResultsPlugin` and `AlphaLocalAgentPlugin`.

## Shared helpers worth keeping

- `refinement/native/java.mjs` (`javaTraceCampaign`, `javaTraces`): the whole-class compile runner. `reminder-delivery.mjs`
  should use it instead of its own `javac` discovery.
- `refinement/native/current-sources.mjs`: the patched-upstream source resolver. `note-bridge.mjs` and `voice-draft.mjs`
  should use it instead of repeating the `upstream-native-sources.json` + `preparePatchedNative` block.
- `test/fixtures/browser-source.mjs` `loadBrowserModule`: the import-and-run pattern for renderer harnesses
  (`native-stream-bridge.mjs`, renderer half of `request-withdrawal.mjs`). `update-staging.mjs` should use it too.
- `sms-dispatch-platform.mjs`: already shared by the SMS and MMS harnesses.

## Cross-file actions

- Delete the historical probes in `mms-dispatch.mjs` and `sms-dispatch.mjs`, plus `refinement/native/mms-historical-sources.json`.
  This removes their imports of `specs/quint/legacy/core/formal-source-inventory.mjs`, one of the live blockers for
  retiring `specs/quint/legacy` (D11).
- Run each model once. Choose either the 21 per-model wrappers or the native aggregate, and delete the other route.
  For NativeStreamBridge, delete `test/quint-native-stream-bridge.test.mjs`, because `forward-replays.mjs` already runs the replay.
- Remove the B5 ceremony from `check-traces.mjs` consumers: no mid-run re-hashing, and assert `> 0` instead of exact trace counts.
- Drop the manifest `symbols` pins for `NativeStreamBridge` and `NativeRequestWithdrawal`, and pin files only.
- Trim the manifest `sources` of `NativeSpeechWarmup` and `NativeSpeechOutputPreparation` to the files each harness compiles.
- Rename manifest `tests` entries along with the run renames (`NativeNoteRecordingService`), or delete them with the run removals.
- CI: run the seven upstream-only models (OnDeviceRecognizer, PipedCapture, RecognizerAvailability, SpeechGate,
  SpeechOutputPreparation, SpeechWarmup, VoiceDraft) only when `upstream.lock.json`, `android/upstream-native-sources.json`
  or `patches/eliza/**` change. Path-filter the rest to their manifest `sources` plus their harness files.
  A JDK and the org.json jar are needed. Wrapper timeouts go up to 360 s (PipedCapture).
- `native/README.md`: add `NativeRequestWithdrawal` and `NativeStreamBridge`.

## Owner questions

1. Can a current Notes recording start without an owner/folder (`AlphaNoteRecorder.java:107-109` ownerless recovery)?
   If it cannot, the fallback is a legacy reader (D1). Its model action and run go with it.
2. `NativeSettingsHandoff` pins two "AsBuilt" behaviours: a destroyed Activity still dispatches the queued Settings intent,
   and a missing host answers `threw`. Are these intended, or defects (D16)?
3. `NativeSourceRenewal.failedClearCancelsBeforeSavingAsBuiltTest`: when the clear write is refused, the alert is cancelled
   but the row stays `posted`. Is that intended (D16)?
4. Upstream `ReminderStore` still reads `legacyAlarm` rows. Should this be reported upstream as a removable legacy reader
   (D14 follow-up)?
