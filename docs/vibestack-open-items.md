# Vibestack migration: open items

This phase was code-only. Nothing was generated, compiled, type-checked or run, so none of the work behind this list, done or open, has been tested.
The list is grouped by who acts next. Items the owner must decide are marked **OWNER:**.

## Owner decisions

- **OWNER:** Which chat detent model wins? `spec/shell/navigation.md` and `spec/assistant/dock.md` both model it (restOf, alwaysHomeKeepsItsBar, moveChat), and `Assistant.follow` mirrors the two both ways.
- **OWNER:** Should `spec/notes/recordingOpen.md` and `spec/maps/notificationOpen.md` become one shared notification-open model? The same decision covers whether Maps' `act`/`ask`/`watch` wrappers in `src/web/maps/actions.ts` become shared glue.
- **OWNER:** Should there be a mock-mode runtime that swaps live services for the fakes? `admitMockMode` has no caller, so the "Try mock mode" developer row (settings/account) would pause live collectors and then do nothing.
- **OWNER:** The browser build has no reminder, notification or deletion store; legacy kept BrowserDaily, BrowserNotifications and deletions in localStorage. As a result `clockCapabilities` advertises nothing there. Device Calendar sync is also phone-only; the legacy browser-local sync calendar has no counterpart.
- **OWNER:** Which `pageVisible` wins when there is no document? `src/clock/page.ts` answers false and `src/platform/build-flags.ts` answers true.
- **OWNER:** Should PUT be dropped from `Cloud.json`'s method type? Doing so breaks `src/browser/cloudCustody.vibe`, which forwards PUT. Live Cloud already refuses PUT as NoRoute.
- **OWNER:** Should Add funds be offered only on Eliza Cloud (the current spec) or on every Cloud (legacy after #1269)?
- **OWNER:** Security review of generated workflow code isolation. Today it is a compiler check plus a separate worker process, with no further sandbox.
- **OWNER:** Assistant behaviour choices:
  - a stale reply keeps its text and receipts, where legacy dropped it;
  - the #1128 Home pill exception is not modelled;
  - history counts unacknowledged journal entries as waiting for review;
  - a proposal the phone cannot review names a generic action, because the wire carries no title.
- **OWNER:** The longest spoken cue line is now 120 characters (the assistant's `ackLimit`), down from legacy's 160. Keep it, or raise `ackLimit` in `spec/assistant/reply.md`.
- **OWNER:** Payment pages now open only on checkout.stripe.com and billing.stripe.com, so an upgrade that needs Stripe's invoice page reads as pending. Accept this until upstream admits invoice.stripe.com?
- **OWNER:** With no Cloud account the resident runs under a local account with no hosted provider (P-43). ElizaCloud keeps its own DeviceCustody key, not the key AlphaCloudSignIn stores in `cloud:production`, so ElizaCloud requests carry no device key. Write a custody bridge, or decide otherwise. Whether `AlphaCloudSignIn.clearCredentialState` clears ElizaCloud's key is unconfirmed.
- **OWNER:** Inbox's `inbox__suggestions`/`MailSuggestions` duplicate `spec/assistant/suggestion.md`. Neither is connected to the assistant's `Suggestions`, and no text field mounts `SuggestionReview`.
- **OWNER:** The resident's Gmail mailbox helper (`GmailAgentMailboxRecovery`, legacy gmail-agent-read-host) has no model.
- **OWNER:** Calendar features not ported:
  - legacy browser-local guest response editing;
  - the origin-local meeting preview;
  - foreground alert catch-up (legacy `calendar-alerts.ts`), which would belong to Clock.

  The Calendar "Not connected" Settings button opens account > google, now with the Google panel's Calendar intent (the same as the Calendars sheet's Connect); confirm that target.
- **OWNER:** Reminders are no longer Calendar rows: legacy listed saved reminders in Calendar and its form could make one, and Home's next line took whichever came first (`nextLead` in `spec/calendar/home.md` has no caller). Clock owns reminders now. Show them in Calendar again through a port Clock fills, or drop `nextLead`?
- **OWNER:** Saved mail moved from the encrypted `connected-read-cache:v1:<sha256>` slot to the WebView's KeyValueStore (localStorage), up to 8 lists and 16 bodies at rest unencrypted, and the legacy slot is never read or cleared. Move saved mail to the mail store's secure slots (`keys.savedMail` is unused), or accept it?
- **OWNER:** Inbox keeps all accounts' drafts in one 8 MiB secure slot and all operations in another, and an operation record stores its attachments twice (`proposal.mail.files` and `composer.content`), so a send with more than about 2.9 MiB of attachments cannot be journaled although `proposalLimit` (7.5 MiB) admits it. Key the slots per account, drop file bytes from `ComposerRef.content` (bind a digest), or raise the native limit?
- **OWNER:** The agent's Gmail body reads and mailbox changes (legacy gmail-agent-read-host: 32,000-character body reads, agent archive, Trash and read state) have no counterpart: `android/agent/policy.json` admits only `INBOX_READ` and `INBOX_COMPOSE_EMAIL`, and upstream has no change action. Keep them retired?
- **OWNER:** Legacy slots not carried over:
  - old inbox operation records (`inbox-operation:v1:<sha256>`), possibly including a send in flight during the update: move to `device:<key>` in MailOperations, or drop? Dropping can send twice: the draft of that send is adopted onto the shelf as an ordinary draft (not marked earlier), one tap sends it under a new request id, and chat-reviewed emails now derive their request id differently (SHA-256 over the reviewed content, where legacy used uuidv5 over the message, grant, sender and proposal), so Cloud's request-id idempotency catches neither. The legacy slot is never cleared.
  - the legacy Notes draft `notes-draft:v1:device` is deliberately not adopted, because `notes-canonical-draft:v1:device` cannot read its change set; accept losing it?
  - `inbox-drafts:v1:chat:<sha256>` is not adopted by Inbox. The assistant's email shelf now uses the same key shape; confirm the old slots may be read as shelves.
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

## Shell (integration)

- Fill the assistant's ports in `PortCells` (declared in `src/assistant/ports.vibe`):
  - `BrowserPages` with `browserPagesFromBrowser`, `MapsViews` with `mapsViewsFromMaps`, `BrowserViews` with `browserViewsFromBrowser` (all in `src/assistant/fills.vibe`);
  - `AdvertisedCapabilities.names()` with `DeviceCapabilities.advertise(offered)`. Until then no `x-eliza-device-capabilities` header is sent.
- `AssistantHost.peer()` (`src/shell/assistantHost.vibe`) must set `browserPage` from the fresh status. Until it does, no Browser page is ever sent.
- Requests to `/api/client-devices/proposals` (claim, decision, receipt) and turns must carry `DeviceEnrollment.headers()`. Device actions must be refused while `AgentSession.enrollmentId` is empty, and the ChatOnly phase should show legacy's "Chat only" reason; no UI shows it yet.
- `AppServices` must contain the Machine services of `gen/clock__notifications` and `gen/clock__reminderTaps`, plus ApprovalReviews, AgentRequests, FilePicker, Notifications and ReminderTaps; their change streams must emit the current value first (assumed by `src/shell/surfaceSheets.vibe`).
- Browser has no always-mounted sheet; the "Browser shade sheet" was read as the browser build's notification shade in clock-notices. If another Browser sheet was meant, it needs its own surface and Back.
- `src/shell/assistantHost.vibe` keeps local copies of `learnPeer`/`comparePeer`/`statusRead`, because upstream `./client` does not re-export them.
- Hardware Back does not close an open Inbox search field that has no submitted query, because that state is UI-local in InboxScreen (Inbox). The on-screen Back does close it.
- Preparing an app update does not write Inbox's waiting edit: `keepDrafts` in `src/shell/activity.vibe` only blurs the focused field. The shell needs a keeper port that Inbox fills with `MailComposer.flush` (answering false on a refusal), and the update must refuse while an Inbox review, selection or attachment is open (`spec/inbox/drafts.md`, `spec/settings/updates.md`).
- `index.html` carries no CSP for the delegation-return landing route.

## Assistant

- `spokenCue`'s `replyReady()` does nothing when no cue was said, so a later `say()` would still play after the reply (`src/assistant/cue.vibe`). Voice guards against it with its own machine.
- `metadata.clientDevice.calendarAgendaSource` is not sent, because Calendar exports no agenda source for the shown day.
- A Calendar approval request the agent queued can never be reviewed on the phone: `src/assistant/reply-lines.vibe` admits only `maps-share` and `checkin-*` choice blocks, so `[CHOICE:approval-<id>]` shows as text. Classify it through Calendar's `calendarReviewText` into a transcript row, render it in `src/web/assistant/Transcript.tsx` with its status and a Review button that calls `ApprovalReviews.open(id)`, and call `ApprovalReviews.retire()` on a conversation change (a hidden page now retires it). The rule belongs in `spec/assistant/reply.md`.
- `workflowStepDecisions` and the workflows layer each build their own WorkflowApi/WorkflowVersions. Composition may want to share one.

## Areas consuming assistant changes

- **Telephony:** `useComms` and CallBar approve/decline should call `commsReviewFromAssistant().approve/decline` (`src/assistant/call-facts.vibe`) after CommsStage, so a bar approval runs through DeviceReview. `askAlpha` should call `Assistant.askComms(key, text)` so asking the same text twice is detected.
- **Clock:** the workflow notice tap calls `flows.askAboutNotice(id, revision, …)` (`src/clock/notifications.vibe`); it should build its question with the assistant's `workflowStepSource(notice, workflow, step, excerpt)` (`src/assistant/draft.vibe`). The clock area has no listener yet for the new native `remindersChanged`, `notificationsChanged` and `mirrorChanged` events.
- **Workflows:** `src/workflows/notices.vibe` should call `DeviceReview.workflowStep(runId, stepId)` in its Executing phase, so an admitted phone step actually runs. `WorkflowCalendar` (`src/workflows/calendarRanges.vibe`) has no screen consumer; the simulator still uses the pure range helpers. The `post_notification` bindingHash omits the proposal digest, because `ExecutorCall` carries none.
- **Notes:** `create_note` still treats "Workflows in front" as a workflow run. Notes sits before the assistant in the runtime order, so it needs a port, filled by the shell from `DeviceReview.callFacts(call).workflow`. `NotesListFilter.negotiate` and `filesCapabilities` can read the advertised names once the shell fills `AdvertisedCapabilities`.
- **Maps:** `src/maps/failure.vibe` could use account's `limitOfRefusal` instead of reading `resetAt` itself.
- **Calendar:** a device-calendar event saved from a note is not back-linked. The new-event form can now save to a phone calendar, but `linkSavedNote` links only an agent event a readback confirmed (`AgentCalendar.createdEvent`), so a phone event from a note says "Saved · note not linked". The device create's confirmed id needs to reach Notes' origins.

## Inbox and Calendar (after the area pass)

- Inbox and Calendar sources and tests now type-check under vibestack-dp, except the Calendar named read (see plugin-calendar below), but none of their tests has run: `apps/app`'s Vitest cannot start (generated-test step, `eliza-source` resolution and the composed layers, as for Shell and Clock), and under a scratch area config the Inbox and Calendar tests stop on other areas' modules they import (`src/platform/storage.vibe`, `src/account/google.vibe`, `src/platform/native.schema.vibe`) and on `@elizaos/core` not resolving from `vendor/eliza/packages/plugin-calendar`.
- **OWNER:** Home shows Inbox's unread count only and reads no mail (`spec/shell/overview.md`, "Home never reads mail"), where legacy showed unread subjects and senders from one header read; and To suggestions come from recent mail only, no longer from Contacts (`spec/inbox/drafts.md`). Both are deliberate in the spec; confirm.
- Calendar's device create is reachable now (a phone calendar chosen in the form), but its recovery surfaces are not: `useDeviceWrites`' pending creation and failed recovery have no "Check" or "Create separately" control (`DeviceCalendar.checkCreations`, `openForm(…, separate)`), Android Calendar's hand-off and editor (`handoff`, `openExternal`) are reached only through `deviceRoute`, and the form has no guests, alert or video fields. An existing all-day, other-zone or repeating phone event is still saved through the plain `save` with instants only, where legacy opened Android Calendar's editor.
- Calendar decisions the spec models that the shell re-implements or never calls: `confirmsDelete`/`deleteConfirmed`, `undoQueuedDelete`, `eventChanged`, `shiftedOffset`, `scopeNeeded`, `editorMutability`, `returnDay`, `sourceShown`, `phoneFreshness`, `readStart`, `agentAllDayUpdateAllowed`; `namedOutcome` reads the outcome from upstream's English summary (`src/calendar/requests.vibe`).
- Inbox's mark read and unread prepare and dispatch directly under a fresh id with no journal record, while `spec/inbox/operations.md` says every change is one journaled operation; and drafts written on a legacy Alpha Cloud (cutover) build are not adopted, because `previousEnvironments` maps only `ElizaCloud/*`.
- Tests and proofs: no conformance driver for any `inbox__*` or `calendar__*` module, no `.proof.dfy` under `spec/inbox` or `spec/calendar` (legacy proved `inbox-operation`, `inbox-edit-coalescer`, `gmail-mailbox` and `calendar-days`), and `InboxScreen.tsx`, `CalendarScreen.tsx`, `HomeAgendaCard.tsx` and `Surfaces.tsx` have no `.meta.tsx`. `scripts/legacy-retirement.json` maps inbox entries to `spec/inbox/digest.md` and `agentDrafts.md` and calendar entries to `googleLink.md` (now restored), `sync.md`, `nativeSync.md`, `linkedLocal.md`, `preservation.md` and `disconnect.md`, most of which do not exist; the Google disconnect now lives in `googleLink.md`.

## Voice

- The relay's listener registration is forked with one `yieldNow` before `startCloudSpeech`; upstream awaits a real registration, so an event posted at the very first moment could be missed.
- Pass the capability header to `Resident.stream` in `src/voice/conversation.vibe` as the assistant does through `AdvertisedCapabilities`.

## Account

- AppLifecycle's `Net` has no unvalidated state, so sign-in still reads `ElizaSystem.getNetworkStatus` once per lifecycle change for `internetValidated`. A flip with no other App change is not seen until the next return to the app.
- Not verified: that the owner route table admits `/api/client-devices/{register,context,view-profile}`, and that upstream's context `subjectUserId` equals the resident's `/api/auth/me` owner or the Cloud userId.
- Not verified: the import cycle account/enrollment → shell/assistantHost (`DeviceCapabilities`) → account/bindings → account/enrollment. Every reference is lazy, inside layer bodies.

## Inbox, Notes and Telephony (carry-over)

- Nothing reviews held values yet: `DeviceStorage.held`/`resolve` have no UI caller. Inbox's held copy is reachable only through `mailHeld`, not the global DeviceStorage.
- Tests and drivers under `test/{inbox,notes,telephony}` are not updated for `ownerKept`/`follow` and `storedOrHeld`: nothing covers damaged held values, picture moves on adoption, or owner rebinds seen by late subscribers.
- Legacy `RendererHostedInbox`/`NativeHostedInbox` digest-retention models stay with the Workflows digest inbox.

## Android / native

- Best-effort and unbuilt: the `ElizaAgentService` compatibility layer, the `android/agent/host.json` route lists (about 160) and the `policy.json` action allowlist and plugin load order. The `BROWSER_*` sub-action names are guessed.
- `scripts/stage-agent-runtime` and `agent:stage-android` must produce the payload layout upstream PayloadCheck expects under `assets/agent`.
- The native channel takes no headers, so `X-Eliza-Device-*` and `X-ElizaOS-Client-Id` are no longer forwarded on native requests (needs the upstream items below).
- ElizaSecureStore must accept the exact `inbox-drafts:v1:*` names the renderer reads and the keys `device:alpha/device/inbox/drafts~held` and `device:alpha/device/inbox/operations~held` (keys over 200 characters are refused). `RendererCredentialSlots` now admits the `~held` suffix; that the whole store path accepts them on a phone is not checked. Until it does, Inbox runs its journal in memory after a bad stored value, and now refuses to dispatch from it rather than sending un-journaled. AlphaConnection must keep answering `secureRead`/`secureCompareExchange` for the `inbox-drafts:v1:*` slots and `notes-folders:v1:device`, `note-origins:v1:device` and `notes-trash:v1:device`.
- `WorkflowBridgeHost.perform` still reads `read_calendar_range` in-process with SelectedCalendarReader instead of forwarding to the renderer's Calendar operationPorts.
- `spec/shell/system.md` (home-start handoff, text zoom, Settings shortcuts) has no renderer path.
- The Google App Link `appReturn` has no native source. The delegation-callback and workspace-return methods stay on AlphaConnection.
- Java-side host models are missing: IdentitySession, NativeCredentialMutation, NativeGoogleAccessFile and GoogleBrowserReturnClaim. There is no native conformance driver for `voice__keyboard`.
- `AlphaTelephonyBase` is still Alpha's fork of upstream TelephonyPlugin.

## Tooling / repository root

- The eliza pin is now vibestack-dp `6451775c35a` (eliza#40258). It exports `workflowDeviceOffer` (`packages/agent/src/device-actions/workflow-offer.vibe`), so the earlier need to move past `c8f273cec1b` is met; `pnpm-lock.yaml` is committed and `pnpm install --frozen-lockfile` passes. `pnpm gen` exits 0.
- `pnpm typecheck` fails with 493 syntax-phase errors in 93 files (mostly EK0301, `!` beside a union or function type without parentheses, and TS1005/TS1128 around `match (…) { when …: }` blocks). vibelang stops before semantic checking, so the count of type errors behind them is unknown. Browser has 234 of them, account 72, notes 47, inbox 36, every other area under 20.
- `scripts/generate-licenses.ts --check` crashes: `node_modules/@tesseract.js-data/eng` is not installed (see the OCR item below). The elizaOS entry of the committed notices was edited by hand to name the new pin.
- The Tesseract OCR assets are not set up:
  - the files are not served under `apps/app/public/ocr/`;
  - `vite.config.ts` must add `localOcrAssets()`;
  - `apps/app/package.json` must list `tesseract.js-core` and `@tesseract.js-data/eng`.

  The root `package.json` also lacks `@electric-sql/pglite`, which `eval-phone-actions.ts --database` needs.
- `scripts/resident` must:
  - register the `workflow-device` and `workflow-native-digests` runtime services;
  - call `registerMapsViews`/`registerMapsSavedPlaces` (`namesAlphaView` is a fixed word list).
- `scripts/os-ported/**` and the harness scripts (`android-instrumentation.ts`, `android-workflow-native.ts`, `native-test-fixture.ts`) are still to be rewritten onto `@elizaos/os/image`.
- `scripts/ci/export-browser-proof.ts` must keep shipping `delegation-return.html` alongside `index.html`.
- `scripts/legacy-retirement.json` (around line 498) still marks `test/batch-voice-progress-ack.test.mjs` "mapped"; it is deleted, so mark it "removed", pointing to `spec/voice/acknowledgement.md`.
- These tests still target removed code:
  - owner-route-parity (including its JVM half), `test/android-host.test.mjs` and verify-apks import the removed `product/owner-route-table.ts` or the legacy generator;
  - `specs/quint/refinement/native/credential-coordinator*.mjs`;
  - `scripts/test-cloud-delegation-return.ts`, `test/quint-conformance.test.mjs` and `specs/quint/refinement/application/portable.mjs` validate the old static delegation page, not the forwarder.

## Upstream (eliza)

- **os:**
  - the ElizaAgent bridge carries no headers at pin `c8f273cec1b`: add `AgentRoute.headers` (the four admitted device headers) and carry them through `AgentPlugin.ask`, `AgentChannel.ask` and `AgentSocketClient`'s socket payload. Until then native ignores the headers Alpha passes;
  - there is no `sharedBackupReadiness`/`approveSharedBackup` implementation;
  - `CloudRequestPolicy.PROVIDER_HOSTS` (`ElizaCloud.openExternal`) does not admit `invoice.stripe.com`.
- **agent/client:**
  - `TurnTransport`, `RuntimeJsonBridge.request`/`requestStream` and `client.request`/`client.stream` take no headers, so the development host off the phone drops device headers;
  - `encodeTurnContext` must accept the `selectedObject` kinds `map-place`, `map-route` and `map-search` and the metadata keys `viewClientId`, `viewDelivery` and `uiView` (assumed, not checked);
  - there is no `clientDevice.browserPage` (eliza#40067/#40193);
  - voice speaks the agent's `acknowledgment` frame from the readers of elizaOS/eliza#40293 (`1ff497fc4f0`), which the vibestack-dp pin contains; this is not yet run against the pin;
  - the strict DoneFrame refuses `awaitingReview`, and DoneFrame notices are never produced;
  - there is no shared-note read-reply lease (`readReply`/`completeReadReply`);
  - `./client` does not re-export `learnPeer`/`comparePeer`/`statusRead`.
- **agent:** a workflow device-offer helper is missing, so `read_selected_notes`/`create_note` can answer DEVICE_STEP_UNSUPPORTED.
- **agent/voice:** `VoiceReplyAction` has no failure flag, so the "email action failed" line is unreachable.
- **cloud:** the device route table lacks `creditsCheckout`.
- **plugin-calendar:** `executeNamedCalendarRead` needs the reviewed-reads `Machine`, which only the package's generated code holds and its exports do not reach, so `src/calendar/requests.vibe` `namedRead` cannot type-check (EK3101) or run. Commit 6f27999c6bc (branch `calendar-client-named-read-machine` in `~/Work/eliza`, on vibestack-dp, not built) re-exports it as `NamedReadMachine`/`namedReadMachine()` from `@elizaos/plugin-calendar/client`; after a repin, Calendar's layer provides `namedReadMachine()` and `requestsLayer` hands it to each named read.
- **plugin-inbox:** a read message carries no Reply-To (`GmailReadResult`/`wire.schema.vibe` have no `replyTo`), so `src/inbox/gmail.vibe` sets `replyTo: ""` and a reply always goes to the sender, never to a list's or ticket system's Reply-To.
- **plugin-inbox:** `inboxComposeActionName` is exported only from the package root, so voice keeps a local copy.

## Unverified in the code-only phase

- **Generated names:** the gen names each area assumed from its quint have not been checked against generated output:
  - platform: resetCarried, adoptionOf, legacyCleared, SlotAdoption, `headerAdmitted`, `DeviceHeader`;
  - assistant: timedAsVoice, browserCarded, sendsBrowserPage, `ownerTyped`, `destinationOf`, `workflowStepRuns`, the views module and others;
  - voice: `voice__acknowledgement` (CueTurn, acknowledged, audible, replyReady, ended, cancel, replyMayStart), cross-module `R::cueReplyBoundMs`, `R::ackLimit`, `R::Cue`, plus the extended `voice__latency`;
  - account: `account__enrollment`, `paymentPageOpens`, `authorizePageOpens`;
  - browser: `browser__pageContext`;
  - calendar: `calendar__googleLink` (GoogleRow, PauseReport, googleRow, grantOf, pauseNeeded, pauseReport, accessContinuation), `calendar__home` homeReads, `calendar__presentation` replyRereads, `calendar__editor` agentRepeatSendable and newEventTarget;
  - camera: `camera__agentCapture` `panelLimitMs`;
  - clock: `clock__agentReview`, `clock__notifications` ConsumeAnswer and consumeAccepted;
  - inbox: keepPrevious, inboxAdvertised, `decodeState`/`machine` of `inbox__drafts` and `inbox__operations`;
  - notes: `noteSaveResult`;
  - settings: Elsewhere, calendarSettingsRoute and others;
  - telephony: askLeavesField, `searching`;
  - files: `shell__navigation` `initial`/`Nav`;
  - workflows: Kept, PageWrite, PageEnd, historyLimit, `workflows__deviceSteps` noticePath, postedOutcome, PostedAnswer.
- **Effect and VibeLang typing:**
  - `Layer.unwrap` in `storedOrHeld`;
  - `Effect.onInterrupt`;
  - `runSyncExit` over BrowserAgent;
  - `Effect.serviceOption(AppLifecycle)`;
  - fork → yieldNow → `Fiber.join` under timeoutOption;
  - `let` rebinding of a `catch` expression;
  - a getter inside `satisfies Pick<…>`;
  - the `Stream.filter` refinement, `Stream.mapEffect`/`Stream.concat` and `Ref.Ref` in the resident stream relay;
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
  - `workflowPresentationCapabilities` on AlphaNotifications is inherited from upstream NotificationsHostPlugin; confirm it exists at the pin, or phones register workflowProtocol 1, not 5;
  - owner-route-parity's reference reading.
- **No tests:** no camera test covers a chat that stays open during the reveal.
- **No meta file:** MapsScreen, MapPlane and the runtime-bound telephony screens (PhoneScreen, MessagesScreen, ContactsScreen, CallBar, UndoNotice, ReviewRows, PhoneInfoPanel) have no `.meta.tsx`.

## After merging develop through #1449 (#1422 retirement)

- Android code that #1422 itself kept: `PairedAgentCredential`, `PairedSpeechContract`, `HostedTransport`, the paired branch in `AlphaVoiceCloudPlugin`, `ConnectionRoutes.retiredPairing`, `CalendarSyncBridge` and Android `AlphaCalendar.sync`. **OWNER:** retire these too, now that client Calendar linked sync is gone from the app?
- Calendar's Google link (`src/calendar/link.vibe`) uses `/api/lifeops/calendar/sync-control`, `/sync-control/destinations` and `/links` again; `owner-routes.json` and `android/agent/host.json` admit all three; whether the resident at the pin serves `/sync-control/destinations` on the phone is not checked.
- Some androidTest files still call `AlphaConnection.secureWrite`/`secureRemove`, which the branch removed.
- `docs/simplification-audit/**` (4,666 files) came in with #1422 and describes the legacy renderer.

## After merging develop through #1459

These develop changes landed on legacy renderer files the port deleted. Their behaviour is not in
`apps/app` yet; each belongs to the area named and must be ported into its spec and source. The
develop eliza pins `7a124190a1`, `9222a9e3c6` and `ca435030bc` are legacy-develop commits, not in
vibestack-dp; whether their agent-side fixes (eliza#40213, #40234, #40265, #40290) are ported to
vibestack-dp is an upstream question.

- **Browser (#1453):**
  - "close every tab" from outside a private tab: the receipt counts the tabs it closed and says private tabs were left open (not "Closed all tabs."); the card adds how many private tabs stay open; with only private tabs open the notice says so instead of "No tabs are open to close." No private title or site reaches the agent or the card;
  - the close-all listing binds each tab's id, address and private flag plus the count of private tabs kept, not titles, so a tab that only retitles itself no longer refuses an approved close-all (`spec/browser/session.md`, `listedOf`/`listingCurrent` still compare titles);
  - a switch, closing the showing tab and page history run after the receipt; when that presentation is skipped (screen off, context or session changed, request no longer current, or it threw) the owner gets a correction notice instead of an unretracted success claim.
- **Browser (#1455):** a turn should rarely wait on a page read. Browser captures the shown page once it settles after loading (700 ms) and again when the assistant opens over it (no more than once per 5 s, and not when a capture younger than 20 s holds), keeps one capture per tab and revision in memory for at most 10 minutes, and a turn waits at most 250 ms for a fresher read before sending the capture; it waits the full 1.2 s only when it has none. No capture is taken or kept with Browser page for Alpha off, private tabs are never read, and the browser build does not capture ahead. `spec/browser/pageContext.md` still says every message reads the page itself. The turn's fresh status read starts beside the position and page reads, and the device preferences and Notes folder names start at the beginning of the send.
- **Assistant / Telephony / Voice (#1453):**
  - a chat turn holds the view steps its own request performs (a directly requested keypad, filtered Contacts list or draft in another Messages conversation) and runs them once its reply and its own navigation are delivered; a typed turn runs them in place, a voice turn carries the conversation to each step's view through the session's navigation hold, as a spoken VIEWS move does; failed and cancelled turns release their steps;
  - a held step counts the turn's own delivered switch as current and nothing else; the Browser step asks whether a chat request a view change would cancel is pending (`requestHoldsViews`), not whether any request is (an automatic workflow generation is not);
  - a view step's show may settle later (the Messages draft step settles once its thread is open); the voice release path waits for it before pinning, and while a navigation commit is still placing its view, changes on the claimed view count as current, so the voice conversation is kept.
- **Telephony (#1453):**
  - the contact-save review shows each line on its own wrapping line, with its strike and weight, and says Remove, Add, Keep or Rename from in words;
  - contact lookups read one row past the ten they list; when more contacts match, the card says "More than N contacts match …, including" and the on-phone review shows a note;
  - a new contact's numbers are also looked up with Android's exact number matching, so a number saved under another name is shown before it is added again.

