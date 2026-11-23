# Alpha Phone parity audit: Android packaging (`android/**`)

Slice: `alpha-develop/android/**` (415 Java files) against `alpha-vs/android/**` (448 Java files), tree to tree.
Upstream compared: `eliza-develop` (legacy pin) and `eliza-vs/packages/os/android` (vibestack).
Nothing was built, generated or run. Every "does not compile" below is from reading sources; none is a compiler result.

`diff -rq` result (build outputs ignored): 1 file only in legacy (`upstream-native-sources.json`), 14 entries only in the port
(`agent/` with 3 files, 5 new classes plus `cloud/` 11, `connection/` 5, `runtime/` 7, and 7 more top-level classes: 33 new Java files),
49 files changed. No legacy Java class was deleted. `app/src/launcher/AndroidManifest.xml`, `app/src/main/res/**`,
`app/proguard-rules.pro`, `aosp/**`, `signing/**`, `release-signer.json`, `gradle/verification-*`, `shared-ui/**`, `sense/src/**` and
`app.config.json` are byte-identical.

## Summary

| Class | Count |
|---|---|
| OK (verified) | 22 |
| MISSING | 3 |
| UNIMPLEMENTED (includes build breaks) | 5 |
| CHANGED | 7 |
| UNMODELED | 1 (also KNOWN, gap 19) |
| KNOWN (open-items doc) | 6 |
| RETIRED | 1 |
| UNVERIFIED | 2 |

Verdict: **not at parity, and not buildable as written.** The Java the port kept is almost untouched (most changed files differ
only by an import rename), the manifest keeps every permission, role filter, provider and receiver, and the app id stays
`ai.alphacompute.alphaphone`. The gaps are in the seam to the upstream host. By the upstream model in `eliza-vs`, the generator
refuses `consumer-host.json` (15 versioned `coordinate` dependencies); if it were accepted, three source-level breaks remain
(`AlphaCanonicalNotifications` against package-private upstream classes, Alpha's `ReminderStore` copy against the new
`ReminderEngine`, and a duplicate FileProvider declaration). Beyond the build, an updated phone would start its agent on an empty
state directory (legacy `files/.eliza` is never adopted), the headless notification resume hook has no caller, the upstream boot
receiver starts the agent without Alpha's owner gate, and several native request gates lost their only caller. None of these
eight (gaps 1 to 8) is in `docs/vibestack-open-items.md`.

## Gaps

### 1. MISSING: the resident's stored state is not carried over an update
- Behaviour: the agent's database (conversations, memory, scheduled tasks, workflows, auth, prompts) survives an app update.
- Legacy: state lives in `files/.eliza` (`eliza-develop/packages/app/platforms/android/app/src/main/java/ai/elizaos/app/ElizaAgentService.java:93,115`, `ELIZA_STATE_DIR` set at `:2849`); runtime payload in `files/agent` (`:103`).
- Port: upstream `AgentService` launches with `directories.state(userId, organizationId)` = `files/agent/<sha256(user\norg)>` (`eliza-vs/packages/os/android/agent-service/src/main/java/ai/eliza/os/agent/AgentDirectories.java:36`, `AgentService.java:576`). Nothing in `alpha-vs/android`, `alpha-vs/scripts/resident` or `eliza-vs` reads or moves `files/.eliza` (searched `.eliza`, `adopt`, `migrat`, `legacy`). Not in the open-items doc. `GoogleAgentAccessFile.java:23` still writes under `files/.eliza`.
- Impact: after the update the agent has no history, memory, schedules or workflows. The old data stays on disk, unreachable. The legacy payload under `files/agent/` is also never cleaned, and now shares its parent with the new state directories.
- Unverified part: whether the new agent could read the old PGlite schema at all. The directory mismatch is certain.
- Smallest fix: a rule in `apps/app/spec/platform/resident.md` (state adoption or an explicit owner-approved reset), implemented in `ElizaAgentService.configureLaunch` or `scripts/resident/entry.vibe`; if the data cannot be read, an OWNER bullet in the open-items doc.

### 2. UNIMPLEMENTED (build): the upstream generator refuses the host profile
- Behaviour: `scripts/android-host.ts` generates the Gradle project from `android/consumer-host.json`.
- Legacy: schema-1 profile with versioned coordinates (`alpha-develop/android/consumer-host.json:50-67`).
- Port: schema-2 profile still lists 15 `"coordinate": "group:artifact:version"` dependencies (`alpha-vs/android/consumer-host.json:164-238`; credentials, googleid, browser, okhttp, media3 x2, work-runtime, five androidTest, junit, robolectric). Schema 2 admits only `module` plus a `toolchain.json` version key: `artifactValid: dependency.coordinate === undefined && …` (`eliza-vs/packages/os/src/build/android-host-profile.vibe:359-363`), `dependencyAdmitted` and `HostRefused({ refusal: DependencyNotPinned })` (`eliza-vs/spec/os/build/androidHost.md:196-198,276`; the spec states "a versioned coordinate has no toolchain key"). `scripts/android-host.ts:28-32,52-60` passes the profile unchanged.
- Impact: no Android host is generated, so no APK. Caveat: judged against `eliza-vs` (`vibestack-dp`), not the commit in `upstream.lock.json`.
- Smallest fix: move the 15 artifacts to `module` + `toolchainVersion` once upstream `host-templates/toolchain.json` carries their keys, or declare them in `android/app/product.gradle`.

### 3. UNIMPLEMENTED (build): `AlphaCanonicalNotifications` references classes it cannot see
- Behaviour: the resident's notifications (reminders, workflow notices) are projected to Android notifications.
- Legacy: `residentHost.classes` (`alpha-develop/android/consumer-host.json:126-132`) had the generator copy `NativeNotificationInbox/Wire/Route/Channels/Projector` into the app package (`generatedSources`, `:102`).
- Port: `AlphaCanonicalNotifications.java` (unchanged; lines 31, 109, 111, 113, 129, 148, 179, 182) uses `NativeNotificationInbox`, `NativeNotificationWire`, `NativeNotificationRoute`, `NativeNotificationProjector` by simple name with no import. Upstream now has them package-private in another package: `final class NativeNotificationInbox` in `package ai.elizaos.app` (`eliza-vs/packages/os/android/notifications/src/main/java/ai/elizaos/app/NativeNotificationInbox.java:1,22`; same for Wire, Route, Projector). Schema 2 has no `residentHost.classes` successor (`androidHost.md`, "`residentHost.{classes,sockets,helpers}` left with the second process"), and nothing in `alpha-vs/scripts` projects them.
- Impact: `:app` does not compile. If it did, resident notifications would not post.
- Smallest fix: upstream makes the four classes public (or offers a public facade) and `AlphaCanonicalNotifications` imports them; or Alpha copies them as it did the `runtime/` helpers.

### 4. UNIMPLEMENTED (build): Alpha's `ReminderStore` copy no longer matches upstream
- Legacy/port copy: `private final int LIMIT = 250;` (`alpha-vs/android/shared-ui/eliza-reminders/java/ai/eliza/plugins/reminders/ReminderStore.java:40`), swapped into `:eliza-reminders` by `android/app/product.gradle:117-133`.
- Upstream now: `static final int LIMIT = 250;` and `ReminderEngine.capacity(){return ReminderStore.LIMIT;}` (`eliza-vs/packages/os/android/reminders/src/main/java/ai/eliza/plugins/reminders/ReminderEngine.java:40`).
- Impact: `:eliza-reminders` does not compile with Alpha's copy. `test/shared-ui-overrides.test.mjs`, which kept the copy in step with the pin, is legacy and retired.
- Smallest fix: make `LIMIT` `static final` in Alpha's copy; re-diff both copies in `shared-ui-overrides.json` against the new pin (`ElizaPasswordAutofillService` is unchanged upstream).

### 5. UNIMPLEMENTED (build, unverified without the manifest merger): the storage FileProvider is declared twice
- Legacy: the filesystem plugin was only a Java source directory (`alpha-develop/android/consumer-host.json:97-101`), so Alpha's manifest declares the provider itself.
- Port: `filesystem` is an os module with no `sources` selection (`alpha-vs/android/consumer-host.json:103`), so it builds as `:eliza-filesystem` and its manifest merges (`builtAsProject`, `androidHost.md:173`). That manifest declares `ai.eliza.plugins.filesystem.browser.ReadOnlyStorageFileProvider` with `@xml/eliza_files_storage_paths` (`eliza-vs/packages/os/android/filesystem/src/main/AndroidManifest.xml:7-15`); Alpha's declares the same provider with `@xml/storage_paths` and no `tools:replace` (`alpha-vs/android/app/src/main/AndroidManifest.xml:104`). The generator's removal overlay only strips exported components (`android-host.vibe:424-430`); this provider is not exported.
- Impact: manifest merge fails on the conflicting `meta-data` resource, or Files' path set silently changes.
- Smallest fix: `tools:replace="android:resource"` on Alpha's `meta-data`, or drop Alpha's declaration and adopt upstream's paths after comparing the two XML files.

### 6. UNIMPLEMENTED: notification delivery is not resumed when the agent becomes ready
- Legacy: the generated service called `AlphaLocalAgentPlugin.publishNotificationRoot` at root publication and `AlphaCanonicalNotifications.resumeExisting` at ready (`alpha-develop/android/consumer-host.json:160-163`).
- Port: both methods exist with no caller (`AlphaCanonicalNotifications.java:37`, `AlphaLocalAgentPlugin.java:1022`). `ElizaAgentService.install` registers only `AgentService.observe(acknowledgeShutdown)` (`ElizaAgentService.java:68`); upstream's `AgentService.onReady` (`AgentService.java:158`) is unused. The only remaining trigger is `AlphaCanonicalNotifications.ensure` from `MainActivity.java:572` and `AlphaNotificationsPlugin.java:25`.
- Impact: after a reboot or an agent restart with the app closed, reminder and workflow notifications are not posted until the owner opens Alpha.
- Smallest fix: `ElizaAgentService.install` adds `AgentService.onReady(() -> AlphaCanonicalNotifications.resumeExisting(application))`; rule in `spec/clock/notifications.md`.

### 7. CHANGED: the agent now starts at boot without Alpha's owner gate
- Legacy: only `ResidentScheduleReceiver` starts it, and only when unlocked, packaged and `shouldAutoStart` (owner chose on-device or hybrid), through `startResidentIfAdmissible` (`ResidentScheduleReceiver.java:21-30`, #394).
- Port: that receiver is kept, but the agent-service module manifest adds `ai.eliza.os.agent.AgentStartReceiver` for `BOOT_COMPLETED` and `MY_PACKAGE_REPLACED` (`eliza-vs/packages/os/android/agent-service/src/main/AndroidManifest.xml:8-13`), which starts whenever `AgentService.signedIn()`. `AlphaAgentCredentials.current()` never returns null (it falls back to the local account, `AlphaAgentCredentials.java:26`), so that is always true. Alpha's manifest does not remove the receiver.
- Impact: every phone starts the resident and its foreground notification at boot and after each update, whatever the owner's runtime mode. May be intended (P-43, "the resident always runs"), but then `shouldAutoStart` is dead and the two receivers race.
- Smallest fix: decide in `spec/platform/resident.md`; then either `tools:node="remove"` the upstream receiver in Alpha's manifest or delete `ResidentScheduleReceiver`'s gate.

### 8. CHANGED: native request gates lost their only caller
Removing `AlphaLocalAgent.request/requestStream` and `AlphaConnection.request` (replaced by upstream `ElizaAgent` and `ElizaCloud`) left these checks as dead code:
- `CalendarSyncConsent.write/admits`, the native consent for Google Calendar writes (legacy `AlphaConnectionPlugin.java:274`; port: no caller, class kept). Upstream `CloudRequestPolicy` has no equivalent.
- `PreparedViewNavigation.allowed` for `/navigate` bodies (legacy `AlphaLocalAgentPlugin.java:1283`; port: no caller; `host.json` admits `POST /api/views/{id}/navigate` with no body rule).
- `OwnerRoutes.requestAllowed` and the owner-mismatch 409 (legacy `:1287,1319`; port: `OwnerRoutes.shipped` has no caller, though `owner-routes.json` is still staged as an asset).
- Reply drafting only on the verified image and for the provider's owner (legacy `:1321-1324`; port: `POST /api/messages/reply-draft` is open in `host.json`; only the `ELIZA_MOBILE_SMS_REPLY_DRAFT` launch variable remains).
- `ConnectionRoutes.managedService`, `admittedHeader`, `billingRequestIdentity`: no caller.
- Impact: checks that were enforced natively now rest on the renderer and the agent alone. Smallest fix: per gate, either a `host.json` body/query rule, a renderer rule with a Quint model in `spec/platform` or `spec/calendar`, or delete the dead class and record the retirement.

### 9. CHANGED: start and stop bypass Alpha's lifecycle bookkeeping
- Legacy: `AlphaLocalAgent.start/cancelStart/getStatus/stop` (`AlphaLocalAgentPlugin.java:774,918,976,1011`); `stop` forgot the notification session, invalidated calls, advanced the lifecycle epoch, cleared enrollment and reissued a pending strict credential stop.
- Port: those four methods are removed; the renderer calls upstream `ElizaAgent.start/stop` (`eliza-vs/.../agent-service/src/capacitor/java/ai/eliza/os/agent/AgentPlugin.java:31-33`), which call `AgentService.start/stop` directly, not `ElizaAgentService.start`. Launch-time checks survive in `ElizaAgentService.configureLaunch` (`:82-95`), but nothing advances `AlphaLocalAgentPlugin`'s epoch or calls `AlphaCanonicalNotifications.forget` on an owner stop. `cancelStart` is still referenced in comments (`AlphaLocalAgentPlugin.java`, `runtime/ResidentAttachment.java`).
- Impact (unverified at run time): after an owner stop, native callers may keep a stale enrollment and the notification session until the next launch changes the token.
- Smallest fix: `ElizaAgentService` observes status changes and drives the plugin's epoch; rule in `spec/platform/resident.md` ("Stopping is confirmed only when…").

### 10. MISSING: editing a saved provider key, and conditional provider removal
- Legacy: `editProviderKeys` and `clearProviderIfCurrent` (`AlphaLocalAgentPlugin.java:559,444`), used by `apps/app/src/runtime/local-agent.ts:648-649,729-730` and `connection-ui.tsx:1440`.
- Port: both removed from Java and absent from `apps/app/src/platform/native-plugins.ts:15-23` and the renderer.
- Impact: the owner can no longer change one key (text or voice) of a saved provider in place; a removal can no longer be guarded by the binding it was reviewed against.
- Smallest fix: restore the two methods, add them to `native-plugins.ts`, rule in `spec/settings/account` (provider keys).

### 11. MISSING: attaching a file from storage, and cancelling a photo read
- Legacy: `AlphaFiles.storageReadAttachment` (`AlphaFilesPlugin.java:150`; `prototype/attachment-picker.ts:26,204`) and `AlphaMailAttachments.cancelPhotoSelected` (`AlphaMailAttachmentsPlugin.java:84`; `prototype/camera-adapter.ts`).
- Port: removed from Java, the method table and the renderer. Whether another path replaces them (`readSelected`, `cancel`) was not traced; that is the Inbox/Files slice.
- Impact: possibly no way to attach a Files item to mail or chat. Smallest fix: restore, or name the replacement in `spec/files` / `spec/inbox`.

### 12. CHANGED: contact lookups moved off `AlphaTelephony`
- Legacy: `contactForNumber` (PhoneLookup, AP-16 AC-20) and `searchContacts` (`AlphaTelephonyPlugin.java`; four renderer callers).
- Port: removed; `AlphaContacts.resolveNames/list` are the likely replacement (`native-plugins.ts:93-97`). Not verified that the approval card still names the person by Android's own number matching.

### 13. CHANGED: on-device embeddings are switched off on a fresh install
- Port: `NativeRuntimeEmbeddings` looks for the model at `files/.eliza/local-inference/models/bge-small-en-v1.5-f16.gguf` (`runtime/NativeRuntimeEmbeddings.java:26,54-57`), which the legacy service populated. `AlphaInferenceHost` now installs it under `files/alpha-agent-host/state/local-inference/models/` (`AlphaInferenceHost.java:27,30-34`). On a fresh install the launch environment therefore says `ELIZA_DISABLE_LOCAL_EMBEDDINGS=true`, while `host.json` says `"embeddings": "local"`.
- Impact: unverified which setting the new agent obeys; either memory runs without embeddings or the two disagree by install age. Fix: point `LOCAL_MODEL_PATH` at the installed model or drop the env pair.

### 14. KNOWN, extended: test source sets reference removed APIs
Open-items bullet "Some androidTest files still call `AlphaConnection.secureWrite`/`secureRemove`". The full list is longer:
- `secureWrite`/`secureRemove`: 10 androidTest files (`InboxFixtureConnection`, `BrowserReadingFixture`, `LargeInboxAttachment…`, `InboxDraft…`, `NotesStorageDurability…`, `HostedResultNotice…`, `WorkflowPhoneNative…`, `WorkflowDraftNative…`, `BrowserReadingLive…`, `ConnectionInstrumentedTest`).
- Upstream signature changes: `ScopedCalendarDeletionInstrumentedTest.java:43` (4-argument `DeferredDeletionJournal.stage`, now 5); `NativeVoiceLatencyInstrumentedTest.java:121,234` (`LiveVoiceCapture.Sink` is now `LiveCaptureController.Sink`; `new SpeechOutputWarmup(int)` now takes four arguments).
- Classes that only the legacy generated host supplied: `ResidentWorkflowCrashInstrumentedTest.java:90-91,258,277` (`DeviceRamTierPolicy`, `WorkflowSurvivorInventory`; neither exists in `eliza-vs/packages/os`).
- Tests that drive `AlphaLocalAgent` `"start"`: `ResidentTestFixture`, `ResidentWorkflowCrashInstrumentedTest`, `CalendarAvailability…`, `CalendarAgentCrud…`, `WorkflowPhoneNative…`, `BrowserFlow…`.
- Impact: `androidTest` (182 files) does not compile, so no instrumented evidence exists for the port.

### 15. KNOWN, extended: `host.json` routes and `policy.json` actions
Open-items "Best-effort and unbuilt: … `host.json` route lists (about 160) and the `policy.json` action allowlist". Specifics found:
- Covered: every route of the legacy owner route table (`apps/app/src/product/owner-route-table.ts`) and all 43 agent paths the port's renderer uses are in `host.json`. `routes` and `nativeRoutes` differ only by `PUT /api/host/cloud-credential` (native only).
- Legacy agent paths with no `host.json` route: `/api/views/renderer-channel` (`runtime/local-agent.ts:145`), `/api/asr/libelizainference` and `/status` (`:350`), `/api/asr/cloud` (`:373`), `/api/tts/cloud` (`:389`), `/api/tts/paradee` (`:421`), `/api/notifications?category=reminder&unreadOnly=…` (`runtime/owner-reminder-notification-protocol.ts:5-6`; `host.json` pins `nativeTransport=true`), `/api/auth/logout` (`remote-protocol.ts:266`). Development only: `/api/workflow/hosted/tick`, `/api/views/voice-channel`. Each needs a statement of what replaced it (event topics, `AlphaVoiceCloud`) or a route.
- `policy.json` is an allowlist (`eliza-vs/packages/agent/src/host/process.vibe:239`). Names legacy code depends on that are absent: `VIEWS` (`runtime/local-agent-stream.ts:15`, "Open Messages / Camera / Contacts" in `scripts/eval-phone-actions.ts:100-102`) and `OWNER_ROUTINES` (`runtime/automations-protocol.ts:90`), although `host.json` exposes the routines routes. `host.json` sets `"google": {"gmailChanges": false, "calendarEdits": false}` statically while Alpha still passes the owner's switches file (`ALPHA_GOOGLE_AGENT_ACCESS_FILE`); which wins is unverified.

### 16. KNOWN: headers dropped on the native channel
Open-items "The native channel takes no headers". Concrete case: `ResidentResultSession.java:88` still builds `X-Eliza-Device-Id/Key/Capabilities` for `/api/workflow/*`; `ElizaAgentService.exchange` (`:237-249`) sends method, path and body only. The legacy `X-Eliza-Trace-Id` check for voice turns went with `requestStream`.

### 17. KNOWN: paired voice
`pairedVoiceStatus`, `pairedTranscriptionStatus`, `transcribePairedRecording`, `synthesizePaired` removed from `AlphaVoiceCloudPlugin`; `PairedSpeechContract`, `PairedAgentCredential`, `HostedTransport` kept (open-items, Owner decisions and "#1422 retirement").

### 18. KNOWN: secure slots
Open-items "ElizaSecureStore must accept…". Confirmed in code: slot store moved to upstream `SecureSlots` in `noBackupFiles/alpha-secure-slots` with a new Keystore alias (`ElizaSecureStorePlugin.java:35-36`); legacy slots are adopted lazily and only when they match `LEGACY_EXCHANGEABLE` (`RendererCredentialSlots.java:42-53,111-113`). The legacy `cloud-delegation:v1:<sha>` record is deliberately not adopted (os refuses the namespace; the port uses `account-delegation:v1:`), so a delegation in flight at update time is lost.

### 19. KNOWN / UNMODELED: no spec for the new native hosts
Open-items "Java-side host models are missing". Also without any rule in `apps/app/spec`: `WorkflowBridgeHost` and its socket `<package>.workflow.v1`, `AlphaInferenceHost`, `DeviceExecutionJournal` (`device-execution` slot), `ClockReviewMarks` (`clock-agent-review`), the `alpha-legacy-slots:v1` record, and `Agent.keyguard` / `keyguardChanged` (searched each name under `apps/app/spec`: 0 files). `consumer-host.json` `residentSockets` lists agent, inference and secureStore but not the workflow socket, and is no longer read by the generator.

### 20. CHANGED: qualified host pins bumped without requalification
`voice-host/qualified-voice-host.json` and `embedding-host/qualified-host.json` change only `forkPin` (`6337fd4c…` to `5c5d6163…`); every recorded hash is unchanged. `product.gradle` runs `stage-embedding-host.ts --verify` and `voice-host.ts --verify` before each build. Unverified whether the staged binaries were rebuilt at the new pin.

### 21. CHANGED: smaller manifest and service differences
- Foreground-service subtype text changes from "User-started local personal agent runtime" (`alpha-develop/.../AndroidManifest.xml:90-92`) to upstream's `on-device-agent` (`android-host.vibe:61`); the service entry itself is now generated from `host.json` `service`.
- New `wifi` module and `WiFiPlugin` registration (`MainActivity.java:391`); its `CHANGE_NETWORK_STATE` is stripped by the generator because Alpha's manifest does not request it (`android-host.vibe:421-430`, permission removals), so a reviewed join may fail. New feature, not legacy.
- `AlphaVoiceCloud.cloudVoiceTiming` and `AlphaNoteAudio.migrationStatus` removed; no legacy renderer caller found. `AlphaHostedResults.setBackgroundPolling` removed; the port keeps `configureBackground`/`disableBackground`, and `HostedDelivery.polling` has no caller left.
- `product.gradle` drops the `verifyNativeGoogleHost` pre-build check (`bun scripts/runtime-profile.ts --verify-native`, legacy lines 87-93) with no replacement.

### 22. UNVERIFIED: release minification
`proguard-rules.pro` is unchanged and still keeps legacy generated classes by name (`ElizaTasksWorker`, `ElizaVoiceNative`, `ElizaBionicInferenceServer`, `BionicDecodeLoop`, `BgeEmbeddingSession`), which no longer exist. Their upstream successors live in `ai.eliza.os.agent.inference` and `ai.eliza.voice`, outside the `ai.eliza.plugins.**` keep. Whether native code calls back into them by name was not checked; `agent-service` ships no consumer rules.

### 23. UNVERIFIED: AOSP image
The agent socket stays a filesystem socket under `files/ipc` and `aosp/launcher-policy/alpha_launcher_agent_ipc.te` is unchanged, so #1272 should hold. The new abstract socket `<package>.workflow.v1` under the privileged-app domain needs a real image boot.

### RETIRED
- `android/upstream-native-sources.json` and `scripts/prepare-patched-native.ts` staging: replaced by schema-2 `osModules` (description in `alpha-vs/android/consumer-host.json:9`). Deliberate.

## Confirmed OK

| Behaviour | Legacy | Port evidence |
|---|---|---|
| Main manifest: permissions, queries, components, intent filters, App Links, providers, receivers | `app/src/main/AndroidManifest.xml` | Identical except the agent `<service>`, now generated from `agent/host.json` `service` (`android-host.vibe:150-152`) |
| Roles: HOME, dialer, SMS, InCallService, WAP push | `app/src/launcher/AndroidManifest.xml` | Byte-identical |
| Every manifest component resolves to a class | n/a | 25 main + 18 launcher components found in `alpha-vs/android` or `eliza-vs/packages/os/android` |
| App id and installed identity | `app.config.json`, `consumer-host.json:3-8` | `ai.alphacompute.alphaphone`; `installedIdentities` unchanged; `host.json` service in the same package |
| Flavors, build types, signing and version env names | `consumer-host.json` | One `launcher` flavor in both trees; release arm64-v8a, shrink, signing `ELIZAOS_KEYSTORE_*`, `ELIZAOS_VERSION_CODE/NAME` unchanged |
| Update / OTA install and update pause | `AlphaDevicePlugin.java`, `UpdateConfirmationReceipt.java` | Import rename only; `RuntimeUpdatePause.beforeStart` kept in `ElizaAgentService.java:84,98` |
| Cloud sign-in and credential custody | `AlphaCloudSignInClient/Plugin`, `AlphaBillingAuthorityPlugin`, `ResetBeforeDispatch` | Import rename only; `AlphaCredentialStore` adds a slot limit and a credential-changed signal |
| `cloud/*` (11 classes) | `eliza-develop/packages/auth/android` | Verbatim copies (1 to 3 header lines differ) |
| `runtime/*` (7) and `connection/*` (5) | `eliza-develop/plugins/plugin-native-agent` | Verbatim copies |
| All `import ai.eliza.*` resolve | n/a | 154 upstream classes, all in modules listed in `osModules`; 114 byte-identical to the legacy pin |
| `ElizaAgentService` against upstream `AgentService` | generated service | Every call checked: `useCredentials`, `observe`, `start/stop/status`, `request`, `requestStream`, `subscribe`, `reviewRecovery/archiveRecovery`, `LaunchRefused`, `AgentChannel.Call/Listener`, `ChannelPolicy.Topic/OutcomeKind` |
| Launch variables accepted by upstream | `configureEnvironment` | None matches `RESERVED` (`AgentService.java:77`); `host.json` has no `environment` to collide with |
| Renderer plugin table against native plugins | n/a | `native-plugins.ts`: 41 plugins, every listed method exists (Java, or Kotlin for ElizaSystem) |
| `host.json` covers the port renderer and the legacy owner table | `owner-route-table.ts` | See gap 15 |
| Secure slot policy API | `SecureSlotPolicy` (plugin-native-agent) | `parse/rule/admits/within` match upstream; Integer budgets accepted (`SecureSlotPolicy.java:137-142`), resolving that open-items "unverified" bullet |
| `SecureSlots` API used by `ElizaSecureStorePlugin` | n/a | Constructor, `read/write/remove/compareAndExchange/ensureAvailable`, `Reading` records match |
| Shared-UI override wiring | `product.gradle` | Unchanged; module names match `eliza-<module>` |
| Cloud speech stream subclass | `AlphaVoiceCloudPlugin.Streaming` | Overrides match upstream abstract hooks; `cloudStreamTiming` and `retireSpeechAuthority` exist upstream |
| Native voice transport | `openNativeVoiceTransport` | Returns `LiveSegmentPipe.Transport`; upstream `ResidentRoute.open()` returns the same |
| Deferred deletion coordinator | `NativeDeletionCoordinator` | Adapted to the new constructor (`Records`), `ThreadDeletion`, `VoicemailStore.dispatchDeletion`, `ContactsEditor.dispatchRemoval` all exist |
| `workflowPresentationCapabilities` | upstream at legacy pin | Exists upstream, protocol 2 at both pins (answers the open-items "Native" bullet) |
| Agent socket and image policy | #1272 | Filesystem socket in `files/ipc` in both; `.te` unchanged |

## Not covered

- Line-by-line behaviour of `AlphaActionJournalPlugin` (104 changed lines), `AlphaNotificationsPlugin` (79), `AlphaTelephonyBase` (78), `AlphaFilesPlugin` (29), `AlphaPhotosPlugin.reviewRemovedVideoCopy`, `DeviceExecutionJournal`, `ClockReviewMarks`. Read for imports and method tables only.
- Method-level compatibility of the ~380 unchanged Alpha files with the 33 upstream classes whose source changed between pins. Only public signature removals were compared; changed return types, package-private members and Kotlin plugins (system, camera, location, wifi, network-policy) were not.
- `sense/`, `sense-speech/`, `notification-fixture/`, `video-fixture/` against the changed upstream sense and media sources (`ListenerPolicy`, `IndicatorLease`, `VideoCopyEdits`).
- Scripts behind the build: `scripts/android-identity.ts` identity projection (`.eliza-consumer-profile.json`, `android-identity.json`), `stage-agent-runtime.ts` payload layout against upstream `PayloadCheck`, `build-android.ts`, `verify-apks.ts`, the production-bundle audit.
- `policy.json` names against each upstream package's registered actions and the plugin load order; `host.json` query and body rules route by route under `RouteGate`.
- Upstream `ElizaCloud` device route table against legacy `ConnectionRoutes.managedService`, route by route. Seen in passing: no `/api/v1/credits/checkout`, no `calendar/sync-v1/*`, and `voice/speech/*` in place of `voice/session/{health,read-aloud,transcribe}`.
- Whether the `.eliza` PGlite data could be read by the new agent (gap 1).
- Anything needing a build: manifest merger result (gap 5), R8 (gap 22), an emulator HOME-role run, an AOSP image boot (gap 23).
