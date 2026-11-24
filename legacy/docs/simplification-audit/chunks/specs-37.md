# Chunk specs-37: native refinement harnesses (Resident* ... UpdateBarrierHarness)

22 assigned files (21 present, 1 already deleted). All are Java harness or support files in
`specs/quint/refinement/native/`. Every model they feed is listed in `specs/quint/native/manifest.json` and is
live. Most of the fixes belong in the `.mjs` drivers and in a split of `AlphaDevicePlugin.java`, not in the Java
files themselves.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| ResidentScheduleAdmissionTraces.java | harness (product, whole files + one source seam) | KEEP; driver PORT | Drop the `ResidentScheduleRearm` seam rewrite and the mutation canaries. Observe through `startResidentIfAdmissible`'s returned `Decision`. |
| ResidentStartCancelReplay.java | ITF replay (product) | KEEP; fix exit | `finally System.exit(0)` drops assertion messages. Pass ports through `residentPlatform` options. |
| ResidentTestPorts.java | support | KEEP | 6 resident/credential harnesses use it. No dead members. |
| ResidentTraces.java | harness (upstream only) | KEEP, gated | Run only on `upstream.lock.json` changes. D14: move upstream. |
| ReviewedCopiesTraces.java | harness (product, whole files) | KEEP | Drop hashed inputs that are not compiled. |
| RuntimeUpdatePauseTraces.java | harness (sliced `AlphaDevicePlugin`) | KEEP; driver PORT | Compile a split `AppUpdater.java`. Its slice duplicates `exactUpdateMembers`. |
| SavedSignInRecoveryReplay.java | — | DELETE (already deleted) | Removed along with the legacy Cloud recovery code. |
| ScopedCalendarReviewProvider.java | support | KEEP | Only user is ScopedCalendarReviewTraces. |
| ScopedCalendarReviewTraces.java | harness (product, whole files) | KEEP | Drop the unused `--observe` CLI branch in the driver. |
| ServicePorts.java | support (listener, upstream) | KEEP, gated | Listener lane. |
| SettingsHandoffTraces.java | harness (sliced `AlphaDevicePlugin`) | KEEP; driver PORT | Split out `SettingsHandoff.java`. Drop the consumer-host assert. |
| SharedRecordingProbe.java | probe | DELETE | Its only launcher, `probeSharedRecording`, has no importer. The `permission-call` scenario already covers the same steps. |
| SharedRecordingTraces.java | harness (staged upstream) | KEEP, gated; SIMPLIFY | Replace the in-Java ProcessBuilder campaign with `javaTraceCampaign`. Import the helpers from `current-sources.mjs`. |
| SmsDispatchTraces.java | harness (product + sliced upstream) | KEEP; driver PORT | Delete `historicalSmsSourceTraces` (it depends on legacy). Move the manifest check to `verify-apks`. |
| SourceRenewalTraces.java | harness (product + sliced `AlphaHostedResultsPlugin`) | KEEP; driver PORT | Split out `SourceRenewalBridge.java`. Update together with the A63 `SourceRenewalHost` merge. |
| SpeechGateTraces.java | harness (staged upstream) | KEEP, gated | Clean as it is. |
| SpeechOutputPreparationTraces.java | harness (staged upstream) | KEEP, gated | Read the constants from compiled classes instead of regexes. |
| SpeechWarmupTraces.java | harness (staged upstream) | KEEP, gated | The driver builds the whole recording platform to get one stub. |
| StorePorts.java | support (listener, upstream) | KEEP, gated | Listener lane. |
| TextScaleLifecycleTraces.java | harness (whole MainActivity + sliced `AlphaDevicePlugin`) | KEEP; driver PORT | Split out `TextScale.java`. |
| Trace.java | support (all native harnesses) | KEEP | Add `check` and `readStatic` helpers. |
| UpdateBarrierHarness.java | harness (sliced `AlphaDevicePlugin` by marker comment) | KEEP; driver PORT | Split out `AppUpdater.java` and delete the marker `// End of updater methods for host replay.` |

## Coverage lost if the DELETEs happen
None. `SharedRecordingProbe` is unreachable, and `SharedRecordingTraces` `permission-call` covers the same
sequence. `SavedSignInRecoveryReplay` models code that has already been deleted.
`historicalSmsSourceTraces` only shows that an old upstream revision had the bug. It covers no current behaviour.

## Shared helpers worth keeping
- `Trace.java`: the serialization contract. Extend it with `check(boolean,String)` and `readStatic(Class,String)`, then
  remove about 8 local `check`/`require` copies and 3 local `field(name)` helpers.
- `ResidentTestPorts.java`, `ServicePorts.java`, `StorePorts.java`, `ScopedCalendarReviewProvider.java`: port classes.
  Each has live users.
- `java.mjs` `javaTraceCampaign` (one JVM per scenario). `SharedRecordingTraces` should use it instead of its own
  ProcessBuilder loop.
- `current-sources.mjs`. `shared-recording.mjs` re-implements `currentNativeSource`/`nativePatchInputs` instead of
  importing them.

## Cross-file actions
1. **Split `AlphaDevicePlugin.java` (D1) so harnesses compile whole classes:**
   - `AppUpdater.java` takes lines 234-843: `UPDATE_MAX_BYTES` through the marker, plus `UpdatePause`, `UpdateActivation`, `hex`, `appSigner`, `handOff` and `shareForeground`. Users: `UpdateBarrierHarness`, `RuntimeUpdatePauseTraces`, `test/app-update.test.mjs`.
   - `SettingsHandoff.java` takes `openSettings`, `openPasswordProvider` and `handOff`.
   - `TextScale.java` takes `textScalePercent` through `recommendedTimeout`.

   Then delete `exactUpdateMembers`, `extractWrapper`, the `exact()` slicers in `settings-handoff-platform.mjs` and the `between()` slicer in `text-scale-platform.mjs`. Today four drivers slice the same file, two of them at Javadoc comments.
2. **Split the renewal bridge members of `AlphaHostedResultsPlugin.java`** into `SourceRenewalBridge.java`. This removes the 5 anchors in `source-renewal-platform.mjs`. Do it with delete-candidates A63 (`SourceRenewalHost` into `SourceRenewalNotices`), because the harness reflects on `SourceRenewalHost.instance`.
3. **Resident harnesses:**
   - Give `residentPlatform()` port options and drop the string/regex rewrites in `resident-scheduling-service-admission.mjs` and `resident-start-cancel.mjs`.
   - Remove the `ResidentScheduleRearm` seam.
   - Run the `FinitePolicyTraces.schedulingTraces()` table once instead of twice: today both `ResidentScheduling` and `ResidentSchedulingServiceAdmission` replay it.
4. **Retire the legacy dependency:** drop `historicalSmsSourceTraces` together with the MMS twin (`mmsSourceProbe`), `mms-historical-sources.json`, the import from `specs/quint/legacy/core/formal-source-inventory.mjs`, and test 2 of `test/quint-native-sms-dispatch.test.mjs`.
5. **Gate the upstream-only lane:** `ResidentTraces`, `SpeechGate`, `SpeechOutputPreparation`, `SpeechWarmup`, `SharedRecording`, and the listener ports (`ServicePorts`, `StorePorts`) should run only when `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, their model or their harness files change.
6. **Exact-count assertions (B5):** 11 per-model tests have them (`traces === N`, `observedFields.length === N`, `checkpoints === 106`, lead `727`). Assert `passed` and `> 0` instead. The per-model tests also re-run what the `index.mjs` aggregate already runs (T4). Keep one entry point per model.
7. **Delete `--observe` CLI branches** that nothing invokes: `scoped-calendar-review.mjs`, `calendar-sync-enable.mjs`, `navigation-progress.mjs`.

## Owner questions
- `SettingsHandoffTraces` treats an NPE from `openSettings` with no host Activity as the "absent host" outcome. Should
  the plugin reject cleanly instead? That is a behaviour change (D16).
- Should the upstream-only harnesses (`ResidentTraces`, speech gate/output/warm-up, shared recording, listener ports)
  move to `vendor/eliza` (D14 follow-up), or stay here behind an upstream-lock path filter?
- `ResidentStartCancelReplay` and the `androidTest` assistant tests depend on the `*ForTest` hooks in
  `AlphaLocalAgentPlugin`. Keep the hooks, or replace them with a reflective `Trace.writeStatic`?
