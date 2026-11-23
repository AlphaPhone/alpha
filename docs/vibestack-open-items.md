# Vibestack migration: open items

This phase was code-only. Nothing was generated, compiled, type-checked or run, so none of the items below has been tested.
The list is grouped by who acts next. Items the owner must decide are marked **OWNER:**.

## Owner decisions

- **OWNER:** Which chat detent model wins? `spec/shell/navigation.md` and `spec/assistant/dock.md` both model it (restOf, alwaysHomeKeepsItsBar, moveChat), and `Assistant.follow` mirrors the two both ways.
- **OWNER:** Should `spec/notes/recordingOpen.md` and `spec/maps/notificationOpen.md` become one shared notification-open model? The same decision covers whether Maps' `act`/`ask`/`watch` wrappers in `src/web/maps/actions.ts` become shared glue.
- **OWNER:** Should there be a mock-mode runtime that swaps live services for the fakes? `admitMockMode` has no caller, so the "Try mock mode" developer row (settings/account) would pause live collectors and then do nothing.
- **OWNER:** The browser build has no reminder, notification or deletion store; legacy kept BrowserDaily, BrowserNotifications and deletions in localStorage. As a result `clockCapabilities` advertises nothing there.
- **OWNER:** Which `pageVisible` wins when there is no document? `src/clock/page.ts` answers false and `src/platform/build-flags.ts` answers true.
- **OWNER:** Should PUT be dropped from `Cloud.json`'s method type? Doing so breaks `src/browser/cloudCustody.vibe`, which forwards PUT. Live Cloud already refuses PUT as NoRoute.
- **OWNER:** Should Add funds be offered only on Eliza Cloud (the current spec) or on every Cloud (legacy after #1269)?
- **OWNER:** Security review of generated workflow code isolation. Today it is a compiler check plus a separate worker process, with no further sandbox.
- **OWNER:** Assistant behaviour choices:
  - a stale reply keeps its text and receipts, where legacy dropped it;
  - the #1128 Home pill exception is not modelled;
  - history counts unacknowledged journal entries as waiting for review;
  - a proposal the phone cannot review names a generic action, because the wire carries no title.
- **OWNER:** Inbox's `inbox__suggestions`/`MailSuggestions` duplicate `spec/assistant/suggestion.md`. Neither is connected to the assistant's `Suggestions`, and no text field mounts `SuggestionReview`.
- **OWNER:** The resident's Gmail mailbox helper (`GmailAgentMailboxRecovery`, legacy gmail-agent-read-host) has no model.
- **OWNER:** Calendar features not ported:
  - legacy browser-local guest response editing;
  - the origin-local meeting preview;
  - foreground alert catch-up (legacy `calendar-alerts.ts`), which would belong to Clock.

  The Calendar "Not connected" Settings button still opens account > google; confirm that target.
- **OWNER:** Old inbox operation records (`inbox-operation:v1:<sha256>`), possibly including a send in flight during the update, are not carried over. Carry them into MailOperations, or drop them?
- **OWNER:** Telephony:
  - an Alpha `mms_send` operation settles as unavailable, with no card;
  - legacy kept `alpha-proposal:v1` in a native secure slot, while the port keeps it in the owner-keyed KeyValueStore. Nothing is migrated (the slot holds one card to redraw). Should it move to ElizaSecureStore?
- **OWNER:** Legacy paired-agent voice (pairedVoiceStatus, synthesizePaired, transcribePairedRecording) is not ported, and Android still carries PairedSpeechContract.
- **OWNER:** Two Settings password items:
  - the Proton Pass and development password-provider rows (`AlphaDevice.openPasswordProvider`) are not ported;
  - "Back up passwords" never shows, because `ElizaPasswords.sharedBackupReadiness`/`approveSharedBackup` have no upstream or Android implementation.
- **OWNER:** The assistant's Op set has no Photos read class, so Photos reads (search, inspect) use PhotosChange and always need review. Confirm this, or add `PhotosRead` to `spec/assistant/review.md`. The viewfinder deliberately keeps its own three-value Chat.
- **OWNER:** Browser's `GoogleLink` (`src/browser/googleReturn.vibe`) and `CloudRequests` (`src/browser/cloudCustody.vibe`) have no consumer, and GoogleLink overlaps account's google.md readback. Absorb them or drop them?
- **OWNER:** These developer-only test-mock pieces are not ported: Browser's simulated agent Clock handoff and its exact-byte bookmark backup/reset dialog.
- **OWNER:** Accept the legacy Trash import limits in Notes: imported rows get new IDs and a fresh deletedAt, and their recordings stay in the device audio trash.

## Shell

- Several always-mounted sheets must list themselves with `useLayer` (`src/web/shell/useLayer.ts`) or `Navigation.openLayer` while open, or take a hold with `setHoldBack`, so that hardware Back closes them. The sheets are:
  - Calendar's calendar-approval and calendar-requests sheets (`surfacesBack()` in `src/web/calendar/index.tsx` exists but nothing calls it);
  - the Files picker overlay;
  - Clock's notice question sheets;
  - the Browser shade sheet.

  `AppSurface` has no back member.
- No web surface sets `[data-alpha-dock]`/`[data-alpha-dock-bar]`, so `--alpha-dock-clearance` is never published and Maps falls back to its legacy 124px.
- The shell's local `keptOrHeld` (`src/shell/layer.vibe`) should become platform's `storedOrHeld`, as should any area's remaining `stored()` machines.
- `src/shell/assistantHost.vibe` keeps local copies of `learnPeer`/`comparePeer`/`statusRead`, because upstream `./client` does not re-export them.
- `apps/app/public/delegation-return.html` is still the legacy static page. `main.tsx` has its own CallbackLanding route for it (shell/tooling).
- Add the Notes routes `/api/notes/interact`, `/api/notes/state` and `/api/notes/trash/{erase,recordings,recordings/complete}` to:
  - `src/shell/ownerRoutes.vibe`;
  - `src/platform/owner-routes.json`;
  - the Android OwnerRoutes asset.

  `spec/shell/routes.md` should name them too (shell/platform/android).
- Hardware Back does not close an open Inbox search field that has no submitted query, because that state is UI-local in InboxScreen. The on-screen Back does close it.
- `src/camera/agentCapture.vibe` waits a fixed `PANEL_CLEARS` of 350 ms instead of waiting for Foreground's chat to read "closed" (camera/assistant).

## Assistant

- The `x-eliza-device-capabilities` header is still not sent. It needs headers on platform `Resident.json`/`stream` and on upstream TurnTransport. The shell's `DeviceCapabilities` now advertises every area: Files, Notes, Calendar, Telephony, Browser, Inbox, Maps, Camera and Clock. This blocks `CameraCallFacts.capabilities`, `NotesListFilter.negotiate` and `filesCapabilities`.
- The Browser page for a turn has two models: the assistant's `BrowserPages` port (`src/assistant/ports.vibe`, unfilled, so the default shares nothing) and Browser's `BrowserPageContext.forTurn`. Pick one and wire it. `AssistantHost.peer()` must set `takesBrowserPage`/`browserPage` from the fresh status. Upstream has no `clientDevice.browserPage` (eliza#40067/#40193).
- `metadata.clientDevice.calendarAgendaSource` is not sent, because Calendar exports no agenda source for the shown day.
- Comms cards:
  - call `CommsStage.propose`/`approve` when a comms card is listed;
  - reuse telephony's `StoredProposal` in the StoredSuggestion decoder;
  - keep publishing `commsAsks {key, taken}` for every comms ask route; asking the same text twice is not re-detected;
  - approving from the call bar needs a port design back to DeviceReview.
- Maps:
  - nothing in the assistant calls `MapsAgent.deliver`/`review`/`approve`/`readSelected` or the view-interact grants;
  - put `MapsAgent.context()` into the turn observation as `selectedObject` while Maps is in front;
  - add a Maps read Op class (Maps uses NotesRead today);
  - ChatPanel's `CardOffer` `session:1, conversation:1` can be dropped.
- Browser:
  - the direct pass in `review.vibe` would run a page-link BrowserNavigate. Browser refuses it at execute (`PAGE_LINK_UNREVIEWED`), but it should stay a card, which needs a "not owner-typed" hook;
  - route agent view interactions (get-text, browser-command) to `BrowserAgent.interact`/`command`.
- `src/assistant/composer.vibe` should use voice's `Latency.draftSent`/`draftReplied`. Until it does, each dictated send records two abandoned trials.
- Files' legacy Ask Alpha excerpt flow (Use excerpt, a source link for an oversized file, sensitive-text review) belongs in the composer.
- The removed inbox agentDrafts rules belong in `spec/assistant/emailCard.md`.
- Clock reads map to CalendarRead, because there is no reminder-read class, and `OperationPorts.describe` has no "reminders" destination, so a `reminder_named` card cannot navigate.
- `ExecutorCall` has no workflow flag. Notes' `create_note` treats "Workflows in front" as a workflow run (assistant/upstream).
- Ask Alpha on workflow approval notices (#472, #461) has no spec or code. Clock's workflow tap must pass notice `{id, revision}` to `AssistantDraft.askAbout`.
- `workflowStepDecisions` and the workflows layer each build their own WorkflowApi/WorkflowVersions. Composition may want to share one.

## Voice

- Adopt the assistant's `spokenCue` (`src/assistant/cue.vibe`) in voice-turn cue speech (#1450). The 300 ms hold and 2.5 s bound are not in `spec/voice`. `test/batch-voice-progress-ack.test.mjs` still imports the removed script.

## Account

- `AgentSession.installationId`/`enrollmentId` still fall back to organization and credential ids. Legacy device enrollment did these steps:
  - kept a `device:<scope>` slot;
  - called `POST /api/client-devices/register` with the X-Eliza-Device-* headers;
  - checked the workflowProtocol;
  - read `GET /api/client-devices/context`.

  This needs headers on platform `Resident.json` first.
- `entitlement.vibe` and `signIn.vibe` read `ElizaSystem.getNetworkStatus`/`networkStatusChanged` directly. Their home is `AppLifecycle.changes`/`refreshNetwork`.
- The `VoiceLimit` service has no consumer, because voice imports the pure `limitOf`. Account may drop it.
- Account's `stripePageAllowed` admits `invoice.stripe.com`, which upstream `ElizaCloud.openExternal` refuses. `/app-auth/authorize` opens only if Cloud serves it on appLinkHost.
- Telephony should rebind its owner-keyed stores when CloudSession changes; this is not verified.

## Inbox and Notes (legacy carry-over)

- Inbox and Notes should call `adoptLegacySlot` (`src/platform/legacy-slots.vibe`, which has no caller yet) before their first secure-store read. The slots are:
  - `inbox-drafts:v1:<owner>`;
  - `…:shelf:<sha256>`;
  - `inbox-operation:v1:<sha256>`, moving to `device:<key>`;
  - the Notes slots.
- Platform `stored()` drops a damaged stored document. Legacy kept a damaged recovery copy apart from saved drafts (#327).
- Legacy `RendererHostedInbox`/`NativeHostedInbox` digest-retention models stay with the Workflows digest inbox.
- A device-calendar event saved from a note is not back-linked, because Calendar's new-event form always writes to the agent calendar.

## Calendar / Workflows / Platform

- Wire the device Google Calendar sync host (`createCalendarSyncHost` over `nativeLinkedPort`). It needs a Cloud `googleCalendarSync` client, which upstream `@elizaos/cloud` lacks, an encrypted `CalendarLinkStorage` slot and the reviewed Google selection. Upstream cloud also lacks `creditsCheckout` in the device route table.
- Confirm that `AlphaCalendar.availabilitySources`' sourceRevision is the revision `nativeSourceConsent` binds. Calendar's EventOrigin sourceRevision should come from a real etag.
- `WorkflowBridgeHost` must send `read_calendar_range` steps to Calendar's operationPorts. The workflow calendar ranges (today, tomorrow, this week, in meeting) are owned by Workflows.
- Steps other than `read_calendar_range` now arrive as workflow-bound device proposals in `/api/client-devices/proposals`. DeviceExecutors must review, claim and receipt `speak_text`, `post_notification`, `read_selected_notes` and `create_note`. The register call must declare workflowProtocol 5 for run-day reads.

## Platform

- `AlphaCloudSpeechStream` in `src/platform/native-plugins.ts` lacks `setCloudSpeechMuted`/`speakCloudSpeech`/`cancelCloudSpeech`, which blocks the `createCloudStreamingSpeech` dedupe.

## Android / native

- `AlphaNotifications.consumeOwnNotice` (Clock) and `postWorkflow` (Workflows) have no Android implementation, so Native answers unavailable. `NotificationsHostPlugin` keeps its ids private and clears them on pause, so upstream work is needed first.
- `AlphaCredentialStore`'s old `inbox-drafts:v1:*` slots must be copied into ElizaSecureStore under the same names, and keys over 200 characters are refused.
- `RendererCredentialSlots.COMPARE_EXCHANGE` must admit `notes-canonical-draft:v1:device`.
- On a recording-notification tap (#1403), MainActivity must post `alpha:note-recording-open`, with the text "Voice note · Recording/Paused" coming from string resources.
- Implement the DeferredDeletionCoordinator Records port and the DeletionWindow hooks; deletes answer unavailable until they exist. Also needed:
  - an `AlphaContacts.resolveNames` Java implementation;
  - `ElizaSystem.openSettingsPage` accepting about, mobile and default-apps.

  `AlphaTelephonyBase` is still Alpha's fork of upstream TelephonyPlugin.
- `VoiceLatencyProbe.configureHost` should set "alpha-native-voice-timing-v3". AlphaBrowser `reviewReading`/`synthesizeLocalBrowserReading` must accept a ReadingBinding sessionId of the form `agent:generation`.
- The #1441 native half is missing: AlphaNetworkLocationPlugin, NetworkLocationQuery, MainActivity registration and ACCESS_WIFI_STATE/CHANGE_WIFI_STATE.
- Change events are missing for the reminder, notification and mirror stores. `spec/shell/system.md` (home-start handoff, text zoom, Settings shortcuts) has no renderer path. The `takeInvocation` Javadoc still says "consumed on read".
- About 22 classes the app imports are gone at the pin: `ai.eliza.auth.cloud.*` and the agent.connection ConnectionTransport, OwnerRoutePolicy, CloudConnectionPolicy, DelegationCallback and PendingRequests. Because of that:
  - OwnerRoutes.java and the JVM half of owner-route-parity cannot compile;
  - `AlphaLocalAgentPlugin.configureEnvironment` never runs, since upstream only calls `configureLaunch(Map)`;
  - the legacy generated ElizaAgentService has no vibestack generator.
- The Google App Link `appReturn` has no native source. The delegation-callback and workspace-return methods stay on AlphaConnection. It is unconfirmed whether `AlphaCloudSignIn.clearCredentialState` clears ElizaCloud's key.
- Java-side host models are missing: IdentitySession, NativeCredentialMutation, NativeGoogleAccessFile and GoogleBrowserReturnClaim. There is also no native conformance driver for `voice__keyboard`.

## Tooling / repository root

- `upstream.lock.json` must move past eliza `c8f273cec1b`, because `workflowDeviceOffer` is not at pin `c84e5d68e37`. Advance the vendor/eliza gitlink with it.
- `capacitor.config.ts` lacks `plugins.ElizaSignIn` (clientId, googleMode, environments) and the ElizaCloud routes table, so ElizaCloud refuses every request.
- The Tesseract OCR assets are not set up:
  - the files are not served under `apps/app/public/ocr/`;
  - `vite.config.ts` must add `localOcrAssets()`;
  - `apps/app/package.json` must list `tesseract.js-core` and `@tesseract.js-data/eng`.

  The root `package.json` also lacks `@electric-sql/pglite`, which `eval-phone-actions.ts --database` needs.
- `scripts/resident` must:
  - register the `workflow-device` and `workflow-native-digests` runtime services;
  - call `registerMapsViews`/`registerMapsSavedPlaces` (`namesAlphaView` is a fixed word list).
- `scripts/os-ported/**` and the harness scripts (`android-instrumentation.ts`, `android-workflow-native.ts`, `native-test-fixture.ts`) are still to be rewritten onto `@elizaos/os/image`.
- These tests still target removed code:
  - owner-route-parity, `test/android-host.test.mjs` and verify-apks import the removed `product/owner-route-table.ts` or the legacy generator;
  - so do `specs/quint/refinement/native/credential-coordinator*.mjs`.

## Upstream (eliza)

- **agent/client:**
  - `StatusFrame` has no label (at most 160 characters), and `onStatus` passes only the activity, so voice cues are wired but never speak;
  - the strict DoneFrame refuses `awaitingReview`, and DoneFrame notices are never produced;
  - there is no shared-note read-reply lease (`readReply`/`completeReadReply`);
  - `TurnTransport` takes no headers;
  - `./client` does not re-export `learnPeer`/`comparePeer`/`statusRead`.
- **agent/voice:** `VoiceReplyAction` has no failure flag, so the "email action failed" line is unreachable.
- **agent:** a workflow device-offer helper is missing. The native bridge reports protocol 1, so `read_selected_notes`/`create_note` answer DEVICE_STEP_UNSUPPORTED.
- **plugin-inbox:** `inboxComposeActionName` is exported only from the package root, so voice keeps a local copy.
- **os:** there is no `sharedBackupReadiness`/`approveSharedBackup` implementation, and `ElizaCloud.openExternal` does not admit `invoice.stripe.com`.

## Unverified in the code-only phase

- **Generated names:** the gen names each area assumed from its new quint have not been checked against generated output:
  - platform: resetCarried, adoptionOf, legacyCleared, SlotAdoption;
  - assistant: timedAsVoice, browserCarded, sendsBrowserPage, cue timings and others;
  - voice: `voice__acknowledgement`, plus the extended `voice__latency`;
  - browser: `browser__pageContext`;
  - clock: `clock__agentReview`;
  - inbox: keepPrevious, inboxAdvertised and others;
  - notes: `noteSaveResult`;
  - settings: Elsewhere, calendarSettingsRoute and others;
  - telephony: askLeavesField, `searching`;
  - files: `shell__navigation` `initial`/`Nav`;
  - workflows: Kept, PageWrite, PageEnd, historyLimit.
- **Effect and VibeLang typing:**
  - `Layer.unwrap` in `storedOrHeld`;
  - `Effect.onInterrupt`;
  - `runSyncExit` over BrowserAgent;
  - `Effect.serviceOption(AppLifecycle)`;
  - fork → yieldNow → `Fiber.join` under timeoutOption;
  - `let` rebinding of a `catch` expression;
  - a getter inside `satisfies Pick<…>`;
  - whether `Stream.drop` over `WorkflowsPlace.moves` and `Foreground.changes`/`AssistantDraft.review` emit their current value first;
  - `Machine.send` returning Cue for a spec with no out.
- **Build and tooling:**
  - `?raw` imports of `cloud/deployment.json` from outside `src/web` may need Vite `fs.allow`;
  - the Tailwind variant `[html.alpha-landscape_&]`;
  - the fake Native's `Agent:keyguardChanged` events;
  - the `AccountChips` import in `StartupPermissions.meta.tsx`.
- **Native:**
  - `SecureSlotPolicy.parse` with Integer budgets;
  - JSON-only SecureSlots values;
  - `RECEIVER_NOT_EXPORTED` screen broadcasts;
  - owner-route-parity's reference reading.
- **No meta file:** MapsScreen, MapPlane and the runtime-bound telephony screens (PhoneScreen, MessagesScreen, ContactsScreen, CallBar, UndoNotice, ReviewRows, PhoneInfoPanel) have no `.meta.tsx`.
