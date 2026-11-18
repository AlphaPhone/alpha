# B4 migration map: Java shared helpers

The new files are `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaUtil.java` and `Slots.java`. They are in the
root package (R3) and use only the JDK, so a host javac harness compiles them without Android stubs. Stage C implementers
apply the rows below in the files they own. Line numbers are from the tree at B4 time, so re-find each site by its
content. Paths are relative to `android/app/src/main/java/ai/alphacompute/alphaphone/`.

Every harness or javac host test that compiles a migrated file must add `AlphaUtil.java` (and `Slots.java` where used) to
its source list. The pins for each group are listed with it.

## Notes that apply to every row

- **Null input.** `AlphaUtil.is*` returns `false` for `null`. A site written as `x.matches(...)` with no null check
  throws `NullPointerException` today. Where the row says "null: NPE→false", check that the false branch produces the
  same outcome (usually the same rejection). If it doesn't, keep an explicit `x==null` check or `Objects.requireNonNull`.
- **Digest failure type.** `AlphaUtil.sha256()` and `sha256Hex(...)` throw `IllegalStateException` if SHA-256 is
  missing, which never happens on Android. Sites that wrapped the error as `IOException` or `IllegalArgumentException`
  stop doing so. Wrappers that also cover other failures (for example `GoogleWorkspaceReturnFlow.credentialHash`'s
  `catch(Exception)` around JSON parsing) stay as they are.
- **Name shadowing.** Inside the body of an anonymous `RecordingStore.Slots` (`AlphaNoteAudioPlugin.java:38`) or
  `DeferredDeletionCoordinator.Slots` (`NativeDeletionCoordinator.java:26`), the simple name `Slots` means the inherited
  nested type. Inside those bodies, write `ai.alphacompute.alphaphone.Slots.X` or hoist the constant outside the body.

## J1. SHA-256 and hex → `AlphaUtil.sha256Hex` / `hex` / `sha256()`

| site | today | replacement | notes |
|---|---|---|---|
| `HostedResultNotices.java:31` `static String hash(String)` | `%02x` loop | delete `hash`; callers use `AlphaUtil.sha256Hex(value)` | It is used in 11 files (24 calls): `AlphaCanonicalNotifications:99`, `CalendarSyncBridge:64`, `AlphaLocalAgentPlugin:1111`, `HostedDelivery:25(×2),49,57`, `NativeOwnerReminderHost:37`, `NativeDeviceEnrollmentKey:22`, `NativeNotificationSession:44,73`, `ResidentResultSession:19,31(×3),32,35,37,40,61,76`, `HostedTransport:21,27`, `NativeDigestSources:47,54,62`, `SourceRenewalNotices:26`, and in-file `HostedResultNotices:37,53,83,99`. Pins: `test/fixtures/HostedResultNoticesTest.java`, `HostedNoticeWithdrawTest.java`, `NativeDigestSourcesTest.java`, `NativeNotificationSessionTest.java`, `ResidentDeliveryTest.java`, `ResidentResultTransportTest.java`, the Quint `HostedInboxTraces.java`, `HostedResultNoticeTraces.java`, `NativeDigestTraces.java`, `SourceRenewalTraces.java`, `hosted-result-notices.mjs`, `source-renewal.mjs`, `resident-coordinator.mjs`, and `scripts/test-android-notification-device-slot.ts`. |
| `CalendarSyncBridge.java:64` `digest(Object)` | `HostedResultNotices.hash(value.toString())` | `AlphaUtil.sha256Hex(value.toString())`, then inline or delete `digest` | |
| `AlphaCredentialStore.java:159-160` (`providerBindingGuard`) | `%02x` loop | `return AlphaUtil.sha256Hex(value);` | |
| `CalendarSyncSnapshot.java:140` `digest(String)` | `%02x` loop | `AlphaUtil.sha256Hex(input)`, delete `digest` and the `MessageDigest` import | |
| `GoogleWorkspaceReturnFlow.java:33-36` (`credentialHash`) | `Character.forDigit` loop | `return AlphaUtil.sha256Hex(canonical);` inside the existing `try` | The `catch(Exception)`→`IllegalArgumentException` stays, because it also covers JSON errors. Delete the `MessageDigest` import. |
| `AlphaDevicePlugin.java:212-216` `assetSha256` | stream, 64 KiB | `try(InputStream in=…open(asset)){return AlphaUtil.sha256Hex(in);}catch(Exception absent){return null;}` | Same buffer size. |
| `AlphaDevicePlugin.java:322-326` `UpdatePause.digest(path)` | stream, 64 KiB | `try(InputStream in=new FileInputStream(path)){return AlphaUtil.sha256Hex(in);}` | |
| `AlphaDevicePlugin.java:240` `static String hex(byte[])` | `BigInteger %064x` | delete; callers use `AlphaUtil.hex` | Output is identical for 32-byte digests (checked). Pins: `test/fixtures/UpdateDownloadTest.java`, Quint `RuntimeUpdatePauseTraces.java`, `UpdateStagingHarness.java` and `resident-platform.mjs` if they call `AlphaDevicePlugin.hex`. |
| `AlphaDevicePlugin.java:244-255` `copyVerified` | own `MessageDigest` | `MessageDigest digest=AlphaUtil.sha256();` and `AlphaUtil.hex(digest.digest())` | The `NoSuchAlgorithmException`→`IOException` wrap goes away. The method stays local (size cap, deadline, interrupt). |
| `AlphaDevicePlugin.java:285` `signingRoot` | `hex(MessageDigest…digest(bytes))` | `AlphaUtil.sha256Hex(history[0].toByteArray())` | |
| `WorkflowWorkerAssets.java:26-27` `hex`, `digest()` | `%02x`, wrap as `IOException` | delete both; `AlphaUtil.hex`, `AlphaUtil.sha256()` at `:66` and `:99` | The verify loops stay local (byte cap and zero-read handling). Pin: `test/workflow-worker-assets.test.mjs`. |
| `AlphaMailAttachmentsPlugin.java:54` `hash(byte[])` | upstream `DocumentBytes.sha256` | inline `DocumentBytes.sha256(bytes)` (D4) or use `AlphaUtil.sha256Hex(bytes)` | Same output either way. |
| `release/DataIntegrityProvider.java:86` | `Character.forDigit` | **keep** | Separate module (`release/`). Pin: `pilot-update-export.test.mjs`. |

## J2. Identifier checks → `AlphaUtil.is*` and the regex constants

Regex-string sites (`field(value, regex)`, `matches(CONST)`, regexes built into a longer pattern) use the `String`
constants `AlphaUtil.SHA256_HEX`, `OPERATION_ID`, `OPAQUE_ID`, `UUID_CANONICAL` and `OPAQUE_36`. Every constant
equals the literal it replaces, byte for byte (checked).

| site | today | replacement | null |
|---|---|---|---|
| `AlphaActionJournal.java:76` | `getString("revision").matches("[a-f0-9]{64}")` | `AlphaUtil.isSha256Hex(...)` | already `instanceof String` checked |
| `AlphaActionJournalPlugin.java:89,126` | `field(..,"[a-f0-9]{64}")`, `field(..,"[A-Za-z0-9_-]{1,128}")` ×2 | `field(..,AlphaUtil.SHA256_HEX)`, `field(..,AlphaUtil.OPERATION_ID)` | unchanged |
| `AlphaActionJournalPlugin.java:114` | `field(..,"[A-Za-z0-9_-]{1,128}")` | `AlphaUtil.OPERATION_ID` | unchanged |
| `AlphaCanonicalNotifications.java:60` | `value.matches("[a-f0-9]{64}")` (`optString`, never null) | `AlphaUtil.isSha256Hex(value)` | n/a |
| `AlphaCredentialStore.java:166` | `guard==null\|\|!guard.matches(..64)` | `!AlphaUtil.isSha256Hex(guard)` | same |
| `AlphaDevicePlugin.java:245` | `sha256==null\|\|!sha256.matches("[0-9a-f]{64}")` | `!AlphaUtil.isSha256Hex(sha256)` | same (`[0-9a-f]`=`[a-f0-9]`) |
| `AlphaDevicePlugin.java:293` | `UPDATE_BINDING` pattern | **keep**, or build it with `AlphaUtil.SHA256_HEX` | n/a |
| `AlphaLocalAgentPlugin.java:425` | `!guard.matches(..64)` | `!AlphaUtil.isSha256Hex(guard)` | NPE→false (rejects either way; check) |
| `AlphaLocalAgentPlugin.java:1063,1077` | `old/prior.matches(..64)` (`optString`) | `AlphaUtil.isSha256Hex(..)` | n/a |
| `AlphaNoteRecorder.java:132` `validOwner` | null check plus matches | `AlphaUtil.isSha256Hex(value)`; inline `validOwner` | same |
| `CalendarSyncBridge.java:187` | `getString(..,"")` matches 64 | `AlphaUtil.isSha256Hex` | n/a |
| `HostedDelivery.java:57`, `NativeOwnerReminderHost.java:84`, `ResidentResultSession.java:77` | `key.matches(..64)` and `installationId.matches("[a-f0-9-]{36}")` | `AlphaUtil.isSha256Hex(key)`, `AlphaUtil.isOpaque36(id)` | `getString` never returns null; `NativeOwnerReminderHost` locals: check |
| `HostedResultNotices.java:29,80,90` | 64-hex scope/key (29, 80, 90 null-checked) | `AlphaUtil.isSha256Hex` | same |
| `HostedResultNotices.java:37` | `scope.matches(64)`, `run.matches(OPAQUE)` | `isSha256Hex`, `isOpaqueId` | NPE→false (check) |
| `HostedResultNotices.java:20,82`, `HostedInbox.java:16` | null check plus `[A-Za-z0-9][A-Za-z0-9_-]{0,127}` | `!AlphaUtil.isOpaqueId(value)` | same |
| `NativeDigestSources.java:39` | `revision.matches(..64)` | `AlphaUtil.isSha256Hex(revision)` | NPE→false (check) |
| `WorkflowWorkerAssets.java:41` | `fields[0].matches(..64)` | `AlphaUtil.isSha256Hex(fields[0])` | n/a |
| `RendererCredentialSlots.java:26-30` | `"<ns>:v1:[a-f0-9]{64}"` | `"<ns>:v1:"+AlphaUtil.SHA256_HEX`; use `Slots.*_PATTERN` for the three in Slots | n/a |
| `AlphaCredentialStore.java:48-51` | slot-cap regexes | `name.matches(Slots.INBOX_OPERATION_PATTERN)` and the others | n/a |
| `AlphaCalendarPlugin.java:68` | `id.matches("[A-Za-z0-9_-]{1,128}")` (`getString(..,"")`) | `AlphaUtil.isOperationId(id)` | n/a |
| `GoogleWorkspaceReturn.java:67` | null check plus `{1,128}` | `!AlphaUtil.isOperationId(connectionId)` | same |
| `HostedTransport.java:47`, `ResidentResultTransport.java:57` | path regex `…clientId=[A-Za-z0-9_-]{1,128}` | `"…clientId="+AlphaUtil.OPERATION_ID` (optional) | n/a |
| `AlphaNoteRecorder.java:55` `ID` | UUID regex string | delete `ID`; `AlphaUtil.isUuid(x)` at `AlphaNoteRecorder:92` and `AlphaVoiceCloudPlugin:98` | `:98` checks null first |
| `AlphaNoteAudioPlugin.java:71` `OPERATION` | UUID regex string | delete; `AlphaUtil.isUuid(operation)` at `:162` | check `:162` operand |
| `AlphaLocalAgentPlugin.java:910,1298` | `[a-f0-9]{8}-…{12}` | `AlphaUtil.isUuid(..)` | `:910` checks null first; `:1298` check |
| `NativeNotificationSession.java:24` | `(?:-…){3}` UUID form | `AlphaUtil.isUuid((String)raw)` | `instanceof` checked |
| `AlphaLocalAgentPlugin.java:762,769,878` | `requestId.matches("[a-f0-9-]{36}")` | `AlphaUtil.isOpaque36(requestId)` | 762/769 null-allowed branches stay explicit |
| `CalendarSyncSnapshot.java:34`, `HostedDelivery.java:45` | `[a-f0-9-]{36}` | `AlphaUtil.isOpaque36` | same (null-checked) |
| `CalendarSyncBridge.java:115` | `!UUID.fromString(marker).toString().equals(marker)` → `IllegalStateException`, but an unparsable marker throws `IllegalArgumentException` from `fromString` | `!AlphaUtil.isUuid(marker)` **only if** the `IllegalArgumentException` outcome may become the `IllegalStateException("…needs recovery")` outcome. That is a behaviour change, so check the caller's catch. Otherwise keep. | |
| `PairedSpeechContract.java:9` | `fromString(..).equals` inside `try` that maps every failure the same way | `if(!AlphaUtil.isUuid(value))throw new IllegalArgumentException()` | same outcome |
| `AlphaConnectionPlugin.java:219` | `equalsIgnoreCase` (accepts upper case) | **keep**; `isUuid` is lower-case only | |

## J3. Bounded reads → `AlphaUtil.readBounded(in, limit, message)`

The helper throws `IOException(message)` when the total read exceeds `limit`, independent of buffer size (checked). A
zero-length read becomes a single-byte read, as in `WorkflowWorkerAssets`. For conforming streams this changes nothing.

| site | replacement |
|---|---|
| `AlphaDevicePlugin.java:203-204` (`alpha-source.json`, 64 KiB, `new IOException()`) | `new String(AlphaUtil.readBounded(in,64*1024,null),UTF_8)` |
| `AlphaLocalAgentPlugin.java:597-601` (`configureNativeViews`, 16384) | `new String(AlphaUtil.readBounded(policy,16384,"Native view launch policy is too large"),UTF_8)` |
| `AlphaNoteRecorder.java:121-125` `readJournal` (`MAX_JOURNAL_BYTES`) | `AlphaUtil.readBounded(in,MAX_JOURNAL_BYTES,"Recording index is too large")`, if `MAX_JOURNAL_BYTES` is an `int` (cast if `long`) |
| `AlphaVoiceCloudPlugin.java:164` (`limitOf`, 16384, caught) | `body=new String(AlphaUtil.readBounded(in,16384,null),UTF_8)` |
| `WorkflowWorkerAssets.java:28-32` `bounded` (`MAX_INDEX`) | `AlphaUtil.readBounded(input,MAX_INDEX,"Worker index too large")`; delete `bounded` |
| `HostedTransport.java:30`, `KeyboardDictationCloud.java:93-97`, `AlphaMapsTransportPlugin.java:58-59` | **keep**: each checks a cancel flag, guard or deadline per chunk |

## J4. Executor refusal → `AlphaUtil.submit`

`AlphaUtil.submit` is `PluginWorkers.submit` copied verbatim. Replace all 45 `PluginWorkers.submit(` calls
(`AlphaActionJournalPlugin`, `AlphaConnectionPlugin`, `AlphaDevicePlugin`, `AlphaFilesPlugin`, `AlphaLocalAgentPlugin`,
`AlphaMapsTransportPlugin`, `AlphaMailAttachmentsPlugin`, `AlphaNoteDocumentsPlugin`, `AlphaGmailPlugin`,
`AlphaHostedResultsPlugin`, `AlphaNoteAudioPlugin`, `DailyAppsPlugin`; `git grep -n "PluginWorkers.submit"`), then
delete `PluginWorkers.java`. Pins: `test/fixtures/PluginWorkersTest.java`, `test/plugin-worker-guard.test.mjs`,
`native-plugin-teardown`, `native-request-cancel`, `native-resident-request-deadline`, `native-stream-admission`,
`native-voice-event-worker`, `app-update`, `device-plugin-diagnostics`, `files-storage-refusal` tests,
`specs/quint/native/manifest.json` (6 entries), and the Quint source lists in `clock-review.mjs`, `crash-journal.mjs`,
`gmail-background-platform.mjs`, `navigation-service.mjs`, `request-withdrawal-platform.mjs`, `update-*.mjs` and
`services/sign-in-coordinator.mjs`. `test/support/feature-parity.mjs:149` lists the file. Raw
`catch(RejectedExecutionException)` sites (`AlphaCalendarPlugin:79`, `AlphaDeletionsPlugin:18,32,49,66`,
`AlphaGmailPlugin:33,34`, `AlphaKeyboardDictationService:176`, `CalendarScopedDeletionReview:52,60`,
`CalendarSyncBridge:155`) can use `AlphaUtil.submit` where the refusal is a plain `Runnable`. Keep
`AlphaMapsTransportPlugin:65` (`schedule` on a `ScheduledExecutorService`).

## J7. Guard interfaces → `AlphaUtil.Guard`

Same signature `void check()throws Exception`, so a lambda converts without change.
- `NativeDigestSources.Guard` (`:15`; used at `HostedDelivery:30,37`, `NativeDigestHost:12,23`)
- `HostedTransport.Guard` (`:11`; `HostedDelivery:16`)
- `HostedInbox.Fence` (`:11`)
- `ResidentCredentialShutdownRetry.Guard` (`:5`)
- `ResidentResultSession.Guard` (`:14`)

Delete each nested interface and write `AlphaUtil.Guard`. Pins: `test/fixtures/ResidentCredentialShutdownRetryTest.java:4`,
`ResidentResultTransportTest.java:87`, `specs/quint/refinement/native/native-digest-platform.mjs:80` and any
`*Traces.java` that names the nested types (`git grep -n "\.Guard\b\|\.Fence\b" -- test specs`).
`AlphaCanonicalNotifications.ForegroundCheck` (`void current()`) needs its method renamed as well, so convert it only if
that file's owner wants to. Leave `SourceRenewalNotices.Guard` alone, because it has a different shape.

## J8. Slot names → `Slots`

| constant | value | sites |
|---|---|---|
| `Slots.CLOUD_PRODUCTION` | `cloud:production` | `AlphaConnectionPlugin:64,90,115`, `AlphaCredentialStore:79,105,113,141,161,169,182,204,206,260,271`, `AlphaLocalAgentPlugin:191,313,316,461,474,502,547,646,658`, `CalendarSyncBridge:74,100,103,119`, `GmailBackground:25`, `KeyboardDictationCloud:48`, `RendererCredentialSlots:33`. Leave `CloudDeployment.java` alone: it is generated by `scripts/cloud-deployment.ts`. |
| `Slots.CLOUD_STAGING` | `cloud:staging` | `AlphaCredentialStore:79,182`, `RendererCredentialSlots:33` |
| `Slots.CLOUD_PREFIX` | `cloud:` | `AlphaCredentialStore:97,187`, `AlphaVoiceCloudPlugin:196,339`, `HostedDelivery:51`, `PairedAgentCredential:26`, `AlphaCloudSignInPlugin:33` (`credentialSlotPrefix`). Not `CloudDeployment` (generated). |
| `Slots.LOCAL_AGENT_PROVIDER` | `local-agent-provider:v1` | `LocalAgentProviderAdmission:5` becomes `PROVIDER_SLOT=Slots.LOCAL_AGENT_PROVIDER` (the name stays: `ServiceCredentialTraces.java` and `power-cold-native-pin.test.mjs` pin it). Literal sites: `AlphaLocalAgentPlugin:190,358,460,644`, `AlphaVoiceCloudPlugin:52,249,254,338`, `KeyboardDictationCloud:33,51`. |
| `Slots.GMAIL_BACKGROUND` | `gmail-background:v1` | `GmailBackground:11` (`SLOT=Slots.GMAIL_BACKGROUND`, keep the name for `GmailBackgroundLockContentionTest`), `AlphaCredentialStore:36` |
| `Slots.NATIVE_CALENDAR_SYNC` | `native-calendar-sync:v1` | `CalendarSyncBridge:22` (`SLOT=…`, name pinned by `CalendarSyncEnableTraces.java`), `AlphaCredentialStore:37` |
| `Slots.NATIVE_DELETE_JOURNAL` | `native-delete-journal:v1` | `NativeDeletionCoordinator:18`, `AlphaCredentialStore:37` |
| `Slots.SMS_SEND_LEDGER` | `sms-send-ledger:v1:device` | `AlphaTelephony:23`, `AlphaCredentialStore:35` |
| `Slots.HOSTED_DIGESTS_PREFIX` | `hosted-digests:v1:` | `HostedResultNotices:38`, `HostedInbox:26`, `HostedDelivery:67` |
| `Slots.NOTES_RECORDS` / `NOTES_TRASH` / `NOTES_DRAFT` / `NOTE_ORIGINS` / `NOTES_FOLDERS` | `notes-…:v1:device` | `AlphaCredentialStore:15-22` (the `AlphaCredentialStore.NOTES_*` names stay as aliases, or callers repoint: `NotesStorageDurabilityInstrumentedTest:50,168`, `native-secure-slots.test.mjs:27,167-168`), `AlphaNoteAudioPlugin:67`, `RendererCredentialSlots:28-29` |
| `Slots.NOTES_AUDIO_DELETIONS` | `notes-audio-deletions:v1:device` | `AlphaCredentialStore:38`, `AlphaNoteAudioPlugin:67`, `RendererCredentialSlots:29` |
| `Slots.NOTE_AUDIO_METADATA_PREFIX` | `note-audio-metadata:v1:` | `AlphaNoteAudioPlugin:40` (inside a `RecordingStore.Slots` anonymous body, see the shadowing note), `AlphaCredentialStore:39` (`Slots.NOTE_AUDIO_METADATA_PREFIX+"[A-Za-z0-9_-]{1,100}"`) |
| `Slots.INBOX_DRAFTS_PREFIX` | `inbox-drafts:v1:` | `AlphaCredentialStore:48` |
| `Slots.INBOX_OPERATION_PATTERN`, `CALENDAR_LINKED_SYNC_PATTERN`, `CONNECTED_READ_CACHE_PATTERN` | `…:v1:[a-f0-9]{64}` | `AlphaCredentialStore:48-51`, `RendererCredentialSlots:26-27` |

## J9. Connection setup → `AlphaUtil.noCache(connection, connectMs, readMs)`

The helper sets no redirects, no caches and both timeouts, then returns the same connection (it is generic, so
`HttpsURLConnection` stays typed).

| site | replacement |
|---|---|
| `AlphaConnectionPlugin.java:226-229` `readCloudObject` | `noCache((HttpURLConnection)…openConnection(),timeoutMs,timeoutMs)` |
| `AlphaConnectionPlugin.java:294-296` | `noCache(connection,20000,operation==RequestOperation.CLI_POLL?30000:120000)` |
| `AlphaMapsTransportPlugin.java:52-53` | `noCache(connection,10000,15000)`, then the two headers |
| `AlphaVoiceCloudPlugin.java:206-207`, `:280-281` | `noCache(c,20000,120000)` |
| `HostedTransport.java:26` | `noCache(c,timeout,timeout)` (the connection comes from `connections.open`) |
| `KeyboardDictationCloud.java:81-82` | `noCache(request,20000,60000)` |
| `AlphaDevicePlugin.java:662` `updateConnection` | **keep**: it follows HTTPS redirects on purpose and doesn't disable them |

## J10. Diagnostics

- `AlphaUtil.httpStatus(status)` replaces `status>=100&&status<=599?status:0` at `NativeNotificationDiagnostics.java:23`
  and `AlphaLocalAgentPlugin.java:28` (`ResidentAttachDiagnostic.response`).
- The exception family has no shared helper. The two `NativeNotificationDiagnostics` copies (`:7`, `:12`) are identical
  and live in one file, so merge them into a private method there. `AlphaLocalAgentPlugin`'s `ResidentAttachDiagnostic`
  writes a different vocabulary (`SocketTimeoutException`, …) and stays separate.
