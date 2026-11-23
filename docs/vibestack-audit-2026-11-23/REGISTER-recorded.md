# Parity register: open and already recorded

Rows the recheck found still open and stated to the same extent in [`../vibestack-open-items.md`](../vibestack-open-items.md). See [`REGISTER.md`](REGISTER.md) for how the rows were produced.

## Alpha

### Blocker (5)

**Android**

- **A-015** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 1. A completed sign-in is never adopted: renderer Cloud requests go through upstream ElizaCloud, whose DeviceCustody key store Alpha's AlphaCloudSignIn never writes.
  - Now: Unchanged in a1681f413. cloud-live.vibe:77-81 still sends every request through ElizaCloud. MainActivity.java:379 registers the upstream ElizaCloudPlugin as is. Nothing in android/ references DeviceCustody or DeviceCredentialStore. Upstream ElizaCloudPlugin.java:43 custody(...) still returns DeviceCustody. The open-items doc now states it in full at line 182, the bullet starting "Account: the OWNER custody item above understates its effect": GET /api/v1/user is refused, no sign-in is adopted, and the bridge must mirror Alpha's key into DeviceCredentialStore. The owner bullet at line 23 is still there.
  - To do: In android, add an ElizaCloudPlugin subclass that mirrors Alpha's cloud:<env> key into DeviceCredentialStore on sign-in, renewal and sign-out (or sign in through ElizaSignIn), and register it in MainActivity. Add the rule "Cloud requests carry the key the sign-in stored" to spec/account/session.md, with a journey test.

**Upstream eliza**

- **A-014** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14c (KNOWN). Device headers (X-Eliza-Device-*, X-ElizaOS-Client-Id) reach the agent on native requests.
  - Now: open-items: 'The native channel's device headers (eliza #40310, `2f409d5d020`, after the current pin) need the next repin…' (line 79), which says proposal routes answer 401 on the phone, and 'The native channel takes no headers…' (line 207). upstream.lock.json still pins vibestack-dp 6451775c.
  - To do: Repin past eliza #40310 and align spec/platform/index.md's header rule with upstream's limits.

**Data carried across the update**

- **A-010** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 1. A send recorded as dispatching or outcome-unknown before the update must block a re-send after it and be settled by its receipt (legacy inbox-operation:v1 records are not adopted).
  - Now: apps/app/src/inbox/previous.vibe reads only the inbox-drafts:v1 unsaved/saved/shelf slots (lines 99-135); no reader of inbox-operation:v1 anywhere in src/inbox. Android still admits the slot (RendererCredentialSlots.java:43). handoffs.vibe:33 still derives chat request ids as SHA-256 over [assistant-email, requestId, grant, to, subject, body]. Open-items line 38 ('old inbox operation records (`inbox-operation:v1:<sha256>`), possibly including a send in flight ...') now states the shelf adoption, the changed request-id derivation and the uncleared slot, so it covers the finding in full.
  - To do: Rule in apps/app/spec/inbox/operations.md that an operation the previous version recorded stays the account's operation until its receipt settles; in src/inbox/previous.vibe adopt inbox-operation:v1:<key> before the drafts and seed the journal with a Dispatching/Observed record under the legacy request id (mark the matching adopted draft earlier), then clear the slot once the receipt settles.

**Owner decision**

- **A-001** (recorded; [`alpha-android.md`](alpha-android.md)) 1. The agent's stored state (conversations, memory, schedules, workflows) in files/.eliza is not carried over the app update; the new AgentService uses files/agent/<sha256(user,org)>.
  - Now: No code adopts the old directory: rg for files/.eliza in android/app/src/main/java finds only GoogleAgentAccessFile.java:23 and AlphaLocalAgentPlugin.java:1032 (notificationInstallation), and both still read .eliza. Upstream AgentService at pin 6451775c35a:576 launches with directories.state(userId, organizationId). The open-items doc covers it at the same extent in the bullet '**OWNER:** The resident's stored state is not carried over an app update…' (line 60). The doc does not say that the legacy files/agent payload is never cleaned.
  - To do: After the owner decides: add a state-adoption or explicit-reset rule to apps/app/spec/platform/resident.md, then implement it in ElizaAgentService.configureLaunch (android/app/src/main/java/ai/alphacompute/alphaphone/ElizaAgentService.java:85).
- **A-021** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 10. Legacy Messages drafts (sms-draft:v1:<thread\|new>) are carried over at the cutover.
  - Now: Nothing under apps/app/src/telephony reads sms-draft:v1 (owner.vibe and layer.vibe have no match). open-items line 44: '**OWNER:** Legacy Messages drafts (secure slots `sms-draft:v1:<thread\|new>`) are not adopted…'. It names the duplicate-send risk.
  - To do: Adopt the legacy slots once in layer.vibe draftsKept (with a rule in spec/telephony/drafts.md), or record the owner's acceptance of the loss.

### High (24)

**Android**

- **A-031** (recorded; [`alpha-android.md`](alpha-android.md)) 14. androidTest sources reference removed APIs (secureWrite/secureRemove, changed upstream signatures, removed classes, AlphaLocalAgent 'start'), so androidTest does not compile.
  - Now: Still 11 androidTest files with secureWrite/secureRemove. NativeVoiceLatencyInstrumentedTest and ResidentWorkflowCrashInstrumentedTest still reference LiveVoiceCapture.Sink, DeviceRamTierPolicy and WorkflowSurvivorInventory. BrowserFlow, WorkflowPhoneNative and CalendarAvailability still drive "start". Open-items line 201, '`androidTest` (182 files) does not compile against the new APIs…', lists the same set.
  - To do: Port the instrumented tests in android/app/src/androidTest to ElizaSecureStore, the new upstream signatures and ElizaAgent.start.
- **A-034** (recorded; [`alpha-android.md`](alpha-android.md)) 23. The AOSP image must boot to prove the new abstract socket <package>.workflow.v1 under the privileged-app SELinux domain.
  - Now: Open-items line 206, 'An AOSP image boot is needed for the new abstract socket `<package>.workflow.v1` under the privileged-app domain', states it. The workflow socket is also missing from consumer-host.json residentSockets.
  - To do: Boot the full AOSP image with the APK and check `adb logcat \| grep avc` while running a workflow; add a .te rule in android/aosp/launcher-policy if denied.
- **A-064** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 4. A hosted-model 429 holds the account for under 5 s, so the turn's one re-send is admitted.
  - Now: android/agent/host.json still has no 'environment' key and sets no CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS. Upstream eliza-vs packages/agent/src/models/binding.vibe:116-122 rateLimitHold returns 0 (the provider's whole retry time) when unset; spec/agent/models/binding.md:328-335. test/agent-launch-token-budget.test.mjs:38-44 now asserts only that the phone sets none. open-items: '`android/agent/host.json` sets no `CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS`…' (line 210) and '**agent:** with no `CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS` in the launch…' (line 268).
  - To do: Add "environment": {"CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS": "4"} to android/agent/host.json (check that the pinned launch schema admits it), or wait for the upstream default change to land in the pin.
- **A-068** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 1. The agent's Gmail-changes / Calendar-edits switches are saved and published but never enforced; agent Google writes are always refused.
  - Now: Unchanged. android/agent/host.json:19-22 still hardcodes google {gmailChanges:false, calendarEdits:false}. AlphaLocalAgentPlugin.java:433 still writes GoogleAgentAccessFile and :660 still exports ALPHA_GOOGLE_AGENT_ACCESS_FILE. The only hits for that variable or GoogleAgentAccessFile in android/app/src, scripts and apps/app/src are the writer itself. Upstream eliza-vs AgentConfig.java:215 still takes google only from host.json. docs/vibestack-open-items.md, Android / native: "The agent's Gmail-changes and Calendar-edits switches are saved and published, but android/agent/host.json launches the agent with gmailChanges: false..." states the same loss and fix.
  - To do: ElizaAgentService.configureLaunch (or upstream AgentConfig / AgentService.launchDocument) must put the saved GoogleAgentAccessFile switches into the launch's google record and restart the agent when a switch changes. Add the rule "the launch carries the saved switches" to apps/app/spec/account/agentAccess.md. Drop the dead ALPHA_GOOGLE_AGENT_ACCESS_FILE env var.
- **A-073** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K8. Java host models and the ElizaAgentService compatibility layer are unbuilt and unrun.
  - Now: Open-items, Android / native bullet 1 ("Not run on a device: the ElizaAgentService compatibility layer...") and bullet "Java-side host models are missing: IdentitySession, NativeCredentialMutation, NativeGoogleAccessFile...".
  - To do: npm run android:build:local, install, and boot the agent on an emulator/device; add the Java host models.

**App shell**

- **A-054** (recorded; [`alpha-camera.md`](alpha-camera.md)) 7. Scan drafts persist as binary pages in IndexedDB, and legacy drafts are adopted.
  - Now: Unchanged. src/camera/scanner.vibe:17 DRAFT = "alpha/camera/scan-draft/v1", with kv.set of base64 JSON at :156; a failed write still says "Another draft is saved. Load or delete it first." (:384). No @elizaos/plugin-files import. Open items, Camera: "scan drafts are one base64 `localStorage` value (`alpha/camera/scan-draft/v1`) instead of upstream's IndexedDB `createScanDraftStore`…"
  - To do: Use upstream createScanDraftStore (eliza-vs packages/files/src/documents/scan-draft.vibe) under the legacy database name in scanner.vibe, and state the storage and adoption in spec/camera/scan.md.
- **A-062** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) U2: Chat attachments from storage are capped at 5 MiB PDF/PNG/JPEG/WebP/txt, while chat still offers GIF/CSV/Markdown/JSON (legacy: 20 MiB).
  - Now: assistant/files-bridge.vibe:12 still lists gif, csv, markdown and json; files/storage.vibe:124 reads through AlphaMailAttachments.readSelected. Open items line 146: '**Files/assistant:** a chat attachment picked from storage is read through `AlphaMailAttachments.readSelected`...'
  - To do: Either narrow chatTypes in files-bridge.vibe to what DocumentBytes admits, or restore a 20 MiB read for chat in Java (DailyApps/AlphaFiles).
- **A-065** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 7. Each stored key lives in its owner's namespace, a reset removes exactly those keys, and a second account never sees the first's state.
  - Now: DeviceStorage has no public reset caller: src/platform/device-storage.vibe:42 finishReset runs only on admitStartup/:85 and clears ownerKey(now.owner). resetOwner (spec/platform/index.md:318) is imported nowhere in src. src/settings/reset.vibe:25-45 still goes only to native AlphaReset (AlphaResetPlugin.java DataReset wipes natively). ownerKey("device", …) is still used across ~24 files, e.g. src/workflows/runs.vibe:14-16, digests.vibe:17, inbox/store.vibe:9-10, account/session.vibe:241. open-items: '`DeviceStorage.reset()` and `resetOwner` have no caller, and about 30 stores use the literal `device` namespace instead of the bound owner;' (line 94). The bullet does not spell out the cross-a…
  - To do: In spec/platform/storage.md, name which keys are device-wide on purpose. Move the Workflows runs/digests/results stores to session.ownerKey as src/telephony/owner.vibe does. Delete the dead reset transitions or call them from src/settings/reset.vibe.
- **A-087** (recorded; [`alpha-voice.md`](alpha-voice.md)) 6. (#1453) A voice turn's own keypad, Contacts or Messages step keeps the voice conversation instead of retiring it through a plain navigation.open.
  - Now: telephony/operations.vibe:210-213 showAfterReply still calls `navigation.open(present.app, present.route)`; only AssistantHost.openView (shell/assistantHost.vibe:136-147) uses voice.followScreen. Open-items Voice bullet "#1453 voice part: a voice turn's own keypad, Contacts or Messages step runs through a plain navigation.open…" and the "Assistant / Telephony / Voice (#1453)" section.
  - To do: Route telephony presents through AssistantHost.openView/voice.followScreen with followScreen awaiting placement; rule in spec/voice/conversation.md "Voice stays on through a screen change only when the agent claimed it…".
- **A-088** (recorded; [`alpha-voice.md`](alpha-voice.md)) 8. Sign-out, account switch and reset retire voice and dictation.
  - Now: voice.left() only at shell/assistantHost.vibe:102 (private app or lock); account/bindings.vibe has no voice/dictation retire (only VoiceRoute observeAccount/observeLimit); dictation.vibe has no identity hook. Open-items Voice bullet "Sign-out, an account switch and reset do not retire voice or dictation…".
  - To do: In src/account/bindings.vibe (identity change, reset begin) call voice.left() and a dictation cancel.

**App spec**

- **A-037** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 6. A turn names no open record (Calendar event, reminder, note, Files folder, notification, Settings section, SMS, workflow run) except the Notes list, a Browser tab or a Maps object.
  - Now: shell/assistantHost.vibe:122-126 still returns observation {view, revision, sensitive}. TurnSources (assistant/ports.vibe:110-122) has only calendarDay, notesList and preferReview. Only Notes, Browser and Maps set selectedObject (composer.vibe:346-349). spec/assistant/context.md has no selected-record rule. Calendar's and Camera's selectedObject (calendar/operations.vibe:280, camera/agentContext.vibe:26) are execution-time or helper contexts, not the turn. The open-items 'Assistant' bullet 'A turn names no selected record other than the Notes list, a Browser tab or a Maps object...' covers this.
  - To do: Add a per-area selected() member to TurnSources in src/assistant/ports.vibe, filled per area, and merge it in composer.vibe. Add a rule in spec/assistant/context.md.
- **A-053** (recorded; [`alpha-camera.md`](alpha-camera.md)) 6. Albums are their own paginated lists and their counts come from the store summary.
  - Now: Unchanged. src/camera/library.vibe:135 builds an album as c.main.rows.filter(...); PhotosScreen.tsx:162 counts from catalog.main.rows; store.summary() and list({album}) have no album caller (the only list({album}) is viewfinder.vibe:187, for Camera's tile). Open items, Camera: "albums are a filter of the loaded window (at most 600 rows), and counts come from that window…"
  - To do: Add an album window to spec/camera/library.md read with list({album, before}) and summary() for counts, and wire it in library.vibe.
- **A-085** (recorded; [`alpha-tooling.md`](alpha-tooling.md)) G25: develop #1453 and #1454 should be in the port.
  - Now: 2dcfd18ee is now an ancestor of HEAD (merge a0f40bef1, through #1459), but its renderer behaviour is not ported. Open-items section "After merging develop through #1459" lists Browser (#1453), Assistant / Telephony / Voice (#1453) and Telephony (#1453), plus "#1453 voice part…" at line 160.
  - To do: Port the #1453 items into spec/browser, spec/assistant, spec/telephony and spec/voice and their .vibe sources, as the open-items section lists.

**App UI**

- **A-066** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 8. First run shows a neutral screen, never Home, until sign-in opens, and cold start holds the logo until the saved account's agent is ready (#1357).
  - Now: apps/app/src/web/main.tsx:16-26 still renders ShellRoot directly. src/web/shell/ShellRoot.tsx returns only RecoveryScreen (phase != Running) or the HomeScreen/AppFrame tree, with no branch on startupResolved or the resident phase. No rule in spec/shell mentions holding Home. open-items: 'nothing holds Home until the sign-in page or the agent is ready (#1357), so Home flashes before the required sign-in page;' (line 95).
  - To do: Add a rule in spec/shell/landing.md (or shell/index.md), and in src/web/shell/ShellRoot.tsx a neutral hold rendered while signIn.startupResolved is false or the saved account's resident is not ready.
- **A-067** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14f (KNOWN). Bar approval goes through review (comms AC-26), and the alpha-proposal:v1 slot is carried.
  - Now: open-items: '**Telephony:** `useComms.approve/decline` now run through `commsReviewFromAssistant()`… but no screen draws the bar's proposal card with an Approve button' (line 116), and 'legacy kept `alpha-proposal:v1` in a native secure slot…' (line 43). Related and recorded: approved texts are refused natively with not-approved (line 216).
  - To do: Draw the bar's proposal card in src/web/telephony (call useComms.approve), and decide on alpha-proposal:v1.
- **A-094** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 13. A digest schedule can be created, retimed, rezoned or removed.
  - Now: DigestPanel.tsx still offers only pause/resume, Run now, retry/discard. Open-items 'Workflows, screens not ported: creating, retiming, rezoning or removing a digest schedule… zoneChoices has no caller, and DigestSourcesService.validGoogle/consent/revokeImpact/tick have none either'.
  - To do: Add a schedule form in DigestPanel.tsx sending Digests.change({path:'loops'}), and a creation rule in spec/workflows/digests.md.

**Tooling and CI**

- **A-033** (recorded; [`alpha-android.md`](alpha-android.md)) 20. The qualified voice and embedding host records had only forkPin bumped, with every hash unchanged, so the staged binaries are unrequalified.
  - Now: Open-items line 205, 'The qualified host records (`voice-host/qualified-voice-host.json`, `embedding-host/qualified-host.json`) changed only `forkPin`…', and line 163 (library names libelizavoicejni vs libparadeevoicejni disagree, with hashes from 6337fd4c) record it. It also notes that agent:build-embedding-host cannot run because the upstream producer is gone. product.gradle still runs the --verify checks before each build.
  - To do: Re-home the embedding producer. Rebuild the voice and embedding hosts at the pin and regenerate android/voice-host/qualified-voice-host.json and android/embedding-host/qualified-host.json (`npm run android:build:local`).

**Upstream eliza**

- **A-032** (recorded; [`alpha-android.md`](alpha-android.md)) 16. Device headers (X-Eliza-Device-*, client id, trace id) are dropped on the native agent channel.
  - Now: ElizaAgentService.exchange (:240-253) still sends only method, path and body through AgentService.request; headers are read only for the bearer (:403-412). Open-items line 79 ('The native channel's device headers (eliza #40310…) need the next repin…', including that proposal routes answer 401) and line 207 ('The native channel takes no headers…') record it. Neither line mentions the legacy X-Eliza-Trace-Id check on voice turns.
  - To do: Repin past eliza #40310 and carry the headers in ElizaAgentService.exchange and the stream path. Align the header rule in spec/platform/index.md with upstream.
- **A-047** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 19. Capability negotiation for Browser controls and the Maps selected read sent no x-eliza-device-capabilities header.
  - Now: The renderer side is now done. fills.vibe:151-161 fills AdvertisedCapabilities from the enrolled capabilities. assistantHost.vibe:195-197 includes browserDeviceCapabilities and mapsDeviceCapabilities. The BROWSER_* names were checked against the pin (Android/native bullet starting "Not run on a device: the `ElizaAgentService`..."). On the phone the header still does not reach the agent. That remainder is recorded as the Shell bullet starting "The native channel's device headers (eliza #40310, `2f409d5d020`, after the current pin) need the next repin".
  - To do: Repin eliza past #40310 so the native AgentPlugin carries the headers. Then verify on a device that a close-all or selected-read proposal is admitted.
- **A-072** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K1. Device headers are admitted by the renderer but dropped on the phone's native channel.
  - Now: Alpha's pin is still vibestack-dp 6451775c35a (upstream.lock.json). Current upstream eliza-vs 0d7436199 now has AgentRoute.headers (packages/os/src/bridges/definitions/agent.ts:20), so only a repin is needed. Open-items, Shell: "The native channel's device headers (eliza #40310...) need the next repin".
  - To do: Repin to an eliza vibestack commit that has AgentRoute.headers carried through AgentPlugin/AgentSocketClient, then align spec/platform/index.md's header rule with upstream's limits.

**Data carried across the update**

- **A-080** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G8: legacy reminder-creations/reminder-deletions/clock-handoff v1 journals not adopted across the update
  - Now: No reference to reminder-creations:v1, reminder-deletions:v1 or clock-handoff:v1 in src/ or spec/. docs/vibestack-open-items.md:85 'G8: the legacy `reminder-creations:v1:device`…' and :59 '**OWNER:** Legacy page-storage keys…' (asks adopt or accept losing) cover it.
  - To do: Owner decision; if adopted, rule in spec/clock/reminderJournal.md + handoffHistory.md and a one-time read of the three slots in src/clock/layer.vibe.

**Owner decision**

- **A-029** (recorded; [`alpha-android.md`](alpha-android.md)) 8. Native request gates lost their only caller: CalendarSyncConsent, PreparedViewNavigation.allowed, OwnerRoutes.requestAllowed with its 409, reply drafting only on the verified image, and ConnectionRoutes.managedService/admittedHeader/billingRequestIdentity.
  - Now: CalendarSyncConsent.java, PreparedViewNavigation.java and OwnerRoutes.java still exist, and rg finds no call to any of them outside their own files. ConnectionRoutes.managedService/admittedHeader/billingRequestIdentity are defined (ConnectionRoutes.java:42-62) with no external caller. android/agent/host.json admits POST /api/views/{id}/navigate (:842,:1871) and POST /api/messages/reply-draft (:644,:1673) with no body rule. Open-items line 62, '**OWNER:** Native request gates that lost their only caller…', states it to the same extent.
  - To do: For each gate: a host.json body or query rule, a renderer rule with a model in apps/app/spec/platform or spec/calendar, or delete the class and record the retirement.
- **A-039** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 13. A message typed on a private screen (Passwords, locked) is sent without observation; legacy refused it and kept the text.
  - Now: spec/assistant/context.md:129 ('A private screen sends the message with no observation...') still contradicts spec/assistant/conversation.md:40 (canSend requires not(c.sensitive)). The composer has no 'Agent observation is paused' refusal. The owner bullet 'A message typed on a private screen (Passwords, a locked screen) is sent with no observation...' covers this.
  - To do: Owner picks a rule. If legacy wins: delete context.md:129's rule, and composer.vibe returns before sends.send when !observed with the legacy notice and the text kept.
- **A-079** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G1: Reminders has no way in (no Home rank, not in the Add sheet) and Calendar no longer lists reminders
  - Now: spec/shell/index.md:56-60 homeRank still has no `reminders` (clock is 14); src/shell/launcher.vibe:66-68 addableViews = homeDefaults only; src/web/calendar/** renders no reminder rows (only the 'Retry calendar and reminders' label at CalendarScreen.tsx:144). The only openers are still the overdue agenda card (OverviewCards.tsx:74, now fed) and tapped notifications. docs/vibestack-open-items.md:56 '**OWNER:** Reminders has no way in from Home or the Add sheet…' (and :32 'Reminders are no longer Calendar rows…') state it in full.
  - To do: Owner picks: add `reminders` to homeRank in spec/shell/index.md (and a title in src/shell/apps.vibe), or restore a Calendar reminder row via spec/calendar/presentation.md + src/web/calendar/CalendarScreen.tsx opening reminders/<id>.

### Medium (82)

**Android**

- **A-096** (recorded; [`alpha-android.md`](alpha-android.md)) 9. An owner start or stop goes through upstream ElizaAgent.start/stop and skips Alpha's lifecycle bookkeeping (epoch advance, AlphaCanonicalNotifications.forget, enrollment clear).
  - Now: ElizaAgentService.install (:65-72) registers only observe(acknowledgeShutdown) and onReady. forget/epoch advance still happens only in AlphaLocalAgentPlugin's credential-mutation path (:278) and pauseForUpdate (:965). publishNotificationRoot (:1022) has no caller. Open-items line 202, 'An owner stop goes through upstream `ElizaAgent.stop` and never advances…', states it to the same extent.
  - To do: In ElizaAgentService, observe status changes and, on an owner stop, call AlphaLocalAgentPlugin's forget, epoch and clearEnrollment. Add a rule to spec/platform/resident.md.

**App shell**

- **A-097** (recorded; [`alpha-android.md`](alpha-android.md)) 11. Attaching a Files item (AlphaFiles.storageReadAttachment) and cancelling a photo read (AlphaMailAttachments.cancelPhotoSelected) were removed.
  - Now: Absent from Java and from apps/app/src. apps/app/src/platform/native-plugins.ts:108-117 (AlphaFiles) has no read-attachment method. AlphaMailAttachments (:134-137) has readSelected, readPhotoSelected and cancel but no cancelPhotoSelected. Open-items line 203, 'Not ported natively: … `AlphaFiles.storageReadAttachment` and `AlphaMailAttachments.cancelPhotoSelected` (files, inbox)…', records it.
  - To do: Restore the methods, or name the replacement (readSelected/cancel) in spec/files or spec/inbox.
- **A-104** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 7. Notes folder names (notesFolders) are not sent with a turn.
  - Now: No notesFolders anywhere in apps/app/src or spec. Upstream reads it: eliza-vs packages/plugin-notes/src/organize.vibe:14 (NOTE_FOLDERS_METADATA_KEY). The open-items 'Assistant' bullet 'Notes folder names (notesFolders, read by upstream ...) are not sent with a turn' covers this.
  - To do: Add TurnSources.notesFolders() filled from NotesFolders, sent in composer.vibe's turn metadata. Add a rule in spec/notes/folders.md.
- **A-106** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 10. #1453: a turn's own view steps do not wait for its reply and its own navigation, so the keypad plus a prepared screen change drops the screen change.
  - Now: composer.vibe:491 still runs directly (directPass) before viewed() at :500. views.vibe:103-106,128 requires screen.contextKey === the send screen's key. ownKey (:262,:268) only labels the screen-change event as own; it does not admit a delivery. No order rule in spec/assistant/views.md. The open-items '#1459' bullet 'Assistant / Telephony / Voice (#1453): a chat turn holds the view steps its own request performs...' covers this.
  - To do: Add an order rule in spec/assistant/views.md. composer.vibe holds direct view steps until the reply's view is delivered, and views.deliver counts the turn's own switch as current.
- **A-108** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 12. #1453 voice: a voice conversation is not kept when its Messages/keypad/Contacts step opens the view.
  - Now: Yesterday this was UNVERIFIED; it is now confirmed open. src/telephony/operations.vibe:210-213 showAfterReply calls plain navigation.open, not AssistantHost.openView/voice.followScreen (shell/assistantHost.vibe:138-146, voice/conversation.vibe:631). The open-items 'Voice' bullet '#1453 voice part: a voice turn's own keypad, Contacts or Messages step runs through a plain navigation.open, which retires voice...' covers this.
  - To do: src/telephony/operations.vibe showAfterReply goes through AssistantHost.openView (voice.followScreen). Add a rule in spec/voice/conversation.md or spec/assistant/views.md.
- **A-109** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 14. The open conversation is not restored after a restart.
  - Now: No persisted selection in src/assistant. assistant.vibe:160-161 opens the transcript's in-memory conversation or null. The open-items 'Assistant' bullet 'Chat UI behaviour legacy tested that has no spec or code: restoring the open conversation after a restart...' covers this.
  - To do: Add a rule in spec/assistant/conversation.md, and read an owner-keyed stored conversation id in assistant.vibe followShell.
- **A-113** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 20. Shell constants override model facts (exact:true, reserve exact:true, review visible:true), and the composer continues after a refused conversation send.
  - Now: These lines are unchanged: review.vibe:362 (exact: true), :451 (reserve exact: true), :474 (review visible: true). composer.vibe:300 binds and carries on. The open-items 'Assistant' bullet 'src/assistant/review.vibe feeds constants for facts the custody model guards on (exact: true, visible: true), and composer.vibe carries on after a refused conversation send' covers this.
  - To do: Feed the real screen and reservation facts in review.vibe, or drop the fields from spec/assistant/review.md. composer.vibe returns when client.send('send') is refused.
- **A-114** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 1. A Browser switch, close of the showing tab or page history whose presentation is skipped after the receipt is never corrected (#1453).
  - Now: Still absent. operations.vibe:241-246 `present` runs runFork(show) and returns void. review.vibe:364-368 `presented` drops the result, and no correction text exists. Recorded as the bullet starting "**Browser (#1453):** a switch, closing the showing tab and page history run after the receipt" (docs/vibestack-open-items.md, 'After merging develop through #1459'). That bullet also says OperationPorts.present returns nothing.
  - To do: Add a rule to spec/browser/session.md ('Let the agent open and drive my tabs') that gives a presentation an outcome. BrowserOperationPorts.present in src/browser/operations.vibe returns whether the change was shown, and `presented` in src/assistant/review.vibe posts the correction notice.
- **A-118** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 9. When a switch or close matches several tabs, the owner gets no pick and the request always refuses.
  - Now: operations.vibe:176 still passes `() => succeed(null)` to browser.control, so agent.vibe:143-148 refuses with "More than one tab matches...". The choice path is tested only with a fake chooser (test/browser/browser.test.vibe:250-258). Recorded as the bullet starting "Browser: a switch or close whose words match several tabs always refuses".
  - To do: Add a rule to spec/browser/session.md (agent switch/close). Add a choice port to src/browser/operations.vibe, filled by the assistant's review card (src/assistant/review.vibe plus a tab-choice view in src/web/assistant).
- **A-119** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 10. Chat page history is bound to the tab selected when the executor runs, not the tab the request was made on.
  - Now: operations.vibe:175 still reads `browser.selection()` inside the executor. The upstream ExecutorCall carries no observation, and review.vibe:362 screenCheck still sends `exact: true`. Recorded as the bullet starting "Browser: chat page history is bound to the tab selected when the executor runs".
  - To do: Record the turn's selected browser-tab and revision in src/assistant/review.vibe facts, expose it through BrowserCallFacts.of(call) (src/browser/ports.vibe), and pass it at operations.vibe:175. Add a step property to the spec/browser/session.md:668 rule.
- **A-121** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 13. Maps Share skips Alpha's share panel (Android share, Email draft, Copy link).
  - Now: src/maps/handoff.vibe still calls AlphaDevice.shareText directly. Recorded as the bullet starting "Maps: Share skips Alpha's share panel".
  - To do: Add a share rule to spec/maps/cards.md or screen.md. Reuse Browser's ShareSheet pattern in src/maps/handoff.vibe and src/web/maps.
- **A-124** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) V6. No port test drives BrowserAgent.control for switch, named close, new tab, find or history.
  - Now: test/browser/browser.test.vibe:250-265 now covers switch by name, owner pick and no pick, named close and new tab. Find and history are still untested, and none has run (Vitest cannot start). Recorded as the bullet starting "Browser: `test/browser/browser.test.vibe` now drives `BrowserAgent.control`...".
  - To do: Add find and history cases (including an observed-tab mismatch) to apps/app/test/browser/browser.test.vibe, then get apps/app Vitest running.
- **A-135** (recorded; [`alpha-camera.md`](alpha-camera.md)) 9. Scan uses the shared document modules; unsupported PDF text is refused and every failure names its reason.
  - Now: Partly fixed in 48524c353. Unsupported text is now refused, not cut: spec scanDialogs.md:167-170, scanWork.ts:204-237 UnsupportedPdfText, and scanner.vibe:206 shows the character. The OCR now takes an abort signal (scanner.vibe:125-132). Still local rewrites (scanWork.ts, scanText.ts) with no @elizaos/plugin-files import; failures still read only "Scan failed" (:135), "Unreadable image" (:199) and "PDF failed" (:206). Open items, Camera: "scan re-implements `@elizaos/plugin-files` documents locally… OCR and export failures say only 'Scan failed'/'PDF failed'…"
  - To do: Import the upstream documents modules in scanner.vibe, delete the duplicates in scanWork.ts, and map refusal reasons to sentences in src/camera/messages.vibe.
- **A-136** (recorded; [`alpha-camera.md`](alpha-camera.md)) 10. A scanned event suggestion handles zones, weekday/tomorrow and numeric dates, discloses each inference, and has its own review.
  - Now: Unchanged. src/camera/scanText.ts:101-120 suggestScanEvent handles ISO or month-name dates only; its disclosures are computed (:118) but ports.vibe ScannedEvent (:19-27) has no disclosures field. Open items, Camera: "…the scanned-event suggestion lost zone, weekday and numeric-date handling and its disclosures". Calendar's own form is the only review (the separate scan-event dialog the bullet does not mention).
  - To do: Port legacy ui/documents/scan-event.ts into scanText.ts, carry disclosures in ScannedEvent, and add the laws to spec/camera/scanDialogs.md.
- **A-144** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 7. Preparing an app update writes and verifies Inbox's waiting edit and refuses while an Inbox review, selection or attachment is open.
  - Now: shell/activity.vibe:45-48 keepDrafts still only blurs the focused field; no caller of MailComposer.flush outside src/inbox/composer.vibe. Open-items line 78 ('Preparing an app update does not write Inbox's waiting edit ...') states both the flush and the refusal while review/selection/attachment is open.
  - To do: Add a keeper port to src/shell/activity.vibe that Inbox fills with MailComposer.flush (false on a refusal or an open review/selection/attachment).
- **A-152** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 5: 'Review reminder' on a note does nothing, and reminder back-links are never stored or shown.
  - Now: Still the same: NotesScreen.tsx:135-140 toasts 'Check time'; calendar/handoffs.vibe:87 reviewNote returns false unless draft.kind === 'event'; shell/handoffs.vibe:64 ignores calendar-draft; no remember/view/open('reminder') caller. Open items line 139: '**Notes:** "Review reminder" on a note toasts "Check time" and opens nothing...'
  - To do: Make Clock consume a calendar-draft of kind reminder (src/clock create form) and call NotesOrigins.remember('reminder', id, link, true) after the readback, or hide the menu item in NoteEditor.tsx:89 until then.
- **A-162** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K4: create_note treats 'Workflows in front' as a workflow run.
  - Now: Open items line 120: '**Notes:** `create_note` still treats "Workflows in front" as a workflow run...'
  - To do: Add a port filled by the shell from DeviceReview.callFacts(call).workflow.
- **A-176** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 3. Device locale and Android 12/24-hour setting are ignored; every time uses the WebView Intl default.
  - Now: No getLocaleInfo, hour12, LocalePreferences or is24Hour in apps/app/src or apps/app/spec. The only hourCycle is the fixed h23 in src/calendar/time.ts:30. Open-items, Shell, "Not yet ported from the platform audits": "the device's locale and 12/24-hour setting (System.getLocaleInfo) are not read; every time uses the WebView's Intl default".
  - To do: Rule in apps/app/spec/settings/preferences.md (or spec/platform/index.md). A LocalePreferences service in src/platform that reads System.getLocaleInfo at startup and on resume. One shared formatter in src/web/lib used by all Intl.DateTimeFormat/toLocale* call sites.
- **A-178** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K4. spec/shell/system.md (text zoom, home-start handoff, Settings shortcuts) has no renderer path.
  - Now: Open-items, Android / native: "spec/shell/system.md (home-start handoff, text zoom, Settings shortcuts) has no renderer path".
  - To do: Renderer listeners in src/shell for the native system events named in spec/shell/system.md.
- **A-192** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G7: overdue and upcoming phone reminders must reach Home's agenda
  - Now: Overdue fixed: src/shell/integration.vibe:121-128 calls overview.reportOverdue on each published listing (rule spec/shell/overview.md 'Reminders that are overdue…'). Upcoming still absent: nextLead in spec/calendar/home.md has no caller. docs/vibestack-open-items.md:84 'G7 (upcoming): an upcoming, not yet overdue, reminder never leads Home's agenda…' states exactly what remains.
  - To do: Wire nextLead from a Clock-filled port in src/calendar/** (HomeAgendaCard) or add an upcoming-reminder rule to spec/shell/overview.md.
- **A-197** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 13. Call and text cards show the contact name, SIM, part count and that the text sends at once.
  - Now: operations.vibe:241-244 describe uses titleOf and detailOf, which give the raw number or query (:168-180). callCardText, smsSendFacts and smsPartEstimate still have no caller. open-items line 322: 'call and text cards show only the title and raw number or query…'.
  - To do: In operationPorts.describe, use the present.ts helpers with bridges.displayNames for the number.
- **A-198** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 14. The comms stage follows the real chat sheet height and voice state (AC-04 full-sheet strip).
  - Now: heightChanged and voiceChanged still have no sender under src. open-items line 323: 'the comms stage does not follow the real chat sheet: `heightChanged` and `voiceChanged` have no sender…'.
  - To do: The shell mirrors the assistant sheet height and voice state into CommsMachine.
- **A-203** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 20. An approved text is watched after 'submitted' until the phone settles it.
  - Now: actions.vibe:444-447 and :349-353 finish on the first answer, and only the owner's send is watched (drafts.vibe). open-items line 328: 'an approved text is not watched after "submitted" (`SMS_SETTLE` covers only the owner's sends)'.
  - To do: Extend the drafts send watch (or an equivalent) to card sends in actions.vibe and state it in spec/telephony/actions.md. This is moot until gap 1's card send works.
- **A-205** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 27a. Selected telephony reads are bound to the selection and session they were asked on.
  - Now: review.vibe still feeds constant custody facts. open-items line 111: '`src/assistant/review.vibe` feeds constants for facts the custody model guards on (`exact: true`, `visible: true`)'.
  - To do: Feed the real exact and visible facts from the selection recorded when the card was listed (src/assistant/review.vibe).
- **A-216** (recorded; [`alpha-voice.md`](alpha-voice.md)) 7. A message typed while voice runs is sequenced behind voice's stop and sent once.
  - Now: VoiceConversation.typedSend (voice/conversation.vibe:617) still has no caller in src. Open-items Voice bullet "A message typed while voice runs is not sequenced behind it…".
  - To do: Call voice.typedSend(send, chatCurrent) from the composer send path in src/assistant/composer.vibe (or ChatPanel onSend).
- **A-221** (recorded; [`alpha-voice.md`](alpha-voice.md)) 13. The duplex follows whether the capture really cancels echo.
  - Now: voice/conversation.vibe:578 `const echoCancelled = route !== "Direct"` still constant. Open-items Voice "The duplex ignores whether the capture really cancels echo…".
  - To do: Feed opened.echoCancelled into start / restart half-duplex in src/voice/conversation.vibe.
- **A-223** (recorded; [`alpha-voice.md`](alpha-voice.md)) 15. The reply is spoken sentence by sentence while it is generated.
  - Now: speaksEarly has no use in src; answerOf (conversation.vibe ~352) uses hooks only for ack/latency. Open-items Voice "Not ported: … the reply spoken sentence by sentence while it is generated (speaksEarly unused)…".
  - To do: Feed confirmed previews to speech.speakPieces in answerOf in src/voice/conversation.vibe.
- **A-225** (recorded; [`alpha-voice.md`](alpha-voice.md)) 21. On-device speech readiness is probed, so the privacy row can say unavailable and a network hold is lifted.
  - Now: VoiceRoute.probeOnDevice (route.vibe:115) still no caller. Open-items Voice "Not ported: … the on-device readiness probe (probeOnDevice has no caller)".
  - To do: Call probeOnDevice at voice layer start and before starts in conversation.vibe/dictation.vibe.
- **A-226** (recorded; [`alpha-voice.md`](alpha-voice.md)) 25. After an agent-opened screen keeps voice, the owner's own navigation still retires voice.
  - Now: assistantHost.vibe:136-147 openView never re-sends startVoice; integration.vibe:107-110 stops only on nav.voice true->false. Open-items Voice #1453 bullet "After a kept followScreen the shell no longer knows voice runs…".
  - To do: Re-send startVoice after a kept followScreen in shell/assistantHost.vibe or key the stop on VoiceConversation.changes.
- **A-227** (recorded; [`alpha-voice.md`](alpha-voice.md)) 26. The acknowledgement's 1.5 s echo window (speech during or just after the cue is held; cue never over the user).
  - Now: Cues can now speak (acknowledgment frame wired), so this is no longer moot. Open-items Voice "… and the acknowledgement has no echo window (legacy held speech starting within 1.5 s of the cue)".
  - To do: Feed real microphoneClear and a cue tail to the session in src/voice/conversation.vibe; rule in spec/voice/acknowledgement.md.
- **A-228** (recorded; [`alpha-voice.md`](alpha-voice.md)) 28. Dictation performs DiscloseUpload and SayCallPaused, offers Cancel while transcribing, and cancels on leaving the foreground.
  - Now: No DiscloseUpload/SayCallPaused in src; DictationButton.tsx:68 only a spinner while Transcribing. Open-items Voice "Dictation: … DiscloseUpload and SayCallPaused effects are dropped; no Cancel while transcribing; leaving the foreground does not cancel."
  - To do: Handle both effects in src/voice/dictation.vibe perform; Cancel button in DictationButton.tsx; foreground hook.
- **A-229** (recorded; [`alpha-voice.md`](alpha-voice.md)) 29. A refused voice start says why, and an invocation start is fully admitted (sensitive screen, reset, chat current, voiceUi, conversation).
  - Now: integration.vibe:55-59 invocation still admits on !hidden && no holds, chatCurrent: () => true, conversationId "" when none; talkFromChat adds !locked only. Open-items Voice "An invocation start is under-admitted … and a refused start (FinishOrDiscard, MediaNotStopped) says nothing."
  - To do: Add sensitive/reset checks and a real chatCurrent in shell/integration.vibe; render the refusal line from conversation.vibe.

**App spec**

- **A-133** (recorded; [`alpha-camera.md`](alpha-camera.md)) 5. A custom album can be renamed, deleted, and have one item removed.
  - Now: Rename and delete are fixed: the "Album options" button at PhotosScreen.tsx:121-122 calls openAlbumDialog(albumId,false), and the ManageAlbum stage renders the name input, Delete and Save (:272-289). Remove is still missing: spec/camera/albums.md:18 AlbumOp = CreateOp\|RenameOp\|DeleteOp\|AddOp, while src/camera/photos.vibe:43 keeps the store's remove. Open items, Camera: "removing one item from a custom album is gone: `AlbumOp` has no remove…"
  - To do: Add RemoveOp to spec/camera/albums.md, map it in library.vibe albumEvent, and add a remove control in an open custom album in PhotosScreen.tsx.
- **A-134** (recorded; [`alpha-camera.md`](alpha-camera.md)) 8. A draft stored before the scan opened can be resumed or deleted, and closing asks Keep or Discard.
  - Now: Unchanged. ScanReview.tsx:96 shows Delete draft only when draftOwner != NoDraft; scanner.vibe:412 removes only when stored === draftRevision; closeDocumentNow (:219-220) asks no question. Open items, Camera: "…After a restart a stored draft cannot be deleted or resumed, and Close never asks Keep or Discard".
  - To do: Add a storedBeforeOpen revision and a close question to spec/camera/scan.md; implement them in scanner.vibe and add two buttons in ScanReview.tsx.
- **A-142** (recorded; [`alpha-camera.md`](alpha-camera.md)) 31. The camera specs have generated conformance drivers and rendered-UI tests.
  - Now: apps/app/test/drivers has only notes, telephony and workflows drivers. Open items, Camera: "…no conformance driver for any camera spec, and no rendered-UI test for Camera or Photos".
  - To do: Add camera__* drivers under apps/app/test/drivers and rendered Camera/Photos tests (accessibility, layout and grid density).
- **A-181** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) U4. Generated names the platform area assumes (resetCarried, adoptionOf, legacyCleared, SlotAdoption, headerAdmitted, DeviceHeader) may not exist.
  - Now: No apps/app/gen in the tree to check against. Open-items, Unverified: "Generated names: ... platform: resetCarried, adoptionOf, legacyCleared, SlotAdoption, headerAdmitted, DeviceHeader". Settle with `pnpm gen && rg -n 'resetCarried\|adoptionOf\|legacyCleared\|SlotAdoption\|headerAdmitted\|DeviceHeader' apps/app/gen`.
  - To do: Run pnpm gen and pnpm typecheck; rename the call sites to the generated names.
- **A-208** (recorded; [`alpha-tooling.md`](alpha-tooling.md)) G4: model checking dropped from bounded symbolic, TLC liveness and comparison runs to seeded simulation only.
  - Now: promotion.yml still has a single `spec` job running `pnpm check`, with no `--nightly` and no `quint verify`. Only apps/app/spec/maps/location.md uses `leadsTo`. Open-items bullet: "Model-checking depth: CI runs the seeded simulation only…".
  - To do: Add a promotion job that runs `spec.ts check --nightly` and `quint verify --max-steps 6` over gen modules. Add leadsTo and fair_ rules to spec/account/signIn, google, calendar, maps, camera, notes and files.

**App UI**

- **A-098** (recorded; [`alpha-android.md`](alpha-android.md)) 12. Contact lookups contactForNumber/searchContacts moved off AlphaTelephony; it is unconfirmed that cards still name people using Android's own number matching.
  - Now: Partly answered now. Upstream AlphaContacts.resolveNames uses PhoneLookup.CONTENT_FILTER_URI (eliza-vs packages/os/android/contacts/.../ContactNames.java:62), and the renderer calls it only for list display (telephony/phone.vibe:80, voicemail.vibe:82, messages.vibe:125 via bridges.vibe:51). AlphaTelephonyBase.contactNumber (:889-892) keeps PhoneLookup through AlphaContactLookup, for SMS only. Whether the call approval card's name (spec/telephony/comms.md:205, AC-20) comes from PhoneLookup was not traced. Open-items line 203 ('…confirm `AlphaContacts.resolveNames` keeps Android's own number matching') and line 368 (contact-save duplicate check now uses contacts.list) record it.
  - To do: Have the call card resolve its name through displayNames/resolveNames (src/telephony/actions.vibe), and use resolveNames for the new-contact duplicate check.
- **A-110** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 15. Older messages cannot be loaded (Composer.older has no UI caller).
  - Now: composer.vibe:565-571 implements older() and hasMore. rg finds no older() call in src/web. The same 'Chat UI behaviour...' bullet covers this ('loading older messages (Composer.older() has no caller)').
  - To do: Add a top sentinel or 'Earlier messages' control in src/web/assistant/Transcript.tsx when hasMore, calling Composer.older().
- **A-111** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 16. The transcript keeps no reading position and does not follow the newest message.
  - Now: No scrollTop/scrollIntoView/IntersectionObserver in src/web/assistant. The same 'Chat UI behaviour...' bullet covers this ('keeping the reading position and following new messages').
  - To do: Add a rule in spec/assistant/reply.md, with scroll anchoring code in ChatPanel.tsx/Transcript.tsx.
- **A-112** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 17. No message Copy, text selection or message actions menu.
  - Now: No clipboard or Copy in src/web/assistant or src/assistant. The same 'Chat UI behaviour...' bullet covers this ('message Copy and text selection').
  - To do: Add a rule in spec/assistant/conversation.md and a Copy control in src/web/assistant/Transcript.tsx.
- **A-128** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) 10. Device-calendar create, its creation recovery (Check / Create separately) and the Android Calendar hand-off/editor are reachable.
  - Now: Create on a phone calendar is now reachable (EventEditor calendar select; screen.vibe:328-337 routes by newEventTarget/deviceRoute, AndroidHandoff → device.handoff). Still dead: checkCreations/openExternal/separate have no UI caller (rg in web/calendar and screen.vibe finds none); form has no guests/alert/video fields; existing all-day/other-zone/repeating device events saved via plain save (screen.vibe:338-343). Recorded to the same extent: open-items :127 'Calendar's device create is reachable now (a phone calendar chosen in the form), but its recovery surfaces are not…'.
  - To do: Surface useDeviceWrites pending/failed recovery with Check (DeviceCalendar.checkCreations) and Create separately (openForm(…, separate)) in CalendarScreen.tsx/EventEditor.tsx; route existing options events by deviceRoute to openExternal in screen.vibe.
- **A-132** (recorded; [`alpha-camera.md`](alpha-camera.md)) 4. The viewer swipes between items and zooms/pans 1x-8x.
  - Now: Swipe is fixed: commit d5ce36e54, PhotosScreen.tsx:102-106 step() calls library.swipe, with pointer swipe and arrow keys at :222-227. Zoom and pan are still absent: the viewer is a plain <img>/<video> (:229), and zoomedTo/pans/doubleTapped have no UI caller. Open items, Camera: "viewer zoom and pan are modelled (`zoomedTo`/`pans`/`doubleTapped` in `gen/camera__media`) but no control calls them; the viewer swipes…"
  - To do: Add pinch, double-tap and pan handlers to the viewer in PhotosScreen.tsx (or a new PhotoViewer.tsx) that send the gen/camera__media zoom and pan events.
- **A-138** (recorded; [`alpha-camera.md`](alpha-camera.md)) 12. The Photos grid is virtualised, pages on scroll, and keeps thumbnails only around visible rows.
  - Now: Unchanged. There is no virtualisation in PhotoGrid.tsx; "Show more" is at PhotosScreen.tsx:190; library.vibe:172 reads every page with thumbnails:true; store.thumbnails has no caller. Open items, Camera: "the Photos grid is not virtualised, pages by a 'Show more' button and keeps every thumbnail in Machine state".
  - To do: Add virtual rows and an intersection sentinel calling library.more() to PhotoGrid.tsx, a thumbnail window via store.thumbnails, and the rule in spec/camera/library.md.
- **A-157** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 11: A denied microphone should open the startup-permissions step for the microphone.
  - Now: No ShellPermissions/reopen use under src/notes or src/web/notes; messages.ts:15 still shows 'Mic off'. Open items line 141: '**Notes:** a denied microphone shows "Mic off" and a retry...'
  - To do: Add a rule to spec/notes/recorder.md; have NotesScreen.tsx open the startup-permissions microphone step on MicOff (expose a step-by-name entry on ShellPermissions).
- **A-164** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K6: Held values have no review UI, and tests do not cover them.
  - Now: Open items lines 192-193: 'Nothing reviews held values yet...' and 'Tests and drivers under `test/{inbox,notes,telephony}` are not updated...'
  - To do: Add a DeviceStorage.held review surface and tests.
- **A-191** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G5: landscape side-by-side layout and fitted 412 px canvas; swipe zones in canvas pixels
  - Now: No src/web/shell or assistant file reads alpha-landscape/alpha-wide/--alpha-canvas-width (only MapsScreen.tsx:96 uses the landscape variant); ShellRoot.tsx:182 still passes raw clientX/clientY to swipe. docs/vibestack-open-items.md:82 'G5: no landscape arrangement and no fitted 412 px canvas…' states it in full.
  - To do: src/web/shell/ShellRoot.tsx + src/web/assistant/AssistantDock.tsx consume the geometry classes; scale pointer coordinates by canvasWidth/innerWidth before swipe (or parameterise swipe in spec/shell/gestures.md).
- **A-200** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 16. Dictation in the comms bar and hold-Alpha-to-talk (AC-12).
  - Now: No screen passes onDictate (CommsBar.tsx:96 is disabled without it), and the Alpha button handles only a click. open-items line 324 ('dictation in the bar and hold-Alpha-to-talk (AC-12): no screen passes `onDictate`') and line 158.
  - To do: Mount dictation in PhoneScreen and MessagesScreen through onDictate, and add a long-press on the Alpha button in CommsBar.tsx that starts a voice turn.
- **A-220** (recorded; [`alpha-voice.md`](alpha-voice.md)) 12. Voice failures name their reason (401/402/403/429 with reset time, no speech, denied mic with Settings).
  - Now: failureMessage (voice/failure.vibe:94) still has no src caller; ConversationPanel shows "Voice stopped" (web/voice/messages.ts shownLabel). Dictation uses microphoneMessage for denied/no mic only (messages.ts:53-54). Open-items Voice "Voice failures give no reason…".
  - To do: Keep last RefusalFacts in conversation/dictation services; render failureMessage in ConversationPanel.tsx and DictationButton.tsx; add reset time in failure.vibe.
- **A-224** (recorded; [`alpha-voice.md`](alpha-voice.md)) 17. Dictation in the Messages and Phone bars.
  - Now: web/telephony/CommsBar.tsx:96 still disabled unless onDictate; no parent passes it; DictationControl only in ChatPanel.tsx:153. Open-items Voice "Dictation: not mounted in the Messages and Phone bars…" and AC-12 bullet.
  - To do: Mount DictationControl with a comms DictationTarget in MessagesScreen/PhoneScreen bars.
- **A-234** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 6. Turning a workflow on checks that notifications are on and offers settings when they are off.
  - Now: No notification check near the switch in WorkflowsScreen.tsx:183-211. Open-items 'Workflows, screens not ported: … the check that notifications are on when a workflow is turned on (legacy #1403)'.
  - To do: Add a rule to spec/workflows/notices.md and a line under the switch in WorkflowsScreen.tsx using AlphaNotifications permission state.
- **A-240** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 20. The prompt editor offers time/day presets, reviews before save, and binds the delivery conversation.
  - Now: Open-items 'prompt presets and the delivery conversation in PromptSheet (savePrompt sends no deliveryConversationId, so saveConfirmed's check is vacuous)'. The review-before-save part is not named in that bullet. The bullet does say 'presets', which is the main loss.
  - To do: Add presets and a review step in PromptSheet.tsx. Pass the current conversation id through Automations.savePrompt.

**Tooling and CI**

- **A-123** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) V1. There are no browser__* or maps__* conformance drivers.
  - Now: apps/app/test/drivers holds notes, telephony and workflows drivers only. Recorded in the bullet starting "Browser: `test/browser/browser.test.vibe` now drives `BrowserAgent.control`...": "there are no `browser__*` or `maps__*` conformance drivers".
  - To do: Add apps/app/test/drivers/browser__session.ts, maps__plane.ts and maps__screen.ts.
- **A-165** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K7: Tesseract OCR assets are not set up, so local OCR to a note cannot run.
  - Now: Open items line 228: 'The Tesseract OCR assets are not set up:'
  - To do: Add tesseract.js-core and @tesseract.js-data/eng to apps/app/package.json and serve them under apps/app/public/ocr/.
- **A-174** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14h (KNOWN). Owner route parity tests and owner-routes.json stale rows are checked (OwnerRoutesTest).
  - Now: open-items: 'These tests still target removed code: owner-route-parity (including its JVM half)…' (line 248).
  - To do: Rewrite test/owner-route-parity.test.mjs against android/agent/host.json and owner-routes.json, and add it to root-tests run.
- **A-184** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 15. spec/settings/native.md is a model nothing calls (no gen/settings__native import, no JVM driver).
  - Now: No settings__native import under apps/app/src or apps/app/test. The legacy native Quint models and Java harnesses remain in specs/quint. Open-items: "Settings: spec/settings/native.md describes Java and release tooling that nothing calls (no gen/settings__native import, no JVM driver)…".
  - To do: Add a JVM conformance driver per native.md rule, or declare the legacy specs/quint/native models as the authority and run their harnesses.
- **A-185** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 17. There is no conformance driver for settings or account.
  - Now: apps/app/test/drivers/ still holds only notes, telephony and workflows drivers (10 files). Open-items: "There are no settings__*/account__* conformance drivers".
  - To do: Add test/drivers/settings__updates.ts, account__signIn.ts and account__session.ts.
- **A-212** (recorded; [`alpha-tooling.md`](alpha-tooling.md)) G23: scripts/os-ported/** are stale copies, and android-instrumentation.ts names eight removed device-campaign scripts (restart, permission revoke, installed upgrade, reminders).
  - Now: Open-items bullet: "`scripts/os-ported/**` and the harness scripts (`android-instrumentation.ts`…) are still to be rewritten onto `@elizaos/os/image`… `scripts/android-instrumentation.ts` names eight removed campaign scripts."
  - To do: Rewrite scripts/android-instrumentation.ts campaigns onto @elizaos/os/image, and replace os-ported/** with upstream imports.
- **A-215** (recorded; [`alpha-voice.md`](alpha-voice.md)) 5. Both host records carry forkPin 5c5d6163… with library hashes built from 6337fd4c…, contradicting test/host-speech-admission.test.mjs.
  - Now: android/voice-host/qualified-voice-host.json:5 and android/embedding-host/qualified-host.json:3 still 5c5d6163c81c…; test/host-speech-admission.test.mjs:44-45 asserts 6337fd4c… (legacy-retirement.json:6606 marks it mapped). Open-items Voice bullet "The on-device speech records disagree with the scripts: … both host records carry forkPin 5c5d6163… with the library hashes of 6337fd4c…. Regenerate them with a build." and line 205.
  - To do: Restore forkPin 6337fd4c… in both records or rebuild at the pin and record new hashes.

**Upstream eliza**

- **A-105** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 8. A quoted reply is display-only; replyToMessageId is not sent.
  - Now: No replyToMessageId in the port's src or spec; the quote lives only on the local row (composer.vibe:365-368). Upstream turns.vibe has only the agent's own inReplyTo (lines 243, 356, 380) and no owner reply-to field. The open-items 'Assistant' bullet 'A quoted reply is display-only: replyToMessageId is not sent, and upstream vibestack-dp has no turn field for it' covers this.
  - To do: First add an upstream turn-body reply-to field in packages/agent conversation/turns.vibe. Then composer.vibe sends it, with a rule in spec/assistant/conversation.md.
- **A-143** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 4. A reply goes to the message's Reply-To, else its sender.
  - Now: gmail.vibe:120 and saved.vibe:52 still set replyTo: ""; composer.vibe:248 would use it if filled; eliza-vs packages/plugin-inbox has no replyTo field in its read result. Open-items line 273 ('**plugin-inbox:** a read message carries no Reply-To ...') states it in full.
  - To do: Add replyTo to upstream plugin-inbox GmailReadResult and wire.schema.vibe, then fill it in src/inbox/gmail.vibe body() and saved.vibe.
- **A-163** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K5: No shared-note read-reply lease; read_selected_notes/create_note can be refused DEVICE_STEP_UNSUPPORTED.
  - Now: Open items line 266 (agent/client): 'there is no shared-note read-reply lease (`readReply`/`completeReadReply`)'. Upstream eliza-vs workflow-offer.vibe:93 now refuses DEVICE_STEP_UNSUPPORTED only when binding/capability is missing, so the helper half is closed at the pin.
  - To do: Add readReply/completeReadReply upstream in packages/agent client, then repin.
- **A-218** (recorded; [`alpha-voice.md`](alpha-voice.md)) 10. A reviewed voice request settles after approval (and legacy resumed listening); the Cloud relay ends on review.
  - Now: reviewSettled (voice/conversation.vibe:614) still uncalled; upstream eliza-vs has no awaitingReview anywhere in packages/agent/src, so reviewNeeded never fires. Open-items Voice bullet "A reviewed voice request never settles…", upstream bullet "the strict DoneFrame refuses awaitingReview", and OWNER sub-bullet "after an approved or declined review the conversation retires, where legacy resumed listening".
  - To do: Upstream DoneFrame awaitingReview; then call voice.reviewSettled() from the approval settlement and end the stream in the reviewNeeded branch.
- **A-219** (recorded; [`alpha-voice.md`](alpha-voice.md)) 11. Microphone Mute (and the automatic 'paused while Alpha responds' state) in a conversation.
  - Now: No muteMicrophone in src; upstream packages/agent/src/voice/session.vibe has no mute. Open-items Voice "Not ported: microphone Mute (also missing upstream)…".
  - To do: Add microphone mute to upstream spec/agent/voice/session.md and session.vibe, then a rule in spec/voice/conversation.md and a button in web/voice/ConversationPanel.tsx.
- **A-231** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: strict DoneFrame refuses awaitingReview, so the voice review stop cannot trigger.
  - Now: No awaitingReview in eliza-vs packages/agent/src. Open-items upstream bullet "the strict DoneFrame refuses awaitingReview…".
  - To do: Upstream DoneFrame field.
- **A-237** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 12. A Google-through-Cloud digest grant calls /api/workflow/hosted/cloud-delegation/*, which upstream does not serve.
  - Now: api.vibe:36 and wire.schema.vibe:167-170 still target cloud-delegation. No such route in eliza-vs/packages (only a test mention). Open-items 'Workflows, upstream routes: src/workflows/sources.vibe calls /api/workflow/hosted/cloud-delegation/…'.
  - To do: Add the routes upstream, or move the grant to src/account/delegation.vibe.

**Owner decision**

- **A-095** (recorded; [`alpha-android.md`](alpha-android.md)) 7. Upstream AgentStartReceiver starts the resident at boot and after every update whenever signedIn(), bypassing Alpha's ResidentScheduleReceiver shouldAutoStart owner gate.
  - Now: Neither manifest (android/app/manifests/main and launcher) removes ai.eliza.os.agent.AgentStartReceiver; there is no tools:node="remove" for it. AlphaAgentCredentials.current() still always returns an Active, falling back to the local account at line 26. ResidentScheduleReceiver is still declared (main manifest:132). spec/platform/resident.md:4 says 'The agent always runs locally', which leans toward dropping the gate. Open-items line 61, '**OWNER:** Upstream's `AgentStartReceiver` (agent-service module manifest) starts the resident at boot…', states it to the same extent.
  - To do: After the owner decides, either add <receiver android:name="ai.eliza.os.agent.AgentStartReceiver" tools:node="remove"/> to android/app/manifests/main/AndroidManifest.xml, or delete the shouldAutoStart gate in ResidentScheduleReceiver. Record the decision in spec/platform/resident.md.
- **A-122** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 18. Google return links (GoogleLink, CloudRequests custody, native appReturn) have no consumer.
  - Now: Still recorded in three bullets: "**OWNER:** Browser's `GoogleLink` (`src/browser/googleReturn.vibe`) and `CloudRequests`...", "The Google App Link `appReturn` has no native source" and "Java-side host models are missing: ... GoogleBrowserReturnClaim".
  - To do: Owner decides absorb or drop. Then either wire src/browser/googleReturn.vibe and cloudCustody.vibe or delete them, and add the native appReturn source in android/.
- **A-129** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) 11. Reminders appear as Calendar rows, the form can make one, and Home's next line takes whichever comes first.
  - Now: web/calendar/layout.ts still builds rows from agent feed and device read only; nextLead has no caller. Recorded: open-items :32 '**OWNER:** Reminders are no longer Calendar rows…' (and :84 G7, :56).
  - To do: Owner decision; if kept, a CalendarReminders port filled by Clock merged in layout.ts and nextLead called from HomeAgendaCard.tsx.
- **A-141** (recorded; [`alpha-camera.md`](alpha-camera.md)) 27. Photos reads (search, inspect) run locally without review.
  - Now: Open items, OWNER: "The assistant's Op set has no Photos read class, so Photos reads (search, inspect) use PhotosChange and always need review." Unchanged in operations.vibe.
  - To do: Owner decision; if accepted, add PhotosRead to spec/assistant/review.md and classOfOperation in src/camera/operations.vibe.
- **A-148** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 11. Saved mail moved from the encrypted connected-read-cache:v1 slot to WebView localStorage, and the legacy slot is never read or cleared.
  - Now: saved.vibe:77-97 uses the layer's KeyValueStore; layer.vibe:42-50 provides mailStore only to the drafts/journal machines (Layer.provide), so saved gets the platform localStorage store; keys.savedMail (store.vibe:11) unused. Open-items line 33 ('**OWNER:** Saved mail moved from the encrypted `connected-read-cache:v1:<sha256>` slot ...') states it in full.
  - To do: Provide mailStore (with a savedMail slot pattern in RendererCredentialSlots.java) to saved in src/inbox/layer.vibe and clear connected-read-cache:v1 once, or record the owner's acceptance.
- **A-149** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 12. The agent's Gmail body reads (32,000 chars) and agent archive/Trash/read-state changes have no counterpart.
  - Now: Open-items line 35 ('**OWNER:** The agent's Gmail body reads and mailbox changes ...') names the 32,000-character reads, archive, Trash, read state, policy.json admitting only INBOX_READ/INBOX_COMPOSE_EMAIL and no upstream change action. Line 209 adds that host.json launches with gmailChanges:false.
  - To do: Owner decision; if kept, upstream plugin-inbox managed read gains a body read and a reviewed change action, mirrored in packages/plugin-inbox/src/agent and admitted in android/agent/policy.json.
- **A-160** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K2: Legacy Trash import gives new IDs and a fresh deletedAt, and recordings stay in the device audio trash.
  - Now: Open items line 53: '**OWNER:** Accept the legacy Trash import limits in Notes...'
  - To do: Owner decision.
- **A-167** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 3. Cancellation works on WebView 113, which lacks AbortSignal.any (legacy fallback helper).
  - Now: Unguarded AbortSignal.any is still at apps/app/src/browser/page-text.ts:74, at upstream eliza-vs packages/agent/src/client/index.vibe:324,347,363,426,427,461, and at packages/os/src/bridges/page-source.vibe:15. No anySignal helper exists and no minimum WebView is stated in spec or Android. open-items: '**OWNER:** The minimum supported WebView: legacy supported WebView 113 (no `AbortSignal.any`); state the floor or add the fallback.' (line 58), repeated at line 91. Line 226 notes that es2024 APIs (Promise.withResolvers and others) depend on the same decision.
  - To do: Owner states the floor in apps/app/spec/platform/index.md and enforces it at startup, or adds an anySignal helper upstream in packages/agent/src/client and packages/os/src/bridges, used by page-text.ts too.
- **A-179** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K5. An Alpha mms_send operation settles as unavailable.
  - Now: Open-items, OWNER Telephony: "an Alpha mms_send operation settles as unavailable, with no card".
  - To do: Owner decision; then an MMS card and native dispatch in telephony.
- **A-180** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K6. Legacy slots inbox-operation:v1, notes-draft:v1:device, inbox-drafts:v1:chat and alpha-proposal:v1 are not carried over.
  - Now: Open-items, OWNER "Legacy slots not carried over" and "Telephony" bullets. notes-draft:v1:device is now readable in the Previous notes sheet (src/notes/previous-device-notes.ts:4) but still not adopted.
  - To do: Owner decision per slot (the inbox-operation one risks a duplicate send).
- **A-187** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 22. Eight already-known items: Add funds Cloud scope, invoice.stripe.com, password rows and backup, mock mode, internetValidated, client-devices routes, import cycle, appReturn.
  - Now: All are still in docs/vibestack-open-items.md: line 14 ("Should Add funds be offered only on Eliza Cloud"), line 22 ("Payment pages now open only on checkout.stripe.com"), lines 48-49 (Proton Pass rows, "Back up passwords" never shows), line 10 ("Should there be a mock-mode runtime"), line 186 ("AppLifecycle's Net has no unvalidated state"), line 187 ("Not verified: that the owner route table admits /api/client-devices"), line 188 ("Not verified: the import cycle"), and line 213 ("The Google App Link appReturn has no native source").
  - To do: Owner decisions as listed. appReturn needs a native source in android.
- **A-190** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G4: an upward swipe on Home opens chat (legacy: only the dock), and downward swipe lowers chat
  - Now: spec/shell/gestures.md still has RaiseAssistant; ShellRoot.tsx:184 acts on it. The other parts are fixed: transcript/composer/selection exclusion (ShellRoot.tsx:96-101 readersGesture, :172) and lowering to restOf(nav.app) (:183). docs/vibestack-open-items.md:54 '**OWNER:** An upward swipe on Home opens the chat sheet…' states exactly this and that the exclusions now hold.
  - To do: Owner decision; if legacy wins drop RaiseAssistant from `swipe` in spec/shell/gestures.md and the branch at src/web/shell/ShellRoot.tsx:184.
- **A-214** (recorded; [`alpha-voice.md`](alpha-voice.md)) 3. Network voice requires a recipient disclosure that legacy did not have, held only in memory so it is asked again after each restart; an invocation on an undisclosed route is refused silently.
  - Now: Disclosure is now reachable (useVoiceTalk in ChatPanel shows SpeechDisclosure, then c.disclose()), but the flag lives only in the conversation Machine (voice/conversation.vibe:590 disclose sends to the in-memory Machine; no KeyValueStore). docs/vibestack-open-items.md OWNER bullet "Voice choices the port made that legacy did not: - network voice (Cloud, Cartesia) listens only after a one-time disclosure…" states memory-only and the silent invocation refusal.
  - To do: Owner decides keep/persist/drop; if persist, store the disclosed routes in the owner-keyed KeyValueStore from src/voice/layer.vibe and state it in spec/voice/conversation.md "Network voice listens only after its recipient was disclosed…".
- **A-217** (recorded; [`alpha-voice.md`](alpha-voice.md)) 9. Clef end-of-turn in Cloud is on, posting each Cloud turn's transcript to /api/v1/decisions, where legacy kept it off.
  - Now: voice/conversation.vibe:85 CLEF_PATH, :429-430 posts {kind:"turn",transcript} when endpointerOf(route)==="ClefInCloud"; spec/voice/conversation.md:96. Open-items OWNER "Voice choices…" sub-bullet "Clef end-of-turn scoring in Cloud is on…".
  - To do: Owner decision; if off, gate ClefInCloud behind an owner switch in spec/voice/conversation.md and conversation.vibe.
- **A-222** (recorded; [`alpha-voice.md`](alpha-voice.md)) 14. Stop while Alpha is thinking lets the accepted reply finish in chat instead of aborting the turn.
  - Now: Upstream session.vibe:92,196-200 still aborts the turn on stop. Open-items OWNER "Voice choices…" sub-bullet "Stop while Alpha is thinking aborts the agent's turn…".
  - To do: Owner decision; if legacy kept, a stopKeepsReply profile field upstream and rule in spec/voice/conversation.md.
- **A-238** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 15. A workflow can be built or edited step by step, and the draft review shows each step's scope.
  - Now: DraftSheet.tsx:49-51 still lists operation labels only. WorkflowsScreen.tsx:309 always calls save() with no id. Open-items OWNER bullet 'The legacy manual workflow step editor … is not ported … Retire the editor, or port it?' covers both the scope display and 'Change'.
  - To do: Owner decision. Then show the step scope in DraftSheet.tsx and add a Change control calling save(workflowId).

### Low (93)

**Android**

- **A-247** (recorded; [`alpha-android.md`](alpha-android.md)) 21. Smaller differences: the foreground-service subtype text, the wifi module's CHANGE_NETWORK_STATE being stripped, removed plugin methods (HostedDelivery.polling has no caller), and the verifyNativeGoogleHost pre-build check dropped.
  - Now: The manifests request CHANGE_WIFI_STATE but not CHANGE_NETWORK_STATE. product.gradle has no verifyNativeGoogleHost or runtime-profile check. Open-items line 204, 'The new `wifi` module's `CHANGE_NETWORK_STATE` is stripped…; `product.gradle` lost the `verifyNativeGoogleHost` pre-build check', records both. Not recorded, but cosmetic or dead code: the specialUse subtype text (launcher manifest :76 now just tools:replace) and HostedDelivery.polling, which has no caller.
  - To do: Add CHANGE_NETWORK_STATE to android/app/manifests/main/AndroidManifest.xml if Wi-Fi join is offered. Restore a runtime-profile --verify-native task in android/app/product.gradle or record its retirement.
- **A-328** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 6. spec/platform/rendererRecovery.md has no consumer and no native conformance driver over RendererRecoveryBudget.java.
  - Now: No gen/platform__rendererRecovery import in apps/app/src or apps/app/test. The only test is platform.test.vibe:646-654 (recreated page). MainActivity.java:173,440 still drive the retained Java, so behaviour is kept. Open-items, platform audits bullet: "spec/platform/rendererRecovery.md has no consumer and no native conformance driver over RendererRecoveryBudget.java".
  - To do: A JVM conformance driver for platform__rendererRecovery over RendererRecoveryBudget, run in android.yml.
- **A-426** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: no native conformance driver for voice__keyboard.
  - Now: Open-items line 214 "There is no native conformance driver for voice__keyboard."
  - To do: Add a JVM driver.
- **A-444** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 25c. KNOWN: the Calendar range read stays in-process with no foreground guard.
  - Now: WorkflowBridgeHost.java:125 still reads natively. Open-items 'WorkflowBridgeHost.perform still reads read_calendar_range in-process…'.
  - To do: Forward to Calendar's operationPorts, or add a foreground check in WorkflowBridgeHost.java.

**App shell**

- **A-276** (recorded; [`alpha-camera.md`](alpha-camera.md)) 15. Browser build: the photo library is stored in IndexedDB with locks, not one localStorage value.
  - Now: src/camera/browserPhotos.vibe is unchanged apart from typing (9fa9e5adc). Open items, Camera: "browser build only: the whole photo library is one `localStorage` value…"
  - To do: Put an IndexedDB-backed store behind browserPhotoStore and state the storage in spec/camera/albums.md.
- **A-277** (recorded; [`alpha-camera.md`](alpha-camera.md)) 16. Browser build: recordings follow zoom and mirror; only a real denial reads as microphone denied.
  - Now: browserCamera.ts is unchanged (9fa9e5adc touched one line). Open items, Camera: "…recordings ignore zoom and the front mirror, and every microphone failure reads as denied…"
  - To do: In browserCamera.ts, record a canvas captureStream when zoomed or mirrored, and classify microphone failures by error.name.
- **A-285** (recorded; [`alpha-camera.md`](alpha-camera.md)) 25. Browser build: torch-only flash, read-back of the torch setting, and front lens maxZoom 1.
  - Now: Open items, Camera: "…the flash cycles Off/Auto/On with no torch read-back and the front lens zooms to 8×". browserCamera.ts is unchanged.
  - To do: In browserCamera.ts, read the torch setting back, set front maxZoom to 1, and give the browser build a two-step flash.
- **A-300** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 9: A kept draft of a never-saved new note must be offered back and must not overwrite another.
  - Now: Still keyed by noteId '' (editor.vibe:130-140); drafts.vibe merged() filters by noteId; offer only from openNote. Open items line 140: '**Notes:** a kept draft of a never-saved new note is kept under `noteId: ""`...'
  - To do: Key kept additions by creationId in drafts.vibe and show them on bind through keptReviews in editor.vibe.
- **A-302** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 15: The legacy Files Recent index (alpha.files.recent.v1 / alpha.files.open.v1) should carry over.
  - Now: No reader of either key under apps/app/src. Open items line 145: '**Files:** the legacy Recent index (`alpha.files.recent.v1`, `alpha.files.open.v1`) is not read into Recent...' Orphaned grants recycle in the native table (32, oldest-first).
  - To do: Read the old keys once into Recent in src/files/preview.vibe, or delete them.
- **A-350** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 21b. Nothing reconnects the resident after a cancelled update (legacy captureAppUpdateReconnect).
  - Now: No resume in UpdateState, and nothing runs on Ended in updates.vibe. Open-items: "Settings: nothing captures a reconnect of the resident across a cancelled update (legacy captureAppUpdateReconnect)…".
  - To do: In updates.vibe readActivation, on an Ended activation that was acknowledged, ask the Resident to ensure its connection. Add the rule to spec/settings/updates.md.
- **A-373** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) K5: spec/shell/system.md (home-start handoff, text zoom, Settings shortcuts) has no renderer path
  - Now: effectiveZoom/homeStart/settingsReply/specificPage/unreliableAfter referenced nowhere in src/. docs/vibestack-open-items.md:212 '`spec/shell/system.md` (home-start handoff…) has no renderer path.'
  - To do: Consume system.md from src/shell or move it to android-side spec.
- **A-376** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 12. The Phone briefing (AC-25) is shown when the chat opens on a comms subject.
  - Now: No caller of CommsStage.briefing() (comms.vibe:86) or of callsBriefing (present.ts:96) outside their definitions. open-items line 321: 'the briefing (AC-25): `CommsStage.briefing()` and `callsBriefing` have no caller'.
  - To do: Have the assistant call briefing() when the chat opens on a comms subject and add the line (src/assistant plus spec/telephony/comms.md).
- **A-380** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 23. Ring, 'Screen it' and the in-app incoming call card.
  - Now: These are still model only. Legacy had them only in the test-mocks simulated phone, so there is no loss on the image. open-items line 329: 'ring, "Screen it" and the in-app incoming call card exist only as model'; the mock-mode OWNER bullet is line 10.
  - To do: None needed for the image. Either drive ScreenProposal from the CallWatch ring, or retire the model half.
- **A-407** (recorded; [`alpha-voice.md`](alpha-voice.md)) 16. On-device reply sentences are pipelined (append, playbackSegmentStarted).
  - Now: No append/playbackSegmentStarted in src/voice. Open-items Voice "Not ported: … on-device sentence pipelining (append, playbackSegmentStarted)…".
  - To do: Pass append for later pieces in src/voice/speech.vibe and admit playbackSegmentStarted in platform/native-plugins.ts.
- **A-408** (recorded; [`alpha-voice.md`](alpha-voice.md)) 18. Voice timing reaches the diagnostics export.
  - Now: Latency.entries() (voice/latency.vibe:176) has no consumer; settings/diagnostics.vibe:90 entries() is the crash journal only. Open-items Voice "Voice timing no longer reaches the diagnostics export…".
  - To do: Add latency entries to src/settings/diagnostics.vibe export; restore or drop cloudTimings in AlphaVoiceCloudPlugin.java.
- **A-410** (recorded; [`alpha-voice.md`](alpha-voice.md)) 20. 'Couldn't read the rest aloud' shown when playback breaks.
  - Now: No replyBroke send in src. Open-items Voice "Not ported: … 'Couldn't read the rest aloud' (replyBroke is never sent)".
  - To do: Send replyBroke in the speaker failure path in src/voice/conversation.vibe.
- **A-411** (recorded; [`alpha-voice.md`](alpha-voice.md)) 22. Cloud is warmed on foreground/chat open/Talk.
  - Now: Speech.warmCloud (speech.vibe:330) no caller. Open-items Voice "… Cloud warm-up (warmCloud has no caller)". Rule still lacks legacy's offline/in-flight skip.
  - To do: Call warmCloud from shell/integration.vibe on return to front and dock open; add the offline/in-flight skip to spec/voice/speech.md.
- **A-414** (recorded; [`alpha-voice.md`](alpha-voice.md)) 27. The Microphone Machine is told about foreground and permission answers.
  - Now: capture.vibe:82-83 foregroundChanged/permissionAnswered still no caller. Open-items Voice "The Microphone machine is never told about the foreground or the permission…".
  - To do: Feed both from shell/permissions.vibe and the visibility loop in shell/integration.vibe.
- **A-415** (recorded; [`alpha-voice.md`](alpha-voice.md)) 30. A short call behind the call screen is reported on return; a 12-digit run is refused as a likely card.
  - Now: integration.vibe:91-100 reads call at hide and return (not 'since'). Open-items Voice "Smaller differences: a short call that starts and ends behind the call screen is not reported on return; a 12-digit run is no longer refused…".
  - To do: Track call-since-hide via CallWatch in integration.vibe; 12-digit pattern in src/voice/spoken-text.ts.
- **A-425** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: relay listener registered after one yieldNow.
  - Now: Open-items Voice "The relay's listener registration is forked with one yieldNow…".
  - To do: Native.listen registration signal, then await it in src/voice/stream.vibe.
- **A-437** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 18. The open run is sent to chat as the selected object (workflow-run).
  - Now: Open-items 'the open run as the chat's selected object (workflow-run)' and line 106 'A turn names no selected record other than…workflow runs'.
  - To do: Add a TurnSources member from src/workflows/place.vibe and a rule in spec/assistant/context.md.

**App spec**

- **A-270** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) 14. Modelled Calendar decisions have callers (confirmsDelete, undoQueuedDelete, eventChanged, shiftedOffset, scopeNeeded, editorMutability, returnDay, sourceShown, phoneFreshness, readStart).
  - Now: Unchanged: service methods confirmsDelete/undoQueuedDelete/eventChanged exist in requests.vibe:43-53,100-125 but no caller of .confirmsDelete(/.undoQueuedDelete(/.eventChanged( in src; shiftedOffset, scopeNeeded, editorMutability, returnDay, sourceShown, phoneFreshness, readStart, agentAllDayUpdateAllowed have no reference in src; namedOutcome still parses upstream English summary (requests.vibe:71-78). Recorded: open-items :128 'Calendar decisions the spec models that the shell re-implements or never calls…'.
  - To do: Call each generated decision from the shell (requests.vibe, screen.vibe, model.vibe) or delete the rule from spec/calendar/*.md.
- **A-275** (recorded; [`alpha-camera.md`](alpha-camera.md)) 13. Photos offers Select all and Empty Recently deleted.
  - Now: Select all is fixed: PhotosScreen.tsx:196 calls library.selectAll (browse.md rule). Empty trash is still missing: there is no event, store method or control. Open items, Camera: "…Empty Recently deleted has no event, store method or control".
  - To do: Add prepareDeleteAll to spec/camera/browse.md, library.vibe and photos.vibe, and an Empty button on the TrashTab in PhotosScreen.tsx.
- **A-286** (recorded; [`alpha-camera.md`](alpha-camera.md)) 28. A test covers a chat that stays open during the reveal.
  - Now: Open items: "**No tests:** no camera test covers a chat that stays open during the reveal."
  - To do: Add a story in apps/app/test/camera/stories.test.vibe.
- **A-288** (recorded; [`alpha-camera.md`](alpha-camera.md)) 30. Dafny proofs exist for recorder admission and the video-edit clock.
  - Now: No *.proof.dfy under the camera specs. Open items, Camera: "no `.proof.dfy` beside `spec/camera/recorder.md` or `videoEdit.md`…"
  - To do: Add spec/camera/recorder.proof.dfy and videoEdit.proof.dfy, ported from the legacy lemma files.
- **A-289** (recorded; [`alpha-camera.md`](alpha-camera.md)) 32. Shell decisions (batch sizes, export status mapping, album folder rules, chat grace, message sentences) are stated in the spec.
  - Now: Recording limits are now specified (viewfinder.md:367). The rest is unchanged: viewfinder.vibe:148 still recomputes chat coverage inline. Open items, Camera: "shell decisions the spec does not state: batch sizes 20/500, the export status mapping…"
  - To do: Add the rules to spec/camera/browse.md, scan.md and viewfinder.md, and use the generated chatCovers in viewfinder.vibe.
- **A-290** (recorded; [`alpha-camera.md`](alpha-camera.md)) 33. The secure-camera spec rule is a tautology instead of naming the real image and APK checks.
  - Now: Open items, Camera: "`spec/camera/viewfinder.md`'s secure-camera rule is a tautology; the real checks are `scripts/aosp-secure-camera-contract.ts`…"
  - To do: Rewrite the rule in spec/camera/viewfinder.md to name the contract checks, or drop it.
- **A-297** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 20. Mark read/unread bypasses the operation journal, contrary to spec/inbox/operations.md.
  - Now: reader.vibe:121-145 still prepares and dispatches under a fresh newId() with no journal record. Open-items line 129 ('Inbox's mark read and unread prepare and dispatch directly under a fresh id with no journal record ...').
  - To do: Either route setRead through MailOperations.prepare/confirm or narrow the operations.md opening rule to exclude read state.
- **A-304** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 17: recordingClock has no rule, and the legacy Dafny proof was dropped.
  - Now: No recordingClock rule in apps/app/spec/notes/*.md. Open items line 144: '**Notes, models:** `recordingClock` (`src/notes/recorder.vibe`) has no rule...'
  - To do: Add a rule with a Quint block to spec/notes/recorder.md, or a .proof.dfy beside it.
- **A-305** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) 18: The Files Move/Copy destination picker has no spec rule (React-local state).
  - Now: Open items line 145: '...and the Move/Copy destination picker in `FilesScreen.tsx` is React-local state with no rule in `spec/files/mutations.md`.'
  - To do: Add a destination rule to spec/files/mutations.md and move beginDest/openDest/confirmDest into a .vibe machine.
- **A-314** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 11a. Legacy Dafny proofs (cloud-environment-selection, resident-recovery, journal-retention bounds) have .proof.dfy counterparts under apps/app.
  - Now: find apps/app -name '*.proof.dfy' finds nothing. No journal-retention bound (200 rows/30 days) is stated in the clock/calendar deletion specs. open-items: 'V1/V2: no Dafny proof and no conformance driver exists for any shell, clock or platform machine.' (line 88). The bullet does not mention the missing journal-retention bound.
  - To do: Add platform .proof.dfy files beside spec/platform/index.md (staging characterisation) and resident.md (lost ⇔ dead\|restarting\|booting), and add the retention bound to spec/clock/reminderJournal.md.
- **A-333** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 11. The stream's 60 s idle and 600 s turn limits live only in shell constants, with no Quint value or clocked test.
  - Now: The behaviour is present in src/platform/resident-bridge.vibe (IDLE_MS/TURN_MS). Open-items, same bullet: "...the stream's 60 s idle and 600 s turn limits are shell constants with no Quint value or clocked test".
  - To do: Put the constants in spec/platform/nativeStream.md's Quint with an invariant, and add a clocked stream test in test/platform/platform.test.vibe.
- **A-339** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) N1. No *.proof.dfy under apps/app/spec for platform.
  - Now: find apps/app/spec -name '*.proof.dfy' returns nothing. Open-items, Shell V1/V2: "no Dafny proof and no conformance driver exists for any shell, clock or platform machine".
  - To do: Add proofs where legacy specs/lemma had them.
- **A-346** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 16. There is no .proof.dfy for settings or account (legacy proved updateCheckDue, updateIdle, settingsPage, settingsNavigationRows).
  - Now: No *.dfy under apps/app/spec. Recorded in the same open-items bullet: "…and no .proof.dfy in either area (legacy proved updateCheckDue, updateIdle, settingsPage, settingsNavigationRows)".
  - To do: Add spec/settings/updates.proof.dfy and spec/settings/index.proof.dfy.
- **A-347** (recorded; [`alpha-settings-account-cloud.md`](alpha-settings-account-cloud.md)) 18. Eight settings rules have a Quint block with no invariant, law or witness.
  - Now: Recounted over spec/settings and spec/account: the same eight headings (appearance "A new phone is light…", facts "A read of the device…", index "Settings has a root…" and "Privacy's Access setup…", network "The Internet panel…", preferences "A new phone lets Alpha…", privacy "A status read is shown only…", updates "Android reports whether automatic installs are allowed…"). Open-items: "Settings: eight rules have a Quint block with no invariant, law or witness".
  - To do: Add an always, law or sometimes to each of the eight rules in the named spec/settings/*.md files.
- **A-379** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 22. Alpha's native send admission (AlphaApprovedSms, AlphaMessagesComposerPort, composerGuard) is modelled.
  - Now: No spec/telephony rule covers it. The legacy NativeSmsDispatch.qnt and its refinement files are listed in scripts/legacy-retirement.json:8988/12503/15546/16134/16141. open-items line 216, last sentence: 'Alpha's native send admission (`AlphaApprovedSms`, `AlphaMessagesComposerPort`, `composerGuard`) also has no spec rule'.
  - To do: Add the admission rule (composer port in front with focus, or a device-execution claim) to spec/telephony/drafts.md, with a JVM conformance driver.

**App UI**

- **A-248** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 18. Links in chat messages are plain text.
  - Now: No href or <a> in ReplyText.tsx or Transcript.tsx. The same 'Chat UI behaviour...' bullet covers this ('tappable links in messages').
  - To do: Add a rule in spec/assistant/reply.md, link segments in src/assistant/reply-lines.vibe, and rendering in ReplyText.tsx.
- **A-250** (recorded; [`alpha-assistant.md`](alpha-assistant.md)) 21. An empty chat never names the missing agent, and an ignored or empty reply shows an empty row (copy.ignored has no caller).
  - Now: presentation.vibe:41 ignored and :65 emptyChat 'Ask me anything.' exist; ignored has no caller in src. The 'Chat UI behaviour...' bullet covers this ('naming the missing agent in an empty chat (copy.ignored has no caller)'). It does not separately name the empty settled-reply row with controls.
  - To do: ChatPanel.tsx names the missing agent when no identity is present. composer.vibe maps an empty settled reply to copy.ignored. Add the rule in spec/assistant/reply.md.
- **A-255** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 21. MapsScreen, MapPlane, NavigationChip and BrowserScreen have no .meta.tsx.
  - Now: Still absent from src/web/maps and src/web/browser. The open-items bullet starting "**No meta file:** MapsScreen, MapPlane, NavigationChip, BrowserScreen..." now names all four.
  - To do: Add MapsScreen.meta.tsx, MapPlane.meta.tsx, NavigationChip.meta.tsx and BrowserScreen.meta.tsx.
- **A-259** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 24b. Non-Google map credits are plain text, although the spec says they keep their credit links.
  - Now: MapCredits.tsx:47-50 still renders a <span>. Recorded as the bullet starting "Maps: non-Google credits are plain text".
  - To do: Render the attribution links in src/web/maps/MapCredits.tsx.
- **A-260** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 24c. The world style's resources are not pinned to its origin with transformRequest.
  - Now: MapPlane.tsx has no transformRequest (rg finds none in src/web/maps). Recorded in the same bullet: "the world style's resources are not pinned to its origin with a `transformRequest`".
  - To do: Add a transformRequest in MapPlane.tsx that refuses world-style resources off the openfreemap origin.
- **A-281** (recorded; [`alpha-camera.md`](alpha-camera.md)) 21. Browser build: import an image into Photos and save selected media locally.
  - Now: Not present in PhotosScreen.tsx or browserMedia.ts. Open items, Camera: "…no image import into Photos and no local save…"
  - To do: Add a Save to Photos choice for a picked image and a download path in browserMedia.ts, behind the browser build.
- **A-282** (recorded; [`alpha-camera.md`](alpha-camera.md)) 22. The focus target is drawn after a tap; browser focus points are mapped through mirror and zoom.
  - Now: CameraView.tsx still has no reticle (grep shows only focusAt and the aria label). Open items, Camera: "the focus target is never drawn, and browser focus points are not mapped through mirror and zoom".
  - To do: Draw focus.md's reticle/confirmed state in CameraView.tsx, and map the point through mirror and zoom in browserCamera.ts.
- **A-284** (recorded; [`alpha-camera.md`](alpha-camera.md)) 24. Saved-copy recovery has a visible control rather than running silently when the next editor opens.
  - Now: MediaEditor.recover still has no UI caller (no 'recover' in src/web/camera/*.tsx). Open items, Camera: "saved-copy recovery runs only when the next editor opens (`MediaEditor.recover` has no UI caller)".
  - To do: Add a recovery control in PhotosScreen.tsx calling MediaEditor.recover.
- **A-298** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 21. Known items: suggestions unwired, chat draft slots not adopted, Hardware Back with open search field, no mock-mode runtime, digest retention models with Workflows.
  - Now: Open-items line 24 (MailSuggestions/SuggestionReview; SuggestionReview.tsx is mounted only by its meta), line 39 (inbox-drafts:v1:chat), line 77 (Hardware Back), line 10 (mock-mode runtime), line 194 (RendererHostedInbox/NativeHostedInbox stay with Workflows).
  - To do: As each open-items bullet says.
- **A-311** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) V2: NotesScreen, NotesRecordingIndicator and FilesScreen have no .meta.tsx.
  - Now: Still absent in src/web/notes and src/web/files. Open items line 147: '**No meta file (Notes, Files, Workflows):** ...'
  - To do: Add NotesScreen.meta.tsx, NotesRecordingIndicator.meta.tsx and FilesScreen.meta.tsx.
- **A-330** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 8. The held predictive Back gesture previews nothing; Android posts alpha-back-preview with no renderer listener.
  - Now: apps/app/src/shell/native.schema.vibe:24 still has only the schema, with no listener in src and no rule in spec/shell. Open-items, Shell G10: "the held Back gesture previews nothing; Android still posts alpha-back-preview and no rule covers it".
  - To do: Rule in spec/shell/gestures.md and a listener in src/web/shell.
- **A-353** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G10: a held predictive Back previews the layer it would close
  - Now: Only the schema (src/shell/native.schema.vibe:24) mentions alpha-back-preview; no listener, no rule. docs/vibestack-open-items.md:86 'G10: the held Back gesture previews nothing…' states it. scripts/legacy-retirement.json:2322 still maps haptics-predictive-back.spec.ts to spec/shell/haptics.md as 'mapped'.
  - To do: Rule in spec/shell/navigation.md; listener in src/shell/navigation.vibe; transform in src/web/shell/InlineSheet.tsx; correct the retirement row.
- **A-377** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 17. A quiet 'Sent to <name>' note after an owner send (AC-15).
  - Now: No 'Sent to' text under src/web/telephony. open-items line 325: 'the "Sent to <name>" quiet note after a send (AC-15) is missing'.
  - To do: Show the note in MessagesScreen.tsx when DraftSends settles a send.
- **A-412** (recorded; [`alpha-voice.md`](alpha-voice.md)) 23. What Alpha heard (interim 'heard so far' line) and live level bars in a conversation.
  - Now: ConversationPanel still shows no interim text; open-items Voice "Not ported: … the interim 'heard so far' line and live level bars in a conversation".
  - To do: interim stream on VoiceConversation and a line plus levels in web/voice/ConversationPanel.tsx.
- **A-439** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 22. Home's workflows card shows workflow names and states, not a count.
  - Now: overviewCopy still shows a count. Open-items: 'Home's workflows card names and states (it shows a count)'. The bullet leaves out that the card reads /api/automations, which is not served, so it never shows at all (see gap 3).
  - To do: Read workflows in overview.vibe from the served routes. Render names and states in the Home card.
- **A-440** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 23. Each pending approval of a run has its own review.
  - Now: Open-items 'each pending approval of a run in its own review (one is shown at a time)'.
  - To do: Show a list of reviews in PhoneStepReview.tsx, driven from notices.vibe.
- **A-441** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 24. The browser simulator and request recovery have a screen (test-mock builds only).
  - Now: Open-items 'a screen for the browser simulator and request recovery (test mocks only)'. The simulator now uses WorkflowCalendar (simulator.vibe:50,131) but still has no screen.
  - To do: Add a dev-only screen gated on ELIZA_DEV_ALLOW_TEST_MOCKS.
- **A-449** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 26c. WorkflowsScreen.tsx and ResultNoticeSurface.tsx have no .meta.tsx.
  - Now: src/web/workflows has no WorkflowsScreen.meta.tsx. Open-items 'No meta file (Notes, Files, Workflows): WorkflowsScreen, ResultNoticeSurface…'.
  - To do: Add the two meta files.

**Tooling and CI**

- **A-272** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) 16. Vibestack hygiene: retirement map points at deleted specs, no calendar conformance driver, no .proof.dfy, no .meta.tsx for CalendarScreen/HomeAgendaCard/Surfaces, shell logic the model should decide.
  - Now: scripts/legacy-retirement.json still maps sync.md 18, nativeSync.md 9, linkedLocal.md 7, preservation.md 4, disconnect.md 3, index.md 110 (googleLink.md 13 now exists); apps/app/test/drivers has no calendar driver; no calendar .proof.dfy; CalendarScreen/HomeAgendaCard/Surfaces still lack .meta.tsx. Recorded: open-items :130 'Tests and proofs: no conformance driver for any inbox__* or calendar__* module…' and :128 (namedOutcome). Not recorded: agent.vibe sent() refusal classification and sourcesReply/upcomingReply as shell-decided logic (minor).
  - To do: Repoint legacy-retirement.json calendar entries to existing specs; add calendar__* driver under apps/app/test/drivers; add .meta.tsx for the three components; calendar-days .proof.dfy for firstColumnDay/returnDay.
- **A-287** (recorded; [`alpha-camera.md`](alpha-camera.md)) 29. The generated name camera__agentCapture panelLimitMs is unverified.
  - Now: Open items, Generated names: "camera: `camera__agentCapture` `panelLimitMs`". Still imported at agentCapture.vibe:2; the commit also adds the generated imports needsCard and openLimitMs, which the bullet does not list.
  - To do: Run gen and confirm panelLimitMs, needsCard and openLimitMs exist in gen/camera__agentCapture.
- **A-315** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 11b. Platform state machines have conformance drivers (rendererRecovery vs RendererRecoveryBudget.java and others); the legacy native trace harness has a runner.
  - Now: apps/app/test/drivers has ten drivers (notes, telephony, workflows), none platform__*. open-items: '`spec/platform/rendererRecovery.md` has no consumer and no native conformance driver over `RendererRecoveryBudget.java`;' (line 96), and line 88 'V1/V2…'.
  - To do: Add apps/app/test/drivers/platform__rendererRecovery.ts over RendererRecoveryBudget.java (JVM), and platform__resident/lifecycle drivers.
- **A-318** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 11e. Generated platform names (resetCarried, adoptionOf, legacyCleared, SlotAdoption, headerAdmitted, DeviceHeader) are checked against gen output.
  - Now: open-items '## Unverified in the code-only phase' → '**Generated names:**' → 'platform: resetCarried, adoptionOf, legacyCleared, SlotAdoption, `headerAdmitted`, `DeviceHeader`;' (line 279).
  - To do: Run the generator and spec check (pnpm gen, then pnpm check in apps/app) once the area syntax errors are cleared, and confirm the names.
- **A-335** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K2. owner-route-parity (and its JVM half) targets removed code.
  - Now: Open-items, Tooling: "These tests still target removed code: owner-route-parity (including its JVM half)...".
  - To do: Rewrite test/owner-route-parity.test.mjs against apps/app/src/platform/owner-routes.json and add it to test/root-tests.json run.
- **A-366** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) V1/V2: no Dafny proofs and no conformance drivers for shell or clock machines
  - Now: No *.proof.dfy under apps/app/spec; apps/app/test/drivers has 10 files, none shell__/clock__. docs/vibestack-open-items.md:88 'V1/V2: no Dafny proof and no conformance driver…'.
  - To do: Add drivers under apps/app/test/drivers for shell__*/clock__* and proofs beside spec/shell/geometry.md and spec/clock/notifications.md.
- **A-383** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 24d. Held-value review and tests for ownerKept/follow in telephony.
  - Now: open-items lines 192-193: 'Nothing reviews held values yet…' and 'Tests and drivers under `test/{inbox,notes,telephony}` are not updated for `ownerKept`/`follow`…'.
  - To do: Add the held-value UI caller and the tests in apps/app/test/telephony.
- **A-384** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 24e. PhoneScreen, MessagesScreen, ContactsScreen, CallBar, UndoNotice, ReviewRows and PhoneInfoPanel have .meta.tsx files.
  - Now: open-items line 313: 'the runtime-bound telephony screens (PhoneScreen, MessagesScreen, ContactsScreen, CallBar, UndoNotice, ReviewRows, PhoneInfoPanel) have no `.meta.tsx`'.
  - To do: Add a .meta.tsx for each.
- **A-397** (recorded; [`alpha-tooling.md`](alpha-tooling.md)) G18: scripts/** should be typechecked in verify.
  - Now: package.json has no typecheck:scripts, and `typecheck` covers only the app and cloud. Open-items bullet: "Nothing typechecks `scripts/**`…", which also names private-runtime-launch.ts.
  - To do: Add `"typecheck:scripts": "tsc -p tsconfig.json --noEmit"` to package.json and call it from `verify`.
- **A-401** (recorded; [`alpha-tooling.md`](alpha-tooling.md)) G22: about 819 root tests and specs (plus 147 specs/quint files) still target removed code; open-items listed 7.
  - Now: Open-items now states the scale: "`pnpm test:root` runs 68 repository tests… holds 228 more… About 620 further `test/*.test.mjs` files test the legacy renderer only…", plus "These tests still target removed code:".
  - To do: Delete or port the held and renderer-only tests per root-tests.json and legacy-retirement.json.
- **A-409** (recorded; [`alpha-voice.md`](alpha-voice.md)) 19. The voice latency release gate (p50/p95 aggregation scripts and test).
  - Now: Open-items Voice "… the latency release-gate scripts are retired without a budget rule in spec/voice/latency.md; test/native-voice-latency.test.mjs imports a removed script." test file still present.
  - To do: Restore aggregator against VoiceTimingEntry or record retirement plus budget rule in spec/voice/latency.md.
- **A-416** (recorded; [`alpha-voice.md`](alpha-voice.md)) 31. Developer Cartesia realtime conversation and local voice host scripts.
  - Now: Open-items Voice "Smaller differences: … the developer Cartesia realtime conversation and the local voice host scripts are not ported." Developer-only surface.
  - To do: Port under ELIZA_DEV_ALLOW_TEST_MOCKS or record retirement.
- **A-427** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: generated names of voice__acknowledgement and voice__latency unchecked.
  - Now: Open-items line 281 "voice: voice__acknowledgement (CueTurn, …) … plus the extended voice__latency". latency.vibe now sends {type:"finish", result} (renamed field), consistent with that caution.
  - To do: Run gen and typecheck (needs build).
- **A-445** (recorded; [`alpha-workflows.md`](alpha-workflows.md)) 25f. KNOWN: the android-workflow-native.ts harness has not been rewritten.
  - Now: scripts/android-workflow-native.ts is unchanged since the checkpoint. Open-items 'scripts/os-ported/** and the harness scripts (… android-workflow-native.ts …) are still to be rewritten'.
  - To do: Rewrite it onto @elizaos/os/image.

**Upstream eliza**

- **A-312** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) V3: priorNeedsReview matches upstream's English sentence.
  - Now: Open items line 144: '...and `priorNeedsReview` matches upstream's English sentence.'
  - To do: Have upstream packages/notes/src/store.vibe expose a typed reason code, and match on that in src/notes/collection.vibe.
- **A-326** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14g (KNOWN). Peer learn/compare helpers come from upstream ./client, not local copies.
  - Now: open-items: '`src/shell/assistantHost.vibe` keeps local copies of `learnPeer`/`comparePeer`/`statusRead`…' (line 75) and line 267.
  - To do: Repin to the upstream re-export (vibestack-dp-alpha-peer-exports) and delete the local copies.
- **A-329** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 7. A cancelled connect no longer withdraws the native start (no cancelStart).
  - Now: src/platform/native-plugins.ts and upstream agent.ts still expose start/stop/restart only. spec/platform/resident.md has no cancel rule. Open-items, platform audits bullet: "a cancelled connect no longer withdraws the native start (no cancelStart upstream)".
  - To do: State it as deliberate in spec/platform/resident.md (the resident always runs under P-43), or add upstream start({id})/abortStart.
- **A-332** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) 10. Native voice turns carry no X-Eliza-Trace-Id.
  - Now: No trace-id or traceId in apps/app/src or android/app/src/main. Open-items, platform audits bullet: "native voice turns carry no X-Eliza-Trace-Id...".
  - To do: Admit the trace header in spec/platform/index.md's header rule and src/platform/resident-live.vibe once upstream's native channel carries headers (repin).
- **A-424** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: 'The email action failed' line unreachable: VoiceReplyAction has no failure flag.
  - Now: Open-items "agent/voice: VoiceReplyAction has no failure flag…".
  - To do: Upstream flag.

**Data carried across the update**

- **A-293** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 16. Drafts written on a legacy Alpha Cloud (cutover) build are adopted after the port.
  - Now: previous.vibe:20 previousEnvironments still maps only ElizaCloud/Production and ElizaCloud/Staging. Open-items line 129 ('... and drafts written on a legacy Alpha Cloud (cutover) build are not adopted, because `previousEnvironments` maps only `ElizaCloud/*`').
  - To do: Map AlphaCloud/Production to production in src/inbox/previous.vibe if cutover builds reached owners.

**Owner decision**

- **A-245** (recorded; [`alpha-android.md`](alpha-android.md)) 17. Paired-agent voice methods (pairedVoiceStatus, synthesizePaired, transcribePairedRecording and others) were removed from AlphaVoiceCloudPlugin, while the paired helper classes remain.
  - Now: Open-items line 46, '**OWNER:** Legacy paired-agent voice (pairedVoiceStatus, synthesizePaired…) is not ported', and line 346, 'Android code that #1422 itself kept: `PairedAgentCredential`, `PairedSpeechContract`, `HostedTransport`…', record both the removal and the leftover classes.
  - To do: Once the owner confirms the retirement, delete PairedSpeechContract, PairedAgentCredential and HostedTransport.
- **A-254** (recorded; [`alpha-browser-maps.md`](alpha-browser-maps.md)) 20. Developer-only Browser pieces (simulated Clock handoff, bookmark backup/reset dialog) and browser-build reminder, notification and deletion stores are not ported.
  - Now: Recorded in two OWNER bullets: "These developer-only test-mock pieces are not ported: Browser's simulated agent Clock handoff and its exact-byte bookmark backup/reset dialog" and "The browser build has no reminder, notification or deletion store". Both are browser-build or test-mock only.
  - To do: Owner decision. Then port them behind ELIZA_DEV_ALLOW_TEST_MOCKS=1, or retire them in scripts/legacy-retirement.json.
- **A-271** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) 15. Browser-local development calendar (series, guests, alerts, recovery) under ELIZA_DEV_ALLOW_TEST_MOCKS.
  - Now: No counterpart; device.vibe off-phone is android-only. Developer surface only, not reachable on a phone. Recorded: open-items :11 '**OWNER:** The browser build has no reminder, notification or deletion store… the legacy browser-local sync calendar has no counterpart' and :26 'Calendar features not ported'.
  - To do: Owner decision; none needed for the phone.
- **A-274** (recorded; [`alpha-calendar.md`](alpha-calendar.md)) KNOWN bullets from yesterday (calendarAgendaSource, Not-connected target, WorkflowCalendar consumer, read_calendar_range in WorkflowBridgeHost, CalendarSyncBridge kept, stale deviceSync/linkedProviderEvents notes).
  - Now: Still recorded: calendarAgendaSource :105, Not-connected target :31 (now opens Calendar intent), WorkflowCalendar :119, read_calendar_range :211, CalendarSyncBridge/AlphaCalendar.sync :346. The stale calendar__deviceSync generated-name bullet and linkedProviderEvents/surfacesBack are gone (no matches in open-items or src).
  - To do: none beyond the recorded bullets
- **A-283** (recorded; [`alpha-camera.md`](alpha-camera.md)) 23. Developer-only screen light and development focus targets.
  - Now: Open items, OWNER: "The Camera developer-only pieces (the screen light and the development focus targets…) are not ported. Port them behind `ELIZA_DEV_ALLOW_TEST_MOCKS=1`, or retire them?" Not in the port.
  - To do: Needs an owner decision; then port them into browserCamera.ts behind the dev flag, or record the retirement.
- **A-291** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 13. Home shows only an unread count and reads no mail, where legacy showed unread subject and sender rows.
  - Now: spec/shell/overview.md 'Home never reads mail'; open-items line 126 ('**OWNER:** Home shows Inbox's unread count only and reads no mail ...') records it for confirmation. With gap 9 fixed, the restored saved list can feed the count at start.
  - To do: Owner confirmation only.
- **A-292** (recorded; [`alpha-inbox.md`](alpha-inbox.md)) 14. To suggestions come from recent mail addresses only, no longer from Contacts.
  - Now: spec/inbox/drafts.md recent-address rule; open-items line 126 ('... and To suggestions come from recent mail only, no longer from Contacts') records it.
  - To do: Owner confirmation only.
- **A-309** (recorded; [`alpha-notes-files.md`](alpha-notes-files.md)) K1: The legacy notes-draft:v1:device slot is not adopted into the canonical draft.
  - Now: Open items line 40: 'the legacy Notes draft `notes-draft:v1:device` is deliberately not adopted...'. Its records are now readable in the Previous notes sheet ('Unsaved edits', previous-device-notes.ts:81-84).
  - To do: Owner decision.
- **A-324** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14d (KNOWN). Mock mode swaps live services for fakes (admitMockMode).
  - Now: open-items: '**OWNER:** Should there be a mock-mode runtime that swaps live services for the fakes?' (line 10).
  - To do: Owner decision.
- **A-325** (recorded; [`alpha-platform-a.md`](alpha-platform-a.md)) 14e (KNOWN). The browser build keeps reminders, notifications and deletions.
  - Now: open-items: '**OWNER:** The browser build has no reminder, notification or deletion store…' (line 11). Not reachable on the phone.
  - To do: Owner decision.
- **A-336** (recorded; [`alpha-platform-b.md`](alpha-platform-b.md)) K3. admitMockMode has no caller.
  - Now: Open-items, Owner decisions: "Should there be a mock-mode runtime that swaps live services for the fakes? admitMockMode has no caller...".
  - To do: Owner decision, then wire or drop the rule in spec/platform/index.md.
- **A-354** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G11: Home has a Notifications bell (legacy removed it) and every browser build shows a bell and stand-in shade
  - Now: ShellRoot.tsx:221 notifications={launcherHost \|\| Standalone}; HomeScreen.tsx:124-130 bell; src/web/clock/NoticesSurface.tsx:88-103 bell + NotificationShade gated on `browser`, not test mocks; spec/shell/shade.md:4 names Home's notifications control. docs/vibestack-open-items.md:55 '**OWNER:** Home grew a Notifications bell…' covers bell and the test-mock gate.
  - To do: Owner decision; to restore legacy drop the prop in ShellRoot.tsx/HomeScreen.tsx, gate NoticesSurface.tsx:88,93 on test mocks, edit spec/shell/shade.md.
- **A-355** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) G12: Clock is a new Home tile with timers, stopwatch and world clocks (legacy kept alarms in Workflows)
  - Now: spec/shell/index.md:60 clock rank 14; docs/vibestack-open-items.md:55 '**OWNER:** Home grew a Notifications bell … and a Clock tile…'. The bullet does not mention that a ringing timer rings only while the page is in front (src/clock/clock.vibe keepTime).
  - To do: Owner decision; if reverted remove clock from homeRank. If kept, note foreground-only timer ringing in spec/clock/timers.md.
- **A-374** (recorded; [`alpha-shell-clock.md`](alpha-shell-clock.md)) K1/K6/K7/K8: browser-build stores, pageVisible disagreement, calendar alert catch-up, browser simulated Clock handoff
  - Now: docs/vibestack-open-items.md:11 '**OWNER:** The browser build has no reminder…', :12 '**OWNER:** Which `pageVisible` wins…', :29 'foreground alert catch-up (legacy `calendar-alerts.ts`)…', :52 '**OWNER:** These developer-only test-mock pieces…'. K2 detent model: :8 '**OWNER:** Which chat detent model wins?'.
  - To do: Owner decisions as listed.
- **A-381** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 24a. An Alpha mms_send settles unavailable with no card.
  - Now: actions.vibe:449. open-items line 42: 'an Alpha `mms_send` operation settles as unavailable, with no card'.
  - To do: Owner decision. Otherwise route the card MMS through the same admission as gap 1.
- **A-382** (recorded; [`alpha-telephony.md`](alpha-telephony.md)) 24b. The legacy alpha-proposal:v1 native slot is migrated.
  - Now: open-items line 43: 'legacy kept `alpha-proposal:v1` in a native secure slot… Nothing is migrated'. The slot holds one card to redraw.
  - To do: Owner decision on ElizaSecureStore, or accept the loss.
- **A-413** (recorded; [`alpha-voice.md`](alpha-voice.md)) 24. The browser build has voice (capture and player).
  - Now: Open-items OWNER "Voice choices…" sub-bullet "the browser build has no voice…". Not reachable on the phone.
  - To do: Owner decision; otherwise drop browser capture text from spec/voice/vad.md and capture.md.
- **A-422** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: longest cue line 120 vs legacy 160.
  - Now: spec/assistant/reply.md:92 ackLimit = 120. Open-items OWNER "The longest spoken cue line is now 120 characters…".
  - To do: Owner decision.
- **A-429** (recorded; [`alpha-voice.md`](alpha-voice.md)) KNOWN: Android still carries PairedSpeechContract and the paired branch of AlphaVoiceCloudPlugin (connectPaired).
  - Now: connectPaired still in AlphaVoiceCloudPlugin.java. Open-items OWNER line 46 and line 346 "Android code that #1422 itself kept…".
  - To do: Owner decision; then delete the Java.

## Upstream eliza

### High (5)

**Tooling and CI**

- **E-015** (recorded; [`eliza-agent-runtime.md`](eliza-agent-runtime.md)) eliza-agent-runtime-05: device identity headers must ride phone turns and requests to the agent
  - Now: Fixed upstream after the pin. turn-controller.vibe:41-45, :209 take headers. packages/os/android/agent-service/.../ChannelPolicy.java:103-155 carries and bounds them (eliza #40310, merge 2f409d5d0, commit d62bb8f6b), and that merge is not an ancestor of Alpha's pin 6451775c35a. docs/vibestack-open-items.md:79 records it to the same extent: 'The native channel's device headers (eliza #40310, `2f409d5d020`, after the current pin) need the next repin...'. That bullet also covers x-elizaos-client-id and the header-bound rule.
  - To do: Repin vendor/eliza past 2f409d5d0 (upstream.lock.json). Then send x-elizaos-client-id on turns and view requests, and align spec/platform/index.md's header rule with upstream's.
- **E-030** (recorded; [`eliza-device-proposals.md`](eliza-device-proposals.md)) eliza-device-proposals-02: device id, key and capability headers never reach the agent over the Android native socket, so registration answers 401 and no turn is a device turn.
  - Now: Fixed upstream after Alpha's pin by eliza #40310 (d62bb8f6b, merged 2f409d5d0). AgentSocketClient.java:164-167 copies the carried headers into the socket payload. ChannelPolicy.java:18 and :140-141 admit x-eliza-device-* and x-elizaos-client-id. packages/agent/src/client/turn-controller.vibe:41-45 gives TurnTransport request and stream a headers argument, used at :209-210. Spec: spec/os/agentService/channel.md "Only the device headers and client id the runtime client carries cross the channel" and spec/agent/client/runtimeClient.md. Alpha pins vibestack-dp 6451775c35a (upstream.lock.json), which is an ancestor of 0d7436199 and does not include #40310. docs/vibestack-open-items.md:79 states…
  - To do: Repin vendor/eliza and upstream.lock.json to at least 2f409d5d0 (preferably 0d7436199), then carry out open-items bullet :79: send x-elizaos-client-id and align spec/platform/index.md's header rule. Every device-action row below depends on this one reaching the phone.

**Upstream eliza**

- **E-025** (recorded; [`eliza-cloud-identity.md`](eliza-cloud-identity.md)) eliza-cloud-identity-04: device enrollment headers (x-eliza-device-id/key) do not reach the on-device agent over the native channel.
  - Now: Fixed upstream after the pin: eliza #40310 (2f409d5d0/d62bb8f6b). AgentRoute.headers is at packages/os/src/bridges/definitions/agent.ts:20. AgentPlugin.java:128 passes headers(call) to AgentChannel.ask, AgentChannel.java:144 calls ChannelPolicy.carried(headers), and AgentSocketClient.java:164-167 puts them in the payload. The spec rule is spec/os/agentService/channel.md, "Only the device headers and client id the runtime client carries cross the channel". alpha-vs is still pinned at 6451775c35 (upstream.lock.json). open-items line 79 says "The native channel's device headers (eliza #40310, `2f409d5d020`, after the current pin) need the next repin…".
  - To do: Repin vendor/eliza to a commit containing #40310. Add x-elizaos-client-id on turns and view requests, and align spec/platform/index.md's header rule, as the open-items bullet says.
- **E-038** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 03: Voice does not pause for an owner review: no awaitingReview from upstream, so the mic stays open and the reply is spoken as if done
  - Now: DoneFrame (packages/agent/src/client/reply-frame.schema.vibe:13-25) has no review flag and stays strict (stream-reader.vibe:24 onExcessProperty "error"). Alpha reads outcome.awaitingReview (apps/app/src/voice/conversation.vibe:366, :466-469; native.schema.vibe:55), so reviewNeeded never fires. spec/agent/voice/session.md has no pause or resume. Open-items line 154 "A reviewed voice request never settles…" ("without which `reviewNeeded` never happens") and upstream list line 265 "the strict DoneFrame refuses `awaitingReview`" record it. Neither says the effect: the mic stays open while a call, SMS or calendar card awaits approval.
  - To do: Upstream: add a review-pending field to DoneFrame and VoiceReply plus a pause rule in spec/agent/voice/session.md. Or, Alpha-only: derive the flag in conversation.vibe from actionResults[].data.awaitingUserInput.

**Owner decision**

- **E-034** (recorded; [`eliza-inbox.md`](eliza-inbox.md)) eliza-inbox-02: the agent cannot read a message body (INBOX_READ lists sender/subject/snippet only)
  - Now: plugin-inbox/src/index.vibe:16 actions [inboxReadAction, inboxComposeAction] only; agent/read.vibe:115-129 returns list fields only, nothing in agent/ calls gmailRead; spec/inbox/managedRead.md unchanged. alpha-vs android/agent/policy.json admits only INBOX_READ/INBOX_COMPOSE_EMAIL. Recorded in docs/vibestack-open-items.md:35: "**OWNER:** The agent's Gmail body reads and mailbox changes (legacy gmail-agent-read-host: 32,000-character body reads ...) have no counterpart ... Keep them retired?"
  - To do: Owner decides. If kept: add a bounded body read action over client.gmailRead (id from the current INBOX_READ result, revision-bound, text cap) in packages/plugin-inbox/src/agent/, a rule in spec/inbox/managedRead.md, and admit it in android/agent/policy.json.

### Medium (7)

**Android**

- **E-086** (recorded; [`eliza-cloud-services.md`](eliza-cloud-services.md)) eliza-cloud-services-07: A rate limit should hold the model for at most ~4 s (develop RATE_LIMIT_MAX_HOLD_MS) so the 5 s re-send reaches the provider.
  - Now: Unchanged: packages/agent/src/models/binding.vibe:116-122 rateLimitHold returns 0 (provider's whole Retry-After) unless OPENAI_/CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS is set; Alpha's test/agent-launch-token-budget.test.mjs:15 lists both as RETIRED and forbids setting them. docs/vibestack-open-items.md:210 records it: '`android/agent/host.json` sets no `CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS`, so one hosted-model 429 holds the account for the provider's whole retry time...'. (On the Cloud route the provider 429 arrives as 503 per gap 06, so the hold applies to the Cloud's own 429.)
  - To do: Set CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS=4 in android/agent/host.json environment and drop it from RETIRED in test/agent-launch-token-budget.test.mjs, or upstream default the hold to 4 s in binding.vibe/spec/agent/models/binding.md.
- **E-132** (recorded; [`eliza-os-image-build.md`](eliza-os-image-build.md)) eliza-os-image-build-03: legacy resident-host class staging (sockets, notification, lifecycle hooks rootPublication/ready) is replaced by the upstream agent-service module with an Alpha subclass that has not been built or tested.
  - Now: alpha-vs android/consumer-host.json:272-302 configures agentService.notification and launchHook (ai.alphacompute.alphaphone.ElizaAgentService.configureLaunch). The ready hook is reproduced through upstream AgentService.onReady (eliza-vs packages/os/android/agent-service/.../AgentService.java:158; ElizaAgentService.java:69-71). Root publication has no caller (AlphaLocalAgentPlugin.java:1022 publishNotificationRoot). docs/vibestack-open-items.md records both: 'Not run on a device: the `ElizaAgentService` compatibility layer...' and 'An owner stop goes through upstream `ElizaAgent.stop` ... `publishNotificationRoot` (the legacy root-publication hook) has no caller.'
  - To do: Build the APK and run the resident lifecycle instrumentation on an emulator. Then either wire publishNotificationRoot to an AgentService lifecycle observer in ElizaAgentService.java, or retire it.

**App shell**

- **E-055** (recorded; [`eliza-assistant.md`](eliza-assistant.md)) eliza-assistant-01: Automations reads/changes reminders and definitions and snoozes occurrences via /api/lifeops/{reminders,definitions,occurrences}, which upstream does not serve.
  - Now: rg for lifeops/(definitions\|reminders\|occurrences) in eliza-vs/packages and spec finds nothing; plugin routes are only routines/dossier/checkins (eliza-vs/packages/plugin-assistant/src/index.vibe:142). Alpha still calls them: alpha-vs/apps/app/src/workflows/automations.vibe:167,176,243,288,314. Reminders, goal check-ins and routines still list as owner-visible scheduled tasks via /api/scheduled-tasks?ownerVisibleOnly=1 (automations.vibe:163), so the impact is two failing sources plus failing definition enable/delete/snooze. docs/vibestack-open-items.md:135 '**Workflows, upstream routes:** `ReminderSource` and `DefinitionSource`...' states it to the same extent.
  - To do: Drop ReminderSource/DefinitionSource and the lifeops change paths from apps/app/src/workflows/automations.vibe (rule in apps/app/spec/workflows/automations.md), using /api/scheduled-tasks verbs for reminders and goal check-ins and /api/personal-assistant/routines (GET/POST/PATCH/DELETE) for routines.
- **E-096** (recorded; [`eliza-core.md`](eliza-core.md)) eliza-core-10: Notes 'restore' and 'move' requests and folder metadata (notesFolders) reach the agent
  - Now: Core's NOTES_REQUEST_OPERATIONS (task-extraction-context.vibe:265-273) still has six operations. The phone turn never sets an action-routing context (no ActionRoutingContext in packages/agent/src), so that classifier does not gate phone turns. Restore and move run as their own actions instead: plugin-notes/src/agent.vibe:233 NOTES_RESTORE and :252 NOTES_MOVE, both allowed in policy.json. The remaining owner-visible gap is the folder list, which plugin-notes reads from turn metadata (organize.vibe:14 `notesFolders`, agent.vibe:282) and Alpha never sends (no notesFolders in apps/app/src). vibestack-open-items.md:107 records this: "Notes folder names (`notesFolders`, read by upstream…".
  - To do: Send notesFolders with a turn from Alpha's assistant TurnSources (apps/app/src/assistant), with a rule in apps/app/spec/assistant/context.md.

**Upstream eliza**

- **E-080** (recorded; [`eliza-cloud-identity.md`](eliza-cloud-identity.md)) eliza-cloud-identity-05: an upgrade's invoice.stripe.com payment page cannot be opened from the phone.
  - Now: Upstream packages/cloud/src/billing/upgrade-commands.vibe:245 still answers invoice.stripe.com/i/. CloudRequestPolicy.java:20 PROVIDER_HOSTS is still checkout, billing and accounts.google.com. alpha-vs apps/app/spec/account/billing.md:204-209 excludes it on purpose. open-items has "**OWNER:** Payment pages now open only on checkout.stripe.com and billing.stripe.com…" and the upstream os bullet "`CloudRequestPolicy.PROVIDER_HOSTS` … does not admit `invoice.stripe.com`".
  - To do: Upstream: add invoice.stripe.com to spec/os/signIn/cloudRequests.md providerHosts and CloudRequestPolicy.PROVIDER_HOSTS. Alpha: add it to paymentHosts in apps/app/spec/account/billing.md and account/billing.vibe.
- **E-107** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 05: A streamed reply is not spoken sentence by sentence; first audio waits for the whole reply
  - Now: TurnPort.send in packages/agent/src/voice/ports.vibe still resolves one whole VoiceReply, and session.vibe has no early-speech path (rg 'early\|sentence' finds nothing). Open-items line 157 "Not ported: … the reply spoken sentence by sentence while it is generated (`speaksEarly` unused)".
  - To do: Add a streaming TurnPort.send variant in ports.vibe/session.vibe with a rule in spec/agent/voice/session.md, then use it in alpha apps/app/src/voice/conversation.vibe.
- **E-108** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 06: No microphone mute or 'paused while responding' state in the voice session
  - Now: rg -i 'mute\|inputHeld' finds nothing in spec/agent/voice/session.md, session.vibe or live-session.vibe. Open-items line 157 "Not ported: microphone Mute (also missing upstream)…".
  - To do: Add a mute event and state to spec/agent/voice/session.md and session.vibe, then a Mute control in Alpha's voice UI.

### Low (8)

**Android**

- **E-245** (recorded; [`eliza-os-android-comms-media.md`](eliza-os-android-comms-media.md)) comms-media-08: contact search through the telephony client (searchContacts) was removed in favour of address-book list/resolveNames.
  - Now: alpha-vs docs/vibestack-open-items.md line 203: 'Not ported natively: `editProviderKeys`/... `AlphaTelephony.contactForNumber`/`searchContacts` (telephony: confirm `AlphaContacts.resolveNames` keeps Android's own number matching).' Same extent as the finding (same ContactsCatalog underneath; only the number-matching confirmation remains).
  - To do: Confirm AlphaContacts.resolveNames uses PhoneLookup number matching (read AddressBookPlugin.java:386/ContactNames.java) and close the open item.

**App shell**

- **E-226** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 14: Upstream voice timing/diagnostics modules (voice-turn-timing, realtime-voice-timing, native-live-voice, onTurn endpoint record) are gone
  - Now: Nothing upstream replaces them. Alpha has apps/app/src/voice/latency.vibe. Open-items line 162 "Voice timing no longer reaches the diagnostics export (`Latency.entries()` has no consumer)…".
  - To do: Have the diagnostics export consume Latency.entries() and add a budget rule to apps/app/spec/voice/latency.md.

**Upstream eliza**

- **E-260** (recorded; [`eliza-os-android-system.md`](eliza-os-android-system.md)) eliza-os-android-system-09: #40088 shared password backup approval has rules and library code but no caller or bridge method.
  - Now: SharedPasswordBackup.java, PasswordBackupApproval/CloudPasswordBackup still referenced only by consumer-host.mjs:44, passwords/build.gradle:24, a test and an instrumented test; no sharedBackupReadiness/approveSharedBackup in packages/os or alpha-vs. Legacy Alpha never offered it (no match in alpha-develop). Recorded: '**OWNER:** Two Settings password items' ('"Back up passwords" never shows...') and Upstream os bullet 'there is no sharedBackupReadiness/approveSharedBackup implementation'.
  - To do: Expose readiness/approve on the passwords or sign-in plugin upstream (packages/os/android/passwords PasswordsPlugin + bridges definition), or mark the story unreachable in spec/os/android/passwords/vault.md.

**Owner decision**

- **E-136** (recorded; [`eliza-agent-runtime.md`](eliza-agent-runtime.md)) eliza-agent-runtime-12: the Calendar agenda source (clientDevice.calendarAgendaSource) is not sent with a turn
  - Now: alpha-vs still never sends it: only payloads.schema.vibe:48 mentions it, and there is no clientDevice in apps/app/src. Legacy sent it only for the browser-local source: alpha-develop connection-ui.tsx:499 says 'AlphaCalendar's browser adapter owns only its local source', followed by `if(requested.sourceId!=='local')return`. Upstream offers the agenda only to a device declaring the capability (7a8fbb099). docs/vibestack-open-items.md:105 records it: '`metadata.clientDevice.calendarAgendaSource` is not sent. Legacy sent it only from the browser build...'
  - To do: Waits on the browser-build store OWNER decision. If kept, Calendar exports the shown source and src/assistant/composer.vibe sends it beside calendarDay.
- **E-224** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 07: The resident's one-shot speech routes (/api/tts/paradee, /api/asr/libelizainference) are gone, but paired speech and a script still call them
  - Now: No upstream route serves either path (rg finds only asset paths). Alpha still calls them: PairedSpeechContract.java:7, used by AlphaVoiceCloudPlugin.java:277-285 on the paired branch, and scripts/android-browser-reading-live.ts:79,101,248. Open-items line 46 "**OWNER:** Legacy paired-agent voice … is not ported, and Android still carries PairedSpeechContract", and line 346 asks to retire it. The doc does not name the browser-reading-live script. The production phone uses the native bridge.
  - To do: Owner decision: retire PairedSpeechContract and the paired branch of AlphaVoiceCloudPlugin.java, and delete or rewrite scripts/android-browser-reading-live.ts.
- **E-227** (recorded; [`eliza-local-inference-voice.md`](eliza-local-inference-voice.md)) 15: Clef endpoint chain (local scorer then Clef, 300 ms, six recent turns) is not upstream; Alpha posts {kind:'turn', transcript} itself
  - Now: alpha-vs apps/app/src/voice/conversation.vibe:85,429-433 posts to /api/v1/decisions with no recent turns and no local-first order. Legacy kept Clef off, so it ran the local scorer only. Open-items line 67 "Clef end-of-turn scoring in Cloud is on, so every Cloud turn posts its transcript…" is an owner question.
  - To do: Owner decision. If Clef stays on, send recent turns and run the local scorer first in conversation.vibe, with a rule in apps/app/spec/voice/conversation.md.
- **E-254** (recorded; [`eliza-os-android-comms-media.md`](eliza-os-android-comms-media.md)) comms-media-17: the reply-draft route, legacy registered only on a verified image, is now always registered and admitted.
  - Now: Upstream packages/agent/src/plugins/profile.vibe:20 always registers replyDraftModule; alpha-vs android/agent/host.json:642-644 and :1671-1673 and apps/app/src/platform/owner-routes.json:200,208 admit POST /api/messages/reply-draft with no image condition; no file in apps/app/src requests it. docs/vibestack-open-items.md line 62: '**OWNER:** Native request gates that lost their only caller ...' lists 'reply drafting only on the verified image'.
  - To do: Owner decision: add a host.json rule restricting reply-draft to the verified image, or retire the gate.
- **E-263** (recorded; [`eliza-os-android-system.md`](eliza-os-android-system.md)) eliza-os-android-system-12: start at boot now depends on being signed in, not on the owner's runtime mode (shouldAutoStart).
  - Now: AgentStartReceiver.java:13-25 still starts when AgentService.signedIn() on BOOT_COMPLETED/MY_PACKAGE_REPLACED. Recorded: '**OWNER:** Upstream's AgentStartReceiver (agent-service module manifest) starts the resident at boot...' (keep P-43 or remove the receiver with tools:node="remove").
  - To do: Owner decision; then either drop the shouldAutoStart gate or remove the receiver in Alpha's manifest.
