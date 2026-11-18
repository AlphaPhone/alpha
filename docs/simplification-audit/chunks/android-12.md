# Chunk android-12 — summary

34 files: 3 androidTest reminder accessors, the launcher flavor (manifest, 10 role/IME classes, 2 resources), and the shared main manifest, the assetlinks template and 16 main Java classes from `AlphaActionJournal` to `AlphaDevicePlugin`. Per-file reports are in `docs/simplification-audit/files/<path>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java | MOVE upstream (delete here) | 89 | 0 |
| android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderLifecycleTestAccess.java | MERGE into ReminderTestAccess.java | 29 | 0 |
| android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderTestAccess.java | SIMPLIFY | 105 | 110 (absorbs sibling; ~30 if engine suites move upstream) |
| android/app/src/launcher/AndroidManifest.xml | SIMPLIFY | 108 | 100 |
| android/app/src/launcher/java/.../AlphaCallActivity.java | KEEP | 8 | 8 |
| android/app/src/launcher/java/.../AlphaDialPadActivity.java | KEEP | 12 | 12 |
| android/app/src/launcher/java/.../AlphaInCallService.java | KEEP | 15 | 15 |
| android/app/src/launcher/java/.../AlphaMmsResultReceiver.java | KEEP | 9 | 9 |
| android/app/src/launcher/java/.../AlphaMmsWapPushReceiver.java | KEEP | 9 | 9 |
| android/app/src/launcher/java/.../AlphaRespondViaMessageService.java | KEEP | 9 | 9 |
| android/app/src/launcher/java/.../AlphaSmsComposeActivity.java | KEEP | 9 | 9 |
| android/app/src/launcher/java/.../AlphaSmsDeliverReceiver.java | KEEP | 9 | 9 |
| android/app/src/launcher/java/.../AlphaSmsRole.java | KEEP | 17 | 17 |
| android/app/src/launcher/java/.../AlphaTelephonyRoles.java | SIMPLIFY | 33 | 24 |
| android/app/src/launcher/res/values/alpha_keyboard_dictation.xml | KEEP | 1 | 1 |
| android/app/src/launcher/res/xml/alpha_keyboard_dictation.xml | KEEP | 5 | 5 |
| android/app/src/main/AndroidManifest.xml | SIMPLIFY | 147 | 128 |
| android/app/src/main/assetlinks.template.json | KEEP | 12 | 12 |
| android/app/src/main/java/.../AlphaActionJournal.java | SIMPLIFY | 105 | 85 |
| android/app/src/main/java/.../AlphaActionJournalPlugin.java | SIMPLIFY | 137 | 120 |
| android/app/src/main/java/.../AlphaApplication.java | SIMPLIFY | 28 | 26 |
| android/app/src/main/java/.../AlphaAssistActivity.java | DELETE (owner decision P-78), else SIMPLIFY | 84 | 0 (or 70) |
| android/app/src/main/java/.../AlphaBrowserPlugin.java | SIMPLIFY | 32 | 22 |
| android/app/src/main/java/.../AlphaBrowserStores.java | SIMPLIFY | 60 | 54 |
| android/app/src/main/java/.../AlphaCalendarPlugin.java | SIMPLIFY | 169 | 150 |
| android/app/src/main/java/.../AlphaCanonicalNotifications.java | SIMPLIFY | 204 | 190 |
| android/app/src/main/java/.../AlphaCloudSignInPlugin.java | SIMPLIFY (legacy restore delete) | 153 | 60 |
| android/app/src/main/java/.../AlphaConnectionPlugin.java | SPLIT + SIMPLIFY | 389 | 250 (+~95 moved to GoogleWorkspaceReturn host and CloudReads) |
| android/app/src/main/java/.../AlphaContactsPlugin.java | KEEP | 18 | 18 |
| android/app/src/main/java/.../AlphaCredentialStore.java | SIMPLIFY | 321 | 230 |
| android/app/src/main/java/.../AlphaDataReset.java | KEEP (comment edits) | 24 | 23 |
| android/app/src/main/java/.../AlphaDeletionsPlugin.java | SIMPLIFY | 102 | 90 |
| android/app/src/main/java/.../AlphaDeviceAppsPlugin.java | SIMPLIFY | 29 | 26 |
| android/app/src/main/java/.../AlphaDevicePlugin.java | SPLIT | 857 | 235 (+~560 moved to AppUpdater.java) |

Totals: 3,338 lines now. Net deletable (not counting moves, before formatter): about 520 lines. That is 180 in androidTest/fixtures, 84 for the dormant assist activity, ~93 for legacy sign-in restore, ~90 in the credential store, ~25 in the device plugin, and ~50 of re-exports, duplicated helpers and stale comments elsewhere.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `shareForeground` | helper | AlphaDevicePlugin.java:30 | AlphaCalendarPlugin.java:92,112 (`foreground`,`unlocked`); AlphaDeletionsPlugin.java:98 and :57 (inline variant); CalendarSyncBridge.java:48; CalendarScopedDeletionReview.java:25; AlphaGmailPlugin.java:22; AlphaLocalAgentPlugin.java:512; AlphaDevicePlugin.java:127 (inline) | `OwnerSurface.check(activity, requireFocus)` |
| `hex` / SHA-256 hex | helper | AlphaDevicePlugin.java:240 (+212-218, 282-286, 322-326) | AlphaCredentialStore.java:159-160; WorkflowWorkerAssets.java:26; HostedResultNotices.java:31 (also used by AlphaCanonicalNotifications.java:99); CalendarSyncSnapshot.java:140; GoogleWorkspaceReturnFlow.java:33 | `Digests` util (main) |
| bounded stream read | helper (inline) | AlphaDevicePlugin.java:202-205 | `ConnectionTransport.readBounded` (used at AlphaDevicePlugin.java:680) | `ConnectionTransport.readBounded` |
| `status(String)` | helper | AlphaCalendarPlugin.java:91 | CalendarScopedDeletionReview.java:23; CalendarSyncBridge.java:46; AlphaDeletionsPlugin.java:87 (`finishStatus` + JSONException wrap) | `PluginResults.status` |
| `readGranted` (calendar permission) | helper | AlphaCalendarPlugin.java:111 | CalendarSyncBridge.java:47,219; CalendarScopedDeletionReview.java:24; NativeDigestHost.java:33,35 | `CalendarPermissions` |
| `Task` | interface | AlphaDeletionsPlugin.java:19 | AlphaGmailPlugin.Work; AlphaFilesPlugin.StorageWork; HostedDelivery.NativeSourceWork; AlphaLocalAgentPlugin.ProviderChange | `Callable<JSONObject>` / base `background` |
| `diagnostics` / `clockWork` / `recovery` / `submit` / `task` | helper | AlphaDevicePlugin.java:161; AlphaActionJournalPlugin.java:84; AlphaCloudSignInPlugin.java:85; AlphaConnectionPlugin.java:132; AlphaDeletionsPlugin.java:18 | each other; AlphaCalendarPlugin.java:75-79 raw executor | base-plugin `background(call,work,closedMessage)` over `PluginWorkers` |
| `ForegroundCheck` | interface | AlphaCanonicalNotifications.java:192 | NativeDigestSources.Guard; HostedInbox.Fence; HostedTransport.Guard; ResidentCredentialShutdownRetry.Guard; ResidentResultSession.Guard; SourceRenewalNotices.Guard; `Runnable assertOwner` in AlphaCredentialStore.java:28; `CloudChangeObserver` AlphaCredentialStore.java:23 | one shared `Guard` functional interface |
| anonymous slot-store adapters | adapter | AlphaActionJournal.java:16-19; AlphaActionJournalPlugin.java:25; AlphaCloudSignInPlugin.java:58-63; AlphaConnectionPlugin.java:63-67 | WorkflowNoticeTapsFactory.java:4 (identical to AlphaActionJournalPlugin:25), AlphaReminders, AlphaTelephony, NativeDeletionCoordinator, GmailBackground, HostedDelivery, SourceRenewalHost, ... | `AlphaCredentialStore.asSlots()` (upstream `SecureSlots`) |
| `"cloud:production"` | const (literal) | AlphaCredentialStore.java (11x), AlphaConnectionPlugin.java:64,90,115 | AlphaLocalAgentPlugin (9x), CalendarSyncBridge (4x), GmailBackground, KeyboardDictationCloud, LegacyCloudRecovery, RendererCredentialSlots, ResetBeforeDispatch | `CloudDeployment.PRODUCTION_SLOT` |
| `JsonCredentialSlots` construction | helper (inline) | AlphaCredentialStore.java:32,77,81 | — | `AlphaCredentialStore.open(Context)` |
| `slotLimit` | helper | AlphaCredentialStore.java:34 | RendererCredentialSlots.java:13-30; per-owner caps in renderer (notes-trash-policy.ts etc.) | one `Slots` table |
| `"alphaphone"` scheme | const | AlphaConnectionPlugin.java:30; AlphaBrowserStores.java:23,37 | AndroidManifest.xml:134; AlphaCalendarPlugin.java:33 (`alphaphone://calendar-creation/`) | `AppLinks.SCHEME` |
| op-type sets (reminder/notes/calendar/photo/workflow-read) | const | AlphaActionJournal.java:41-42,70,81,86,90 | AlphaActionJournalPlugin.java:32,44 | named constants in AlphaActionJournal |
| id regexes `[a-f0-9]{64}`, `[A-Za-z0-9_-]{1,128}` | const | AlphaActionJournal.java:76; AlphaActionJournalPlugin.java:89,114,126; AlphaCalendarPlugin.java:68; AlphaCanonicalNotifications.java:60; AlphaCredentialStore.java:166 | ~17 copies across main (research P9) | `Ids` util |
| `PERSISTENT_PROFILE`/`PRIVATE_PREFIX`/`LEGACY_PREFIX`/`ephemeralProfile` | const alias | AlphaBrowserPlugin.java:19-23 | AlphaBrowserStores.java:25-29 | delete aliases |
| `fixtureConfiguration` / `config(id)` | helper | ReminderTestAccess.java:34; ReminderDeletionJournalFixture.java:15 | each other | ReminderTestAccess |
| `store(Context)` | helper | ReminderTestAccess.java:51; ReminderLifecycleTestAccess.java:11 | each other | ReminderTestAccess |
| `"Alpha Phone"` title | const | AlphaCallActivity.java:7; AlphaDialPadActivity.java:11 | AlphaCloudSignInPlugin.java:43, AlphaBrowserStores.java:36 | optional constant |
| `UPDATE_MAX_BYTES` | const | AlphaDevicePlugin.java:234 | apps/app/src/prototype/settings-adapter.ts | keep both (documented pair) |
| receipt-after-failed-stage fallback | helper | AlphaDeletionsPlugin.java:94-97 (`unstaged`) | AlphaCalendarPlugin.java:59-64 | `NativeDeletionCoordinator.receiptOrUnknown(kind,id)` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `AlphaDevicePlugin.reconcileUpdate(PluginCall)` (:495-497) | grep `reconcileUpdate` over apps/, `.eliza/client-features`, test/, scripts/, specs/: no caller of the plugin method (private `reconcileUpdate()` stays) | High |
| `AlphaCredentialStore.providerAdmissionGeneration()` (:294-302) | grep main: 0 callers; only `test/power-cold-native-pin.test.mjs:142` | High |
| `AlphaBrowserPlugin` constant re-exports + `ephemeralProfile` (:18-23) | only 4 androidTest classes use them; originals in AlphaBrowserStores | High |
| Hand-built `WorkflowNoticeDelivery` in `AlphaActionJournalPlugin:24-25` | identical to `WorkflowNoticeTapsFactory.delivery(Context)` | High |
| `AlphaDevicePlugin` bounded read :202-205 | same file uses `ConnectionTransport.readBounded` at :680 | High |
| `AlphaCredentialStore:111` null branch of `provider==null?...` | unreachable after :110 `if(provider==null)return false;` | High |
| `AlphaActionJournalPlugin.read/response` (:20-21) | pure renames of `journal.get` / `entryResponse` | High |
| `AlphaConnectionPlugin` instance `writeCredentialSlot`/`removeCredentialSlot` (:167,171) | no main caller; androidTest casts the plugin to use them | Medium (androidTest edits) |
| `AlphaCloudSignInPlugin.receiptSlot` (:53) | no main caller; androidTest :93 and a slice marker in `test/cloud-deployment.test.mjs:42` | Medium |
| `AlphaCredentialStore.slotHash/slotFile` (:72-73) | no main caller; androidTest (5) and test fixtures inspect ciphertext | Medium |
| `AlphaDeviceAppsPlugin` `phone`/`sms` fields (:17) | hard-coded false; renderer reads only `aospImage`/`contacts` (`main.tsx:380`) | High |
| `AlphaAssistActivity.takeInvocation` (:57-65) + `AlphaLocalAgentPlugin.takeInvocation` | renderer uses `Sense.takeInvocation`; no `Agent.takeInvocation` caller in apps/ or `.eliza/client-features` | High (code), owner for the plugin method contract |
| `AlphaAssistActivity` + `AlphaPowerVoiceActivity` + `AlphaQuickSettingsTile` + manifest entries | all `android:enabled="false"`, no enabler anywhere in repo | Owner decision (P-78) |
| Legacy Cloud sign-in restore (AlphaCloudSignInPlugin :24-29, 74-146; AlphaCredentialStore :79-82, 105, 135, 180, 196-217, 239; LegacyCloudRecovery.java; renderer `legacySignInRecovery`) | pre-namespace slot cannot exist under the renamed package (README/PRD: no migration) | Owner decision (A1) |
| `AlphaCredentialStore.retainedLimit` (:56-62) | only for documents written under an earlier 32 MiB Trash cap | Owner decision (A1) |
| `AlphaBrowserStores.LEGACY_PREFIX` + `.legacyEphemeralPrefix` | "Builds before P-04" profiles | Owner decision (A1) |
| `UPDATE_BINDING` optional `/intent` (AlphaDevicePlugin :293, :746) | writer always appends `/intent`; optional form is for "earlier bound builds" | Owner decision (A1) |
| `AlphaActionJournal` legacy terminal Clock replay branch (:54-56) | "Preserve exact legacy terminal replays" | Owner decision (A1) |
| `ReminderDeletionJournalFixture` + `ReminderDeletionJournalInstrumentedTest` | tests upstream package-private engine internals | Medium (move upstream) |
| `ReminderLifecycleTestAccess` | duplicate accessor; merge into ReminderTestAccess | High |
| `// End of updater methods for host replay.` (AlphaDevicePlugin :846) | slice marker for `specs/quint/refinement/native/update-barrier.mjs:30` only | After AppUpdater split |
| `alpha-transport-diagnostics` SharedPreferences write (AlphaConnectionPlugin :343-344) | DEBUG-only, read only by androidTest | Medium |

## Cross-file actions
1. **Split the updater out of AlphaDevicePlugin.** Create `AppUpdater.java` holding `UpdatePause`, `UpdateActivation`, `UpdateResume` and all static update state. The five `@PluginMethod`s stay as forwards under the `AlphaDevice` plugin name. Files: `AlphaDevicePlugin.java`, new `AppUpdater.java`, `AlphaApplication.java:11`, `AlphaLocalAgentPlugin.java` (UpdatePause users), `AlphaUpdateStatusReceiver.java`, `UpdateConfirmationReceipt.java`, `specs/quint/refinement/native/{runtime-update-pause,update-barrier,update-staging,update-composition}.mjs`, `{RuntimeUpdatePauseTraces,UpdateBarrierHarness,UpdateCompositionHarness,UpdateStagingHarness}.java`, `specs/quint/native/manifest.json`, `test/app-update.test.mjs`, `test/fixtures/UpdateDownloadTest.java`, `test/fixtures/UpdateFlowTest.java`, `scripts/test-automatic-update-platform.ts`.
2. **One `Digests` util.** Files: `AlphaDevicePlugin.java`, `AlphaCredentialStore.java`, `WorkflowWorkerAssets.java`, `release/DataIntegrityProvider.java`, `HostedResultNotices.java`, `CalendarSyncSnapshot.java`, `GoogleWorkspaceReturnFlow.java`, `AlphaCanonicalNotifications.java:99`. Quint stubs that declare `hex` also change.
3. **One `OwnerSurface.check`.** Files: `AlphaDevicePlugin.java` (shareForeground, openNotificationShade, automaticUpdateReady), `AlphaNoteDocumentsPlugin.java:28`, `AlphaCalendarPlugin.java`, `AlphaDeletionsPlugin.java` (two variants), `CalendarSyncBridge.java`, `CalendarScopedDeletionReview.java`, `AlphaGmailPlugin.java`, `AlphaLocalAgentPlugin.java:512`, `AlphaHostedResultsPlugin.java`, `ClockAgentReview.java`. Audit each against its PRD flow.
4. **Base-plugin `background(call, work, closedMessage)`.** Files: `AlphaDevicePlugin`, `AlphaActionJournalPlugin`, `AlphaCloudSignInPlugin`, `AlphaConnectionPlugin` (+ `SerialStorageTasks`), `AlphaDeletionsPlugin`, `AlphaCalendarPlugin`, `AlphaGmailPlugin`, `AlphaFilesPlugin`, `PluginWorkers.java`; `test/plugin-worker-guard.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/serial-storage-tasks.test.mjs`.
5. **`AlphaCredentialStore.asSlots()`** replacing anonymous slot adapters. Files: `AlphaActionJournal.java`, `AlphaActionJournalPlugin.java` (or `WorkflowNoticeTapsFactory`), `AlphaCloudSignInPlugin.java`, `AlphaConnectionPlugin.java` (GoogleWorkspaceReturnFlow.Store), plus the P7 list outside this chunk.
6. **Delete the legacy Cloud sign-in restore (owner decision A1).** Files: `AlphaCloudSignInPlugin.java`, `AlphaCredentialStore.java`, `LegacyCloudRecovery.java`, `ResetBeforeDispatch.java`, `apps/app/src/runtime/cloud-sign-in.ts:49-50`, `apps/app/src/runtime/connection-ui.tsx:2826-2833,3670-3672,3880`, `test/legacy-cloud-recovery.test.mjs`, `test/fixtures/legacy-cloud-recovery/*`, `test/quint-saved-sign-in-recovery.test.mjs`, `specs/quint/refinement/native/{SavedSignInRecoveryReplay.java,saved-sign-in-recovery.mjs,forward-replays.mjs}`, `specs/quint/native/manifest.json:3577-3618`, `test/support/feature-parity.mjs`.
7. **Delete the dormant P-78 entry (owner decision).** Files: `AlphaAssistActivity.java`, `AlphaPowerVoiceActivity.java`, `AlphaQuickSettingsTile.java`, `src/main/AndroidManifest.xml:91-97,123-129`, `src/launcher/AndroidManifest.xml:62-63`, `AlphaLocalAgentPlugin.java:101-118,332-348`, `AlphaSystemPlugin.java:49`, `AlphaDevicePlugin.java:268,639` (assistant-surface check), `proguard-rules.pro`, `scripts/apk.ts`, `scripts/stage-aosp.ts`, `android/aosp/branding/{power-voice,system-entry}/*`, `android/aosp/pixel10a-composition.json`, `specs/quint/refinement/native/{AssistantEntryTraces.java,assistant-entry.mjs,resident-platform.mjs,app-info-handoff-platform.mjs,navigation-service-platform.mjs,NavigationServiceTraces.java}`, `specs/quint/native/manifest.json`, tests `alpha-system-entry`, `always-on-listener`, `aosp-cloud-power-defaults`, `aosp-provisioning-overlay`, `aosp-secure-camera-policy`, `apk-alpha-tile-policy`, `launcher-orientation`, `power-sense-entry`, `renderer-recovery-budget`, `voice-in-chat-only`, androidTest `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`, `PhotosTrashInstrumentedTest`, Playwright `home-assistant-surface`, `listener-invocation.production`.
8. **Move static Cloud reads out of AlphaConnectionPlugin** into `CloudReads`. Files: `AlphaConnectionPlugin.java`, `AlphaCredentialStore.java:209`, `AlphaLocalAgentPlugin.java:463`, `CalendarSyncBridge.java:102,107`, stubs in `test/legacy-cloud-recovery.test.mjs:73`, `test/power-cold-native-pin.test.mjs:91`, `specs/quint/refinement/native/{calendar-sync-enable-platform,resident-platform}.mjs`, `specs/quint/refinement/services/credential-platform.mjs`.
9. **`CloudDeployment.PRODUCTION_SLOT` constant** replacing 32 `"cloud:production"` literals in 9 files (AlphaCredentialStore, AlphaConnectionPlugin, AlphaLocalAgentPlugin, CalendarSyncBridge, GmailBackground, KeyboardDictationCloud, LegacyCloudRecovery, RendererCredentialSlots, ResetBeforeDispatch).
10. **Browser constants.** Delete the `AlphaBrowserPlugin` aliases and point `BrowserContinuityInstrumentedTest`, `BrowserCookiePolicyInstrumentedTest`, `BrowserExternalHandoffInstrumentedTest` and `BrowserSigninsInstrumentedTest` at `AlphaBrowserStores`. If A1 is approved, also drop `LEGACY_PREFIX` and edit `test/browser-construction.test.mjs` and `test/browser-tab-host-identity.test.mjs`.
11. **`platformCapabilities` shape.** Change `AlphaDeviceAppsPlugin.java` and `apps/app/src/native.ts:12`.
12. **Reminder test accessors.** Merge `ReminderLifecycleTestAccess` into `ReminderTestAccess` and update `ReminderHeadsUpInstrumentedTest` and `ReminderLifecycleInstrumentedTest`. Move the deletion-journal fixture upstream and delete `ReminderDeletionJournalInstrumentedTest` and its entry at `scripts/android-instrumentation.ts:277`.
13. **Share op-type constants** between `AlphaActionJournal.java` and `AlphaActionJournalPlugin.java`, and share the receipt-after-failure fallback between `AlphaCalendarPlugin.java` and `AlphaDeletionsPlugin.java`.

## Text/path pins
- **Quint manifests and harnesses that slice text:**
  - `specs/quint/native/manifest.json` pins `AlphaActionJournal(Plugin)`, `AlphaApplication`, `AlphaAssistActivity`, `AlphaCalendarPlugin`, `AlphaCanonicalNotifications`, `AlphaCloudSignInPlugin`, `AlphaConnectionPlugin`, `AlphaCredentialStore`, `AlphaDataReset`, `AlphaDevicePlugin` (7 entries), the two `alpha_keyboard_dictation.xml` files, and the manifests.
  - `specs/quint/refinement/native/runtime-update-pause.mjs:23,26` slices `' static final class UpdatePause {'` and `' static String appSigner('` up to the `" /**\n  * A session's binding:"` comment.
  - `update-barrier.mjs:30` slices to `' // End of updater methods for host replay.'`.
  - Platform stubs declare `class AlphaCredentialStore` / `AlphaConnectionPlugin` / `AlphaAssistActivity` members in about 30 `specs/quint/refinement/**` files.
- **Source-regex tests:**
  - `test/cloud-sign-in-flow.test.mjs:89-90` matches the `DELEGATION_SCHEME`/`DELEGATION_HOST` line and the `DelegationCallback.admit(...)` call text; `:93` parses `assetlinks.template.json`.
  - `test/cloud-deployment.test.mjs:42` slices AlphaCloudSignInPlugin from `PENDING_SLOT` to `receiptSl`.
  - `test/native-secure-slots.test.mjs:167-168` matches `NOTE_ORIGINS` lines.
  - `test/browser-site-permissions.test.mjs:21` matches the `BrowserSessionStore(...sealer(SESSION_KEY_ALIAS,2000000))` text.
  - `test/browser-construction.test.mjs:28` copies the `BrowserTabHostConfig` builder text.
  - `test/browser-tab-host-identity.test.mjs:33` reads the browser constants by name.
  - `test/always-on-listener.test.mjs:61` matches `sense.recordInvocation(isProtectedPowerEntry() ? null : caller);`.
  - `test/aosp-image-capability.test.mjs:139-140` checks the DeviceApps method list, `:222` checks `extends AddressBookPlugin`, `:238-264` checks launcher manifest components and the `AlphaTelephonyRoles` array text, and `:256` checks `MainActivity` call order.
  - `test/keyboard-dictation.test.mjs:16` and `test/aosp-fresh-presets.test.py:96-97` read the IME XML.
  - About 30 `test/*.test.mjs` files regex `src/main/AndroidManifest.xml` (listed in its report).
- **Built-output audits:** `scripts/apk.ts:111,297` (launcher role components and permissions), `test/verify-apks.test.mjs:357-361`, `scripts/render-assetlinks.ts:34` (template path).
- **Generator and config:**
  - `android/consumer-host.json:169` names `AlphaCanonicalNotifications.resumeExisting`.
  - `android/app/product.gradle` references `AlphaApplication` and `AlphaDevicePlugin`.
  - `android/app/proguard-rules.pro` keeps `AlphaAssistActivity`.
  - `scripts/ci/calendar-bridge.{py,init.gradle}` reference `AlphaCalendarPlugin`.
  - `scripts/android-instrumentation.ts:277` lists the runner `ReminderDeletionJournal`.
- **Parity list:** `test/support/feature-parity.mjs` names most plugins in this chunk.
- **LemmaScript-files.txt:** no entries for this chunk.

## New patterns
- **NEW-1: Test-only plugin instance forwards.** These are package-private instance methods on a Capacitor plugin that only androidTest calls, after casting `getBridge().getPlugin(...)`. Examples: `AlphaConnectionPlugin.writeCredentialSlot/removeCredentialSlot`, used by `CombinedAgent*`, `Paired*` and `NoteAudio` instrumentation. This is a variant of D7, but specific to instrumentation: tests should construct the underlying store directly.
- **NEW-2: Identical factory hand-inlined beside the factory.** A class rebuilds an object that a sibling factory already returns, for example `AlphaActionJournalPlugin:24-25` vs `WorkflowNoticeTapsFactory.delivery`. Grep for each factory's constructor call before keeping an inline adapter.
- **NEW-3: Undocumented cross-thread field.** `AlphaCanonicalNotifications.attempt` is a plain `long` that two executors read and write. Fields shared across executors should be `volatile`/atomic or confined to one thread.
- **NEW-4: Diagnostic enums that drifted from their test.** `PublicCloudTransportProbeInstrumentedTest:13` expects `BALANCE`, but `AlphaConnectionPlugin.RequestOperation` no longer has it. Debug-only classification in production code has no compile-time link to its consumers.

## Owner questions
1. **P-78 assistant entry.** `AlphaAssistActivity`, `AlphaPowerVoiceActivity` and `AlphaQuickSettingsTile` are disabled in every manifest, and nothing enables them. Should we delete them and their AOSP patch hunks, or is the feature planned (and recorded in DECISIONS.md)?
2. **Legacy Cloud sign-in restore.** Can a device running the renamed package (`ai.alphacompute.alphaphone`) hold a pre-namespace `cloud:production` slot? If not, should we delete `savedSignInRecoveryStatus`/`restoreSavedSignIn`, `LegacyCloudRecovery` and the renderer "Restore saved sign-in" UI?
3. **Notes Trash retained cap.** Does any pilot device hold a Notes Trash document larger than 30 MiB? If not, should we delete `AlphaCredentialStore.retainedLimit`?
4. **Self-update bindings.** Can an installer session staged by an earlier build, with a binding that has no `/intent`, exist under the new package? If not, should `/intent` be mandatory in `UPDATE_BINDING`?
5. **Legacy terminal Clock replay.** Is `AlphaActionJournal`'s legacy terminal Clock replay without a `clockReview` receipt still reachable? If not, should we delete the branch?
6. **Browser legacy prefix.** Should we drop `AlphaBrowserStores.LEGACY_PREFIX` ("Builds before P-04") under the renamed package?
7. **Image admission.** Should Contacts and DeviceApps keep `AlphaImageCapabilities.aospImage` (provisioned) while telephony roles use `AlphaImageCapability.verified` (admitted), or should one admission decision be used everywhere?
8. **Reminder engine tests.** Should the reminder-engine instrumentation that reaches upstream package-private internals (`ReminderTestAccess`, `ReminderDeletionJournalFixture`, about 16 `Reminder*InstrumentedTest`) move upstream, leaving only Alpha journeys here?
9. **Foreground checks.** Are the differing owner-foreground checks intentional, per flow? Examples: the Calendar availability path omits the lock check, `AlphaDeletionsPlugin` uses two variants, and `shareForeground` is the strictest. If not, should we use one strictest `OwnerSurface.check` everywhere?
10. **Pilot export provider.** Is `release.DataIntegrityProvider` (pilot update export) still needed under the renamed package?
11. **Storage ordering.** Does `SerialStorageTasks` in `AlphaConnectionPlugin` need strict ordering for CAS correctness? If not, can it use the shared background helper?
