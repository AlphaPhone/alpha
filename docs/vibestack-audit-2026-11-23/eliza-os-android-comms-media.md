# eliza-os-android-comms-media: develop -> vibestack parity

Trees: develop `eliza-develop` 7a124190a1; vibestack `eliza-vs` 769b4f00d (branch vibestack-dp);
consumer `alpha-vs` 3d7ca9727, legacy consumer `alpha-develop` dd63c6bc6.
Paths below are relative to those trees (`dev:` = eliza-develop, `vs:` = eliza-vs).
Read-only audit: nothing was built, installed or run.

## Summary

- Items checked: 82. OK 49, NOT_APPLICABLE 14, gaps 19 (0 high, 5 medium, 14 low).
- By class: UNVERIFIED 3, UNIMPLEMENTED 1, CHANGED 5, UNMODELED 7, MISSING 3.
- One gap is already named in wave3.md (item D, #39674).
- Verdict: no develop behaviour the phone relied on in this slice was found lost. The Android
  sources are the reason: every file under `plugins/plugin-native-{phone,camera,location,calendar}/android`
  is byte-identical in `packages/os/android/<module>`, and messages, contacts, media, reminders and
  action-journal differ only by additions (Undo-window staging, conversation deletion, contact names,
  recent-calls cursor, removed-video-copy review). The 16 slice PRs that changed Java or the camera
  session since 2026-11-13 are all present.
- What is not proven: the vibestack tree runs none of the Android JVM tests it carries, has no
  conformance driver for any module of this slice, and dropped develop's host-JVM tests for the
  deferred-deletion engine it then changed. Deleting a message, voicemail or contact changed from
  immediate to a 10 second Undo window. Several native behaviours the phone uses every day
  (incoming SMS/MMS storage, visual voicemail client, in-call controls, SIM info) have code but no rule.

## Gaps

### eliza-os-android-comms-media-01 — UNVERIFIED, medium
Behaviour: the Java engines of this slice are checked against their rules on every change.
- Develop: `dev:packages/scripts/quint/check-native-android.ts` ran the Gradle Robolectric suites and
  failed when a named test was missing or skipped: `dev:plugins/plugin-native-phone/quint/native-call-conformance.json:1`
  (27 required tests), `dev:plugins/plugin-native-messages/quint/native-sms-review-conformance.json`
  (extended by #39831), plus case replays `NativeCallRegistry.cases.json`, `NativeMessageDeletion.cases.json`,
  `NativeSmsReviewOwnership.cases.json`, `NativeMessageNotice.cases.json`, `NativeContactEdit.cases.json`,
  `NativePhotosOwnership.cases.json`, `PhotoCopyRecovery.cases.json`, `PhotoCropReceipt.cases.json`.
- Vibestack: the unit tests were carried (`vs:packages/os/android/{phone,messages,contacts,reminders,media}/src/test/java`)
  but nothing runs them: `vs:packages/os/package.json:148` is `vitest run`, `vs:.github/workflows/ci.yml` has
  no Gradle step, and `vs:packages/os/test/drivers/` has drivers for deepLinks, storageWatch, autofill and
  secureStore only, none for `os__android__{phone,messages,contacts,voicemail,deferredDeletion,deletionWindow,camera,reminderAlarms,calendar,media__*}`.
  Not ported at all: `dev:plugins/plugin-native-camera/test/native-host/{CameraPermissionRequestsTest,CaptureAspectRatiosTest}.java`,
  `dev:plugins/plugin-native-media/android/src/test/java/ai/eliza/plugins/media/PdfSourceCopyTest.java` (#39945),
  `dev:plugins/plugin-native-media/test/native-host/selected-documents.node.mjs` (#39948) and the other 12 `*.node.mjs` runners,
  `dev:plugins/plugin-native-calendar/test/jvm/{SelectedCalendarReaderTest,availability/SelectedCalendarAvailabilityTest}.java`,
  `dev:plugins/plugin-native-reminders/test/occurrence.test.mjs`, every `test/android-consumer` suite.
  The porting ledger records #39831 as "replaced by spec conformance drivers"; no such driver exists for messages.
- Impact: Telecom call registry, SMS/MMS journal, contact edits, reminder alarms and photo edits can regress
  upstream without any check failing before Alpha repins.
- Smallest fix: add a `jvm-adapter` driver per module that compiles the module with its `src/test` suite and
  asserts the required test names (the develop manifests are the list), and wire it into `test`.

### eliza-os-android-comms-media-02 — UNVERIFIED, medium
Behaviour: the deferred-deletion (Undo window) coordinator and journal are host-tested.
- Develop: `dev:plugins/plugin-native-action-journal/test/native-host/DeferredDeletionTest.java` (601 lines),
  `ActionJournalTest.java`, `journal.node.mjs`, and `quint/DeletionOwnerAdmission.{qnt,cases.json}` replayed by
  `quint/check-deletion-owner-admission.mjs`.
- Vibestack: `vs:packages/os/android/action-journal/` holds only `src/androidTest/java/example/actionjournal/JournalConsumerTest.java`;
  no file outside `src/main` references `DeferredDeletionCoordinator` or `DeferredDeletionJournal`. The engine was then
  changed: new constructor port `Records`, `stageRecord`, kinds message/thread/voicemail/contact, `journal.stage(id, kind, ...)`
  (`vs:.../deletion/DeferredDeletionCoordinator.java:61-75,90-92,173-185`, `DeferredDeletionJournal.java:117-122`).
  Rules exist (`vs:spec/os/android/deferredDeletion.md:33-294`), TS side is tested (`vs:packages/os/test/bridges/deletion.test.vibe`).
- Impact: this engine now decides whether the owner's texts, conversations, voicemail and contacts are deleted
  or kept; its Java has no upstream test.
- Smallest fix: port `DeferredDeletionTest.java` to `packages/os/test/drivers/java/action-journal`, extend it to the
  four record kinds, and add `os__android__deferredDeletion.ts`.

### eliza-os-android-comms-media-03 — UNIMPLEMENTED, medium
Behaviour: a reviewed Calendar deletion is inspected and dispatched natively.
- Develop: `dev:plugins/plugin-native-calendar/src/android-definitions.ts` declares `remove`;
  `dev:.../calendar/CalendarPlugin.java` implements `remove`.
- Vibestack: rule `vs:spec/os/android/calendar.md:244` and client `vs:packages/os/src/bridges/calendar.vibe:298-323,372`
  call `plugin.inspectDeletion` and `plugin.dispatchDeletion` (`vs:packages/os/src/bridges/definitions/calendar.ts`,
  `AndroidCalendarPlugin`), but `vs:packages/os/android/calendar/src/main/java/ai/eliza/plugins/calendar/CalendarPlugin.java`
  (identical to develop) has neither method; no class under `vs:packages/os/android` defines them for Calendar.
- Impact: none on the phone today (Alpha imports only `readRange` and uses its own `AlphaCalendarPlugin.inspectDeletion`/`removeScoped`,
  `alpha-vs:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCalendarPlugin.java:46-47`). Upstream's own deletion client cannot
  reach any upstream native code.
- Smallest fix: add `inspectDeletion`/`dispatchDeletion` to upstream `CalendarPlugin.java` (or state in the spec that the host supplies them).

### eliza-os-android-comms-media-04 — CHANGED, medium
Behaviour: deleting one text, one voicemail or one contact.
- Develop: immediate. `dev:plugins/plugin-native-messages/android/src/main/java/ai/eliza/plugins/messages/TelephonyPlugin.java:560-569`
  (`MessageDeletion.delete`, status `deleted`), `:698-702` (`VoicemailStore.delete`, boolean), and
  `dev:plugins/plugin-native-contacts/android/src/main/java/ai/eliza/plugins/contacts/AddressBookPlugin.java:340-347` (`ContactsEditor.remove`).
- Vibestack: the call only inspects and stages; the reply is `queued` with a journal row, and the provider is written when the
  10 second window expires. A host without `deletionWindow()` rejects with `unavailable`
  (`vs:.../messages/TelephonyPlugin.java:83-92,591-605,759-771`, `vs:.../contacts/AddressBookPlugin.java:68-77,356-378`,
  `vs:.../messages/MessageDeletion.java:79-114`). Rules: `vs:spec/os/android/messages.md:271`, `voicemail.md:173`, `contacts.md:213`,
  `deletionWindow.md:24`.
- Impact: the owner sees an Undo notice and the record leaves Android up to 10 s later; if the SMS role, voicemail grant or Contacts
  grant is gone at expiry the row ends `conflict` or `permission-required` and nothing is deleted. Alpha's port wires the window
  (`alpha-vs:.../AlphaTelephonyPlugin.java:40`, `AlphaContactsPlugin.java:19`).
- Smallest fix: none in code; record it as an intended change in the migration notes and cover it in device acceptance.

### eliza-os-android-comms-media-05 — UNMODELED, medium
Behaviour: as default SMS app the phone stores incoming SMS and MMS and posts the new-message notice.
- Develop/vibestack code (identical): `SmsDeliverReceiver.java`, `MmsWapPushReceiver.java`, `MmsPdu.java`, `MmsStore.java`,
  `MmsResultReceiver.java`, `RespondViaMessageService.java` under `vs:packages/os/android/messages/src/main/java/ai/eliza/plugins/messages/`.
  Develop model: `dev:plugins/plugin-native-messages/quint/NativeMessageNotice.qnt` (invariants `FullConversationIdentity`,
  `ConfirmedReplacementRetainsHistory`, `FinishedReleasesReceiver`).
- Vibestack: `vs:spec/os/android/messages.md` has 9 rules: sends, the notice's Mark read action, deletion, sender lookup.
  No rule says an incoming message is written to the provider, that an MMS notification is downloaded once, or when a notice is posted
  or replaced (`messages.md:16-20` mentions the notice only to scope it out of notice routes).
- Impact: losing or duplicating incoming texts would not contradict any rule, and gap 01 means no test runs either.
- Smallest fix: add a story "Keep every message I receive" with rules lifted from `NativeMessageNotice.qnt`.

### eliza-os-android-comms-media-06 — UNMODELED, low
Behaviour: Calendar creation receipts, event options, agent execution and workflow range reads.
- Develop: `dev:plugins/plugin-native-calendar/src/android-definitions.ts` declares `pendingCreations`, `acknowledgeCreation`,
  `saveOptions`, `readOptions`, `prepareAgentSource`, `executeAgent`, `cancelAgent`, `requestWorkflowReadAccess`,
  `workflowCalendars`, `readWorkflowRange`, `remove` and the types `AndroidCalendarCreation`, `AndroidCalendarOptions`,
  `AndroidCalendarOptionsEvent`, `AndroidCalendarOperation`, `AndroidCalendarAgentResult`, `AndroidCalendarReceipt`,
  `AndroidCalendarSource`, `AndroidCalendarTarget`, `AndroidCalendarFields`.
- Vibestack: the Java methods are all there (`vs:.../calendar/CalendarPlugin.java`, `CalendarCreationStore.java`,
  `write/CalendarEventOptions.java`, `read/SelectedCalendarReader.java`), but `vs:packages/os/src/bridges/definitions/calendar.ts`
  declares 9 methods and none of these, and `vs:spec/os/android/calendar.md` has no rule for them.
- Impact: the phone still calls all ten through Alpha's own schemas (`alpha-vs:apps/app/src/calendar/device.vibe:146-263`,
  `requests.vibe:110-133`, `workflows/calendarRanges.vibe:39`); upstream no longer types or specifies them.
- Smallest fix: restore the declarations in `definitions/calendar.ts` and add rules for creation receipts and option readback.

### eliza-os-android-comms-media-07 — MISSING, low
Behaviour: the shared Messages session and its receipt wording.
- Develop: `dev:packages/contracts/src/native-telephony-session.ts:62-101` (`createSmsSession`: foreground off clears provider content and
  stops observing; `SMS_SESSION_MESSAGES`) and `smsReceiptLabel`/`mmsReceiptLabel`/`mmsProblemLabel` ("All parts sent; delivery is not
  confirmed.", "Outcome unknown. Check the recipient before sending again."). Used by `alpha-develop:apps/app/src/runtime/image-sms.ts:7-18`.
- Vibestack: no counterpart in `vs:packages/os/src/bridges/` (searched names and sentences); `messages.vibe` exports the client only.
- Impact: session fences and receipt sentences now exist only in Alpha's port; the develop sentences are not in `alpha-vs/apps/app/src` either.
- Smallest fix: decide whether the session belongs upstream; if not, confirm the wording in the Alpha audit.

### eliza-os-android-comms-media-08 — CHANGED, low
Behaviour: contact search through the telephony client.
- Develop: `dev:packages/contracts/src/native-telephony.ts:1596-1608` (`searchContacts(query, limit<=100)`, `parseContacts`,
  `TelephonyContactCard`), used by `alpha-develop:apps/app/src/prototype/agent-adapter.ts:339` and `sms-adapter.ts:580`.
- Vibestack: removed. Names come from `resolveNames` (`vs:.../contacts/AddressBookPlugin.java:386`, `ContactNames.java`) and lookups from
  the address book `list` (`alpha-vs:apps/app/src/telephony/actions.vibe:186,200`). Same `ContactsCatalog.list` underneath.
- Impact: none found; the read is now gated by the address-book rules (`vs:spec/os/android/contacts.md:26`) instead of telephony admission.
- Smallest fix: none; note in migration notes.

### eliza-os-android-comms-media-09 — CHANGED, low
Behaviour: size of a recent-calls page.
- Develop: at most `limit` rows (`dev:.../messages/TelephonyPlugin.java:363-387`); the client rejected more (`dev:packages/contracts/src/native-telephony.ts:562`).
- Vibestack: `limit + 1` rows and a `beforeDate`/`beforeId` cursor (`vs:.../messages/TelephonyPlugin.java:381-408`), consumed by
  `vs:packages/os/src/bridges/phone.vibe:279-313`; rule `vs:spec/os/android/phone.md:183`.
- Impact: only a consumer still using develop's parser breaks. See the contract note on Alpha's fork below.
- Smallest fix: none.

### eliza-os-android-comms-media-10 — CHANGED, low
Behaviour: marking a voicemail heard.
- Develop: `marked` or `not-found` (`dev:.../messages/VoicemailStore.java:242-249`).
- Vibestack: reads the row back and may answer `unconfirmed` (`vs:.../messages/VoicemailStore.java:276-283`); rule `vs:spec/os/android/voicemail.md:152`.
- Impact: a third status the UI must word. Alpha's fork passes it through (`alpha-vs:.../AlphaTelephonyBase.java:765`).
- Smallest fix: none.

### eliza-os-android-comms-media-11 — UNMODELED, low
Behaviour: the visual voicemail client (OMTP SMS, IMAP sync, carrier configuration, secrets).
- Code (identical both sides): 13 classes in `vs:packages/os/android/messages/src/main/java/ai/eliza/plugins/messages/vvm/`, 6 tests in `src/test/.../vvm`.
- Vibestack: `vs:spec/os/android/voicemail.md:7-8` names only `VoicemailStore.java` and `VoicemailPcm.java` as sources; no rule covers the client.
- Impact: voicemail download on carriers without a system VVM source rests on unspecified, unrun code.
- Smallest fix: one story for activation, sync and credential storage.

### eliza-os-android-comms-media-12 — UNMODELED, low
Behaviour: in-call screen controls, keypad tones and the quiet ongoing-call channel (#39794).
- Develop: `dev:plugins/plugin-native-phone/android/src/main/java/ai/eliza/plugins/phone/{TelecomCallActivity,TelecomCallPresentation,TelecomDialPadActivity}.java`,
  `TelecomCallService.java` (#39794), tests `TelecomCallPresentationTest`, `TelecomCallToneTest`.
- Vibestack: same Java. `vs:spec/os/android/phone.md:30-87` models the notice registry only; nothing on answer/decline/hold/mute/speaker,
  DTMF tone ownership or which channel a non-ringing call uses.
- Impact: Alpha forks these screens, so phone risk is small; upstream behaviour is unspecified.
- Smallest fix: one rule per control family, taken from the two test classes.

### eliza-os-android-comms-media-13 — UNMODELED, low
Behaviour: reading conversations and messages, and marking a conversation read when it is opened.
- Code: `vs:packages/os/src/bridges/messages.vibe:358-391` (`threadPage`, `messagePage`, `markThreadRead`),
  `vs:.../messages/{SmsProviderReader,SmsPageCursor,SmsRecords}.java`.
- Vibestack spec: `messages.md` has no read rule; `paging.md` gives the generic cursor laws only. Mark read is specified for the notice action
  (`messages.md:228`), not for opening a conversation.
- Smallest fix: a read story citing paging, plus "opening marks read only up to the newest row shown, only with the SMS role".

### eliza-os-android-comms-media-14 — UNMODELED, low
Behaviour: SIM line information (`phoneInfo`: carrier, number, network type, ICCID, IMEI, each only where Android allowed).
- Code: `vs:packages/os/src/bridges/phone.vibe:316-323`, `vs:.../messages/PhoneInfoReader.java`; develop `dev:packages/contracts/src/native-telephony.ts` `parsePhoneInfo`.
- Vibestack spec: no rule in `spec/` mentions it.
- Smallest fix: one rule: a field Android refused is null and never guessed.

### eliza-os-android-comms-media-15 — UNMODELED, low
Behaviour: the reminder store (recurrence, Done, Snooze +10 min, 32-entry history, 250 reminders).
- Develop: Java `ReminderStore.java` plus the TS mirror `dev:plugins/plugin-native-reminders/src/occurrence.ts:16-18,113-260`
  and `test/occurrence.test.mjs`.
- Vibestack: Java identical (`vs:.../reminders/ReminderStore.java:30,427`); `vs:spec/os/android/reminderAlarms.md` covers alarms only;
  the TS mirror and its test are gone (`vs:packages/os/src/bridges/reminders.vibe` has no occurrence functions).
- Impact: the phone uses the native store, so behaviour is kept; legacy Alpha used the TS mirror only in its browser store
  (`alpha-develop:apps/app/src/browser/daily.ts:7`).
- Smallest fix: rules for next occurrence, snooze and capacity.

### eliza-os-android-comms-media-16 — MISSING, low, listed in wave3 (D)
Behaviour: #39674, a Twilio send whose outcome is unknown is flagged `deliveryUnknown` and never resent.
- Develop: `dev:plugins/plugin-native-phone/src/twilio.ts` (+10 lines in 2e77ec4aa).
- Vibestack: no Twilio delivery module (only catalog entries in `vs:packages/core/src/catalog`).
- Impact: none on the phone; legacy Alpha never referenced Twilio.

### eliza-os-android-comms-media-17 — CHANGED, low
Behaviour: when the reply-draft route exists.
- Develop: registered only when the host sets `ELIZA_MOBILE_SMS_REPLY_DRAFT=1`
  (`dev:packages/agent/src/runtime/android-app-plugin-loaders.ts:22-24`; Alpha set it only on a verified image,
  `alpha-develop:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:619`).
- Vibestack: a built-in module, always registered (`vs:packages/agent/src/plugins/profile.vibe:20`,
  `vs:packages/agent/src/device-actions/reply-draft.vibe:151-165`), gated by the model binding. Error bodies changed from sentences to
  `invalid_thread`/`drafting_unavailable`/`client_closed`; status codes are the same.
- Impact: the owner-authenticated route answers on installs without telephony; it still sends and stores nothing.

### eliza-os-android-comms-media-18 — UNVERIFIED, low
Behaviour: the slice's rules are accepted and proved.
- Vibestack: all 142 rules of the 21 slice spec files carry a Quint block, but `vs:spec/lock.json` records only `spec/app/*` and
  `spec/index.md` (5 entries, `unproved` empty, no `spec/os` key). The slice has one proof, `vs:spec/os/android/media/catalog.proof.dfy`,
  not recorded in the lock.
- Smallest fix: run the accept step for `spec/os` and commit the lock.

### eliza-os-android-comms-media-19 — MISSING, low
Behaviour: upstream TS declarations for `ElizaContacts.createContact` and `importVCard`.
- Develop: `dev:plugins/plugin-native-contacts/src/definitions.ts` (`ContactsPlugin`, 5 methods).
- Vibestack: `ContactsPlugin.kt` still has both methods; `vs:packages/os/src/bridges/definitions/contacts.ts` `ContactsPlugin` declares 3.
- Impact: none on the phone (Alpha uses `AddressBookPlugin`).

## Contract mismatches with Alpha's port

Checked: every name `alpha-vs/apps/app/src/**` imports from `@elizaos/os/bridges/{phone,messages,contacts,deletion-window,calendar,media.schema,action-journal}`
and `definitions/{phone,messages}` (72 names) exists in `eliza-vs`; all 278 `ai.eliza.*` references in `alpha-vs/android` in this slice's packages
resolve; 331 static method and constant references to slice classes resolve; the 14 package-private members `AlphaTelephonyAccess` reaches exist;
the nine os modules `alpha-vs/android/consumer-host.json` names exist. No missing export, class or module was found in this slice.

Differences worth knowing:
1. Recent-calls cursor. Upstream `phone.vibe:299` sends `beforeDate`/`beforeId` and expects a lookahead row; Alpha's fork
   `alpha-vs:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyBase.java:388-412` reads neither and returns at most `limit` rows.
   Harmless while Alpha asks only the first page (`alpha-vs:apps/app/src/telephony/phone.vibe:79`); a second page would repeat the first.
2. Calendar deletion. Upstream's client wants native `dispatchDeletion`; Alpha's host has `inspectDeletion` and `removeScoped`. Alpha does not use that client.
3. Reply draft. Upstream serves `POST /api/messages/reply-draft`; `alpha-vs:apps/app/src/platform/owner-routes.json:191` admits it, but no file in
   `alpha-vs/apps/app/src` requests it (legacy caller: `alpha-develop:apps/app/src/runtime/connection-ui.tsx:2179`). For the Alpha audit.
4. Outside this slice, seen while checking: 12 `ai.eliza.plugins.agent.{connection,runtime,updater}` classes Alpha references are absent from
   `eliza-vs/packages/os/android` (wave3 item G).

## Confirmed OK

| Item | Develop | Vibestack rule | Vibestack code |
|---|---|---|---|
| #40174 reply draft has no output cap | `plugins/plugin-native-phone/src/routes/reply-draft-route.ts` | `spec/agent/deviceActions/replyDraft.md:138` | `packages/agent/src/device-actions/reply-draft.vibe:112` |
| Reply draft request, prompt, 320 limit, NONE | same file | `replyDraft.md:27,83,114` | `reply-draft.vibe` |
| #39949 zoom/torch while recording | `plugin-native-camera/src/session.ts` | `spec/os/android/camera.md:155` | `packages/os/src/bridges/camera.vibe:80,354-362` |
| #39952 capture aspect ratio | `camera/src/definitions.ts`, `CaptureAspectRatios.java` | `camera.md:180` | `definitions/camera.ts:16-42`, Java identical |
| Camera start, denial, rearm, capture slot, recording receipt | `camera/src/{session,host-ports}.ts` | `camera.md:19,78,98,129,205,231` | `camera.vibe` |
| Scan document limits and drafts | `camera/src/scan-document.ts` | `spec/files/scan/review.md:16-181` | `packages/files/src/documents/scan-document.vibe` |
| #39948, #39945, #39683 selected documents and PDF copy | media Java | `spec/os/android/media/isolatedPdf.md` | Java identical (`PdfSourceCopy.java` adds a citation) |
| Media catalog, albums, edit copy, photo replace, review, rows, trash, video playback | `plugin-native-media/android` | 9 files under `spec/os/android/media/` | Java identical plus `reviewRemovedVideoCopy` |
| #39920, #39883 latest sender | `SmsProviderReader.java` | `messages.md:365` | Java identical, `messages.vibe` |
| #39660 owner-approved native send | `TelephonyPlugin.java` | `messages.md:30` | Java identical |
| #39658 own provider rows | `MmsStore.java`, `SmsTelephony.java` | `messages.md:159` | Java identical |
| #39686 MIME-qualified MMS receiver | `TelephonyPlugin.java` | system role rule | Java identical |
| SMS journal, replay, denial, status evidence | `SmsSendJournal.java`, `contracts/native-telephony.ts` | `messages.md:97,128,174` | `messages.vibe`, `definitions/messages.ts` (limits 10/5000, 5/1600, 50/50 equal) |
| Notice Mark read | `MmsStore.java` | `messages.md:228` | Java identical |
| #39796, #39805 single message delete, contact edit | `MessageDeletion.java`, `ContactsEditor.java` | `messages.md:271`, `contacts.md:136` | present (now staged, gap 04) |
| Call registry and notices | `TelecomCallService.java` | `phone.md:30-87` | Java identical |
| #39869 caller thumbnail, stale read retirement, Hold omission | `TelecomCallActivity.java` | `contacts.md:238` | Java identical |
| Emergency gate | `TelephonyPlugin.java:446-464` | `phone.md:130` | Java `:481`, `phone.vibe:251` |
| Dial handoff | `TelephonyPlugin.java:412` | `phone.md:103` | `phone.vibe` |
| Call log read | `TelephonyPlugin.java:363` | `phone.md:183,222` | `phone.vibe:279-313` |
| Number normalisation | `native-telephony.ts:938` | used by `phone.md:103` | `definitions/phone.ts:260-262` (same patterns) |
| Voicemail status, list, audio, PCM | `VoicemailStore.java`, `VoicemailPcm.java` | `voicemail.md:22-121` | Java, `phone.vibe` (50 rows, 8 MiB, 10 MiB, 300 s equal) |
| Contacts read gate, write gate, version check | `AddressBookPlugin.java`, `native-address-book.ts` | `contacts.md:26-186` | `contacts.vibe` (limits equal) |
| Deletion window contract and notice text | `contracts/deletion-window.ts` | `deletionWindow.md:24-173` | `deletion-window.vibe:54-66` (text identical, 10 s) |
| Deferred deletion rules | `DeferredDeletionCoordinator.java` | `deferredDeletion.md:33-294` | Java superset (tests: gap 02) |
| Reminder alarms | `plugin-native-reminders/android` | `reminderAlarms.md:25-127` | Java identical plus `deliverDue`, `cancel`, `capacity` |
| Calendar read, editor handoff, reviewed edit | `plugin-native-calendar/android` | `calendar.md:16-101` | Java identical, `calendar.vibe` |
| Location | `plugin-native-location` | `system.md`, maps specs | Java identical, same 8 TS methods |
| Role requests (HOME, DIALER, SMS) | `TelephonyPlugin.requestRole` | `system.md:283` | `phone.vibe:508`, `system.vibe:366` |
| Home inventory | system plugin | `home.md` | `system.vibe` |
| #39813, #39810 Pixel source lock | `packages/os/android/sources/pixel10a-stallion.json` | image specs | `packages/os/aosp/sources/pixel10a-stallion.json` identical |

NOT_APPLICABLE (14): #39715 and #39737 (no slice behaviour); `phoneCallLog` and `contacts` agent providers (in the resident agent they call the
web fallback, which throws); `twilio.ts` module; Phone Companion; Phone/Messages/Contacts React views; telephony-profile registration;
web and iOS fallbacks; `plugin-native-{talkmode,swabble,appblocker,websiteblocker,activity-tracker}` (no reference in `alpha-develop` outside `vendor/`).

## Not covered

- No build: instance-method and signature compatibility between `alpha-vs/android` and `eliza-vs/packages/os/android` was checked for static references only.
- The rewritten TS contracts (`native-telephony.ts`, 2,070 lines; `native-address-book.ts`, 612) were compared by export set, constants, limits,
  number normalisation, send-state table, notice text and client method set, not parser branch by branch.
- Quint blocks were read, not run; equivalence with develop's `.qnt` models was judged from invariant names and prose.
- `gen/` is not checked in, so the bridges were not confirmed to compile against generated machines.
- The AOSP product tree (`dev:packages/os/android/{vendor,products,builder,releases,signing,system-updater,sense}`) and first-run role provisioning
  belong to the image slice. Seen in passing: develop did not preassign dialer and SMS
  (`dev:packages/os/android/vendor/eliza/overlays/frameworks/base/core/res/res/values/config.xml:9`); vibestack's first-run assigns them where the image
  declares them (`vs:spec/os/image/firstRun.md`).
- Agent-side telephony contracts (`sms-send.ts`, `mms-send.ts`, `phone-dial.ts`, `telephony-actions.ts`) belong to the agent slice.
- Media Java was accepted on byte identity plus rule headings; rules were not matched to Java line by line.
- Device behaviour of any kind.
