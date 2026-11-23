# Chunk specs-20: Quint native models (NativeActionRecovery … NativeMapsLocation)

There are 20 files. All 20 are live models in `specs/quint/native/manifest.json`, and every source they list still exists after stage A. Every one has a refinement harness in `specs/quint/refinement/native/`. Each harness runs **twice** per `npm test`: once from its own `test/quint-*.test.mjs` and once from the family aggregate (`refinement/native/index.mjs` → `test/quint-native-refinement.test.mjs`). The test wrappers pin exact trace and field counts (T4, B5). Those two points apply to every row below and are not repeated in each one.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| NativeActionRecovery.qnt | Quint + JVM harness (prefix slice of `AlphaActionJournalPlugin.java`) | KEEP; PORT harness | Delegate class compiled whole. Delete the binding-less "legacy reminder" dimension and its 2 tests if D1 confirms that no current writer omits `enrollmentId`. |
| NativeAppInfoHandoff.qnt | Quint + JVM harness (product compiled whole) | KEEP | The upstream `SystemLauncherApps` slice goes to the D14 upstream follow-ups. |
| NativeAsrPipe.qnt | Quint, upstream-only | KEEP | Run only when the upstream pin changes. |
| NativeAssistantEntry.qnt | Quint + JVM harness (slices `AlphaLocalAgentPlugin.java`) | KEEP (D7); PORT; delete dead part | Delete `readSurface`/`legacyHasNoVoice`: `launchSurface` and `Agent.takeInvocation` have no renderer caller. Move `PowerLaunchPin` to its own file. |
| NativeCalendarScopedReview.qnt | Quint + JVM harness | KEEP | — |
| NativeCalendarSyncEnable.qnt | Quint + JVM harness | KEEP pending Q-CAL-1 | DELETE together with the Android `CalendarSync*` stack if the owner confirms. |
| NativeCaptureFrames.qnt | Quint, upstream-only | KEEP | Upstream-pin lane. |
| NativeClockReview.qnt | Quint + JVM harness | KEEP | Delete the `seedLegacy` / legacy terminal replay with Q-LEG-7. |
| NativeCrashJournal.qnt | Quint + JVM harness (slices `AlphaDevicePlugin.java`) | KEEP; PORT | Compile the crash-journal bridge class produced by the D1 split of `AlphaDevicePlugin`. Rename the `"legacy"` seed to `"malformed"`. |
| NativeDeletionReviewAdmission.qnt | Quint + exhaustive JVM replay | KEEP | — |
| NativeDigestConsent.qnt | Quint + JVM harness (slices `HostedDelivery.java`) | KEEP; PORT | Move `NativeSourceWork` out of `HostedDelivery`. |
| NativeGmailBackground.qnt | Quint + JVM harness | KEEP | Delete the duplicated unreachable branch at line 185. The upstream `NativeProviderAdmission` slice goes to the D14 follow-ups. |
| NativeHostedInbox.qnt | Quint + JVM harness (resident only) | KEEP | **Correction:** do not delete it under D5 (cross-file-actions U-R5). Drop `HostedTransport`/`CloudDeployment`/`NativeDeviceEnrollmentKey` from the harness compile list when Q-HOST-1 lands. |
| NativeHostedResultNotices.qnt | Quint + JVM harness (six-fragment slice of `AlphaHostedResultsPlugin.java`) | KEEP; PORT | Compile a `HostedNoticeBridge` delegate whole. The harness stubs must follow the A63 merges. |
| NativeIndicatorProvider.qnt | Quint, upstream-only | KEEP (D7) | The `identities` field is constant in the model. Add a comment or drop it. |
| NativeListenerInput.qnt | Quint, upstream-only | KEEP (D7) | Upstream-pin lane. |
| NativeListenerService.qnt | Quint, upstream-only | KEEP (D7) | Upstream-pin lane. |
| NativeListenerStore.qnt | Quint, upstream-only | KEEP (D7) | Upstream-pin lane. |
| NativeLiveCapture.qnt | Quint, upstream sources + staging manifest | KEEP | Upstream-pin lane. |
| NativeMapsLocation.qnt | Quint + TS harness that bundles and runs the real module | KEEP; MOVE to `application/` | Delete the 5 manifest `symbols`. This harness is the reference pattern for PORTs. |

## Coverage that would be lost
- Nothing in this chunk is a straight DELETE today.
- The two conditional deletes are NativeCalendarSyncEnable (Q-CAL-1) and the legacy parts of ActionRecovery and ClockReview. Each one removes coverage only of the code it goes with.
- If NativeHostedInbox were deleted as U-R5 proposes, resident result delivery would lose its only behavioural model. Keep it.
- NativeGmailBackground and NativeHostedResultNotices become the remaining behavioural coverage once the source-text host tests (`gmail-background-binding`, `native-deletion-admission`, `context-selection`) are deleted.

## Shared helpers worth keeping
- `refinement/native/java.mjs` (javac/JVM runner)
- `current-sources.mjs` (staged upstream resolution)
- `live-capture-platform.mjs` and `shared-recording.mjs`, which are reused by 3 or more harnesses
- `services/maps-model-traces.mjs`

## Cross-file actions
1. **Text-slice ports.** These have to land in the same change as the product edits that would break them:
   - `AlphaDevicePlugin` split → crash-journal
   - `HostedDelivery` resident-only change → native-digest
   - `AlphaHostedResultsPlugin` (B29, A63, Q-HOST-2) → hosted-result-notices
   - `AlphaLocalAgentPlugin` split → assistant-entry
   - `AlphaActionJournalPlugin` → action-recovery

   All anchors still match after stage A. I checked each one.
2. **Dead code to delete together.** `AlphaLocalAgentPlugin.launchSurface`/`takeInvocation`, `AlphaAssistActivity.takeInvocation` (B20), `AssistantInstrumentedTest` (A54), and the assistant model's `readSurface`.
3. **Duplicate replays.** Remove one replay path per model: either the per-model wrappers or the native aggregate. Replace exact-count assertions with `> 0`.
4. **CI lane.** Path-scope the 8 upstream-only models (AsrPipe, CaptureFrames, IndicatorProvider, Listener×3, LiveCapture, plus NativeAppInfoHandoff's upstream slice) to `upstream.lock.json`, `android/upstream-native-sources.json`, `android/sense/**` and their own harness files.
5. **Manifest.** Remove the NativeMapsLocation `symbols` and move the model to `application/`. Lower the floors in `test/quint-checker.test.mjs` if Q-CAL-1 deletes a model.

## Owner questions
- Q-CAL-1: are the Android `CalendarSyncBridge` stack and NativeCalendarSyncEnable deleted?
- Q-LEG-7 / Q-AND-4: are the legacy Clock terminal replay (ClockReview `seedLegacy`) and the binding-less journal rows (ActionRecovery `completeBinding=false`) unreachable on a fresh install?
- Can `AlphaLocalAgentPlugin.launchSurface`/`takeInvocation` be deleted? There is no renderer caller. This also needs a decision on A54.
- Should the upstream-only listener and capture models move upstream (D14 follow-up)?
