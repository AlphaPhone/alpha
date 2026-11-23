# Chunk specs-41: native Quint refinement drivers (reviewed-copies … workflow-notice-platform)

The chunk has 30 assigned paths. 29 exist and 1 was already deleted (`saved-sign-in-recovery.mjs`). Each model they feed is
listed in `specs/quint/native/manifest.json` and has its `.qnt`, so every one is live. All product files they compile or read still exist,
and every text anchor was checked and still matches. Apart from the deleted legacy sign-in recovery, none of these files
covers only a deleted feature. Source renewal is production-reachable: `MainActivity.java:353` registers it and
`hosted-digest-ui.tsx` calls it.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| reviewed-copies.mjs | Java harness, whole classes | KEEP | drop unused hashed inputs; return obligations from check |
| runtime-update-pause.md | doc | MERGE | `refinement/native/README.md` |
| runtime-update-pause.mjs | Java harness, slices `AlphaDevicePlugin` | PORT | compile `update/AppUpdater.java` (U-A1) |
| saved-sign-in-recovery.mjs | – (deleted) | DELETE (done) | legacy Cloud recovery (D1) |
| scoped-calendar-review-platform.mjs | fixture, no-op patch staging, patches upstream `ContentValues` text | SIMPLIFY | vendor sources direct; own `ContentValues` stub |
| scoped-calendar-review.mjs | Java harness, whole classes | KEEP | inline trace generator, drop CLI |
| settings-handoff-platform.mjs | fixture, slices `AlphaDevicePlugin` + Capacitor `PluginCall` | PORT | extract `SettingsHandoff.java`; shared `PluginCall` stub |
| settings-handoff.mjs | Java harness | PORT/SIMPLIFY | delete consumer-host pin, patch receipt |
| shared-recording-platform.mjs | fixture (replace-chains on other fixtures) | SIMPLIFY | flat stub set |
| shared-recording.mjs | Java harness, upstream-only | KEEP | use `current-sources.mjs`; delete dead `probeSharedRecording` |
| sms-dispatch-platform.mjs | fixture, slices upstream `TelephonyPlugin`/`MmsStore`/`SmsProviderReader` | PORT (D14 upstream seam) | shared stubs |
| sms-dispatch.mjs | Java harness | PORT/SIMPLIFY | delete historical replay (legacy), manifest regex, consumer-host pin |
| source-renewal-platform.mjs | fixture, slices `AlphaHostedResultsPlugin` (5 ranges) | PORT | renewal bridge class compiled whole |
| source-renewal.mjs | Java harness | PORT/SIMPLIFY | drop vacuous patch asserts |
| speech-cleanup-latch.mjs | renderer transplant (slice + strip-types + vm) | PORT | `loadProductModule` on `app-speech.ts`, `cloud-voice.ts` |
| speech-gate.mjs | Java harness, upstream-only | KEEP | drop CLI |
| speech-output-preparation.mjs | Java harness, upstream-only, regex constants | KEEP | upstream factory follow-up |
| speech-warmup.mjs | Java harness, upstream-only | KEEP | one stub instead of whole recording platform |
| telephony.mjs | real TS import (esbuild) | KEEP | one build per module; shared loader; root-relative |
| text-scale-lifecycle.mjs | Java harness, whole `MainActivity` | KEEP | follows platform port |
| text-scale-platform.mjs | fixture, slices `AlphaDevicePlugin` + Capacitor | PORT | extract `TextScale.java` |
| update-barrier.mjs | Java harness + exported slicer (product marker comment) | PORT | `AppUpdater.java`; delete marker + `exactUpdateMembers` |
| update-composition.mjs | Java harness via slicer | PORT | follows update-barrier |
| update-staging.mjs | Java via slicer + Settings transplant | PORT | import `runtime/app-update.ts`; `AppUpdater.java` |
| video-edit-review.mjs | real module + JSDOM replay | KEEP | drop `rewrite` mutation hook |
| video-recorder.mjs | real module replay | KEEP | one runner |
| voice-draft.mjs | Java harness, upstream-only | KEEP | use `current-sources.mjs` |
| workflow-notice-delivery.md | doc | MERGE | native README |
| workflow-notice-delivery.mjs | Java harness | PORT/SIMPLIFY | vendor direct; drop `patches==[]` assert |
| workflow-notice-platform.mjs | fixture, slices upstream host plugin + regexes product overrides | PORT | `AlphaNoticeConfig.java`; upstream `WorkflowNoticeEntry` |

## Text pins these harnesses depend on (for the T10 port)
- `AlphaDevicePlugin.java`: `' static final class UpdatePause {'`→`' private static final class UpdateActivation'`, `hex` one-liner regex, `' static String appSigner('`→`" /**\n  * A session's binding:"` (runtime-update-pause); `' static final long UPDATE_MAX_BYTES='`→marker `' // End of updater methods for host replay.'`, `handOff` one-liner, `shareForeground` block (update-barrier → composition, staging, `test/app-update.test.mjs`); `' private static Intent handOff('`→`' /**\n  * Asks Android'`, `' @PluginMethod public void openSettings('`→`' private final java.util.concurrent.ExecutorService diagnosticsWorker'` (settings-handoff); `' static int textScalePercent('`→`' @PluginMethod public void snapshot('` (text-scale).
- `AlphaHostedResultsPlugin.java`: five ranges (CHANNEL…channel(), sourceForeground…nativeSourceIdentity, pendingSourceRenewal…load(), handleOnNewIntent…"/** The page reports", handleOnDestroy…EOF).
- `AlphaNotificationsPlugin.java`: five `@Override protected` one-line regexes.
- `apps/app/src/prototype/settings-adapter.ts`: `export const UPDATE_SCHEMA`→`/** Field updates wait for Home`, `const UPDATE_KEY`→`/** Keep the reference settings components`.
- `apps/app/src/local-speech-playback.ts` (`export async function confirmSpeechRetirement`→EOF), `runtime/cloud-voice.ts` (`export function cloudVoiceServiceLimit(`→`/** Product registration only`; `let appSpeechRetirement…`→EOF).
- Capacitor `node_modules/.../PluginCall.java`: `getString` range (settings), `getInt` range (text-scale).
- Upstream (D14): `TelephonyPlugin`, `MmsStore`, `SmsProviderReader` (sms); `NotificationsHostPlugin` (workflow); `ContentValues` test fixture (calendar); three regexed constants (speech-output-preparation).
- Test mutation substrings in `test/quint-video-edit-review.test.mjs` (block the formatter).

## Behaviours that would lose all coverage if the DELETEs happen
- The only deletions proposed are the historical SMS replay, the manifest/consumer-host text pins, the dead `probeSharedRecording`, CLI entry points
  and per-model duplicate test wrappers. No product behaviour loses coverage. The current-pin SMS campaign still
  covers the repaired dialog binding.
- The `AlphaSmsSendReceiver android:exported="false"` check must move into the APK or merged-manifest audit (`verify-apks`) before
  it is deleted here. Otherwise no check covers it.
- If a per-model test wrapper is deleted, the aggregate `test/quint-native-refinement.test.mjs` (or forward-replays for
  speech-cleanup/video) must stay a required check. Several of these campaigns are the **only** executable coverage
  of: reviewed SMS dispatch, Settings handoff intents, text-scale lifecycle, update pause, activation, staging and composition,
  source renewal notices, workflow notice delivery, Calendar scoped delete review, and the telephony executor's call and contact
  approval paths.

## Shared helpers worth keeping or creating
- Keep `java.mjs` (`javaTraceCampaign`), `check-traces.mjs`, `current-sources.mjs` (make it the single resolver),
  `loadProductModule` (move to `refinement/support/` and reuse in telephony, speech-cleanup and update-staging).
- Create `refinement/native/support/` for one Android/Capacitor stub set (`PluginCall`, `Plugin`, `JSObject`, `Activity`,
  `AlertDialog`, `Context`, `Intent`, `Uri`, `PendingIntent`, `Notification*`) and an `assertPinnedUpstream` helper.
  The pinned check is copied by hand in 7 harnesses today.

## Cross-file actions
1. **The native patch staging is a no-op.** `android/upstream-native-sources.json` has 0 patches, `patches/eliza/` does not
   exist, and `preparePatchedNative` throws if any patch is present. Every staged file is a byte copy of `vendor/eliza`.
   Remove `preparePatchedNative`/`prepareNativeFixture`/`materializeNativePatches`/`verifyNativePatchReceipt`
   usage from the refinement harnesses (and import-time staging in `shared-recording`, `voice-draft`, `note-bridge`,
   `current-sources`). Compile vendor paths directly. This affects about 10 files in this chunk and more in neighbouring chunks.
2. With U-A1 (`update/AppUpdater.java`), port the four update harnesses and `test/app-update.test.mjs` in the same
   change. Delete the `// End of updater methods for host replay.` marker.
3. Extract `SettingsHandoff.java` and `TextScale.java` from `AlphaDevicePlugin`, a renewal bridge class from
   `AlphaHostedResultsPlugin`, and `AlphaNoticeConfig.java` from `AlphaNotificationsPlugin`.
4. Move the Settings update policy to `runtime/app-update.ts` with `checkForUpdate` and a cache-state reader exported.
5. Delete `historicalSmsSourceTraces`, its test case and (with `mms-dispatch.mjs`) `mms-historical-sources.json`. This removes
   one of the remaining reasons `specs/quint/legacy` exists (P6).
6. Remove the duplicated `currentNativeSource`/`nativePatchInputs` in `shared-recording.mjs` and `voice-draft.mjs`. Update
   `live-capture.mjs` to import from `current-sources.mjs`.
7. Delete `SharedRecordingProbe.java` with `probeSharedRecording`.
8. Merge the `runtime-update-pause.md` and `workflow-notice-delivery.md` tables into `refinement/native/README.md`.
9. Lanes: upstream-only models (shared-recording, speech-gate, speech-output-preparation, speech-warmup, voice-draft)
   run only when `upstream.lock.json`, their `.qnt` or their harness files change. Java harnesses run on their
   product classes plus their own files. Telephony, video and speech-cleanup run on their renderer modules' bundle inputs.
10. Pick one runner per replay: per-model `test/quint-*.test.mjs` wrappers or the aggregate/forward-replays (T4).

## Owner questions
- Is the native patch mechanism (`android/upstream-native-sources.json` patches, `patches/eliza/`) retired for good? If
  yes, the staging code and its receipts can go everywhere. If not, the harnesses keep one staging call through a shared helper.
- Should the historical SMS regression witness be kept as a counterexample? The recommendation is to delete it with `specs/quint/legacy`.
- Upstream follow-ups (D14): split SMS reviewed send out of `TelephonyPlugin`, workflow posting out of
  `NotificationsHostPlugin`, and expose a `SpeechLeadTrim` factory. Should these go upstream, or should the slices stay pinned?
