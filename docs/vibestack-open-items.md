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

  The Calendar "Not connected" Settings button still opens account > google; confirm that target.
- **OWNER:** Legacy slots not carried over:
  - old inbox operation records (`inbox-operation:v1:<sha256>`), possibly including a send in flight during the update: move to `device:<key>` in MailOperations, or drop?
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
- **OWNER:** An upward swipe on Home opens the chat sheet (`spec/shell/gestures.md`, `RaiseAssistant`); legacy Home scrolled freely and only the dock opened chat. Keep the swipe, or drop `RaiseAssistant`? Gestures that start in the conversation or the composer, or end with text selected, are now ignored either way.
- **OWNER:** Home grew a Notifications bell (launcher and standalone browser builds) and a Clock tile with timers, a stopwatch and world clocks; legacy removed Home's notifications control (#416/#417) and kept alarms inside Workflows. Keep them, gate the bell on test mocks off the phone, or remove them?
- **OWNER:** Reminders has no way in from Home or the Add sheet (`reminders` has no `homeRank`), and Calendar no longer lists reminders. Give Reminders a Home rank, or restore the Calendar listing?
- **OWNER:** Persistent notices are listed at the top of every screen, where legacy kept them in the chat. Keep the placement?
- **OWNER:** The minimum supported WebView: legacy supported WebView 113 (no `AbortSignal.any`); state the floor or add the fallback.
- **OWNER:** Legacy page-storage keys (theme, saved Maps places, conversation, voice and calendar choices, Gmail account choice, a pending photo copy) and the legacy slots `assistant-draft:v1:*`, `sms-draft:v1:*`, `workflow-draft:v1:*`, `reminder-creations:v1:device`, `reminder-deletions:v1:device`, `clock-handoff:v1:device`, `stage-session:v1` are not adopted. Adopt each, or accept losing it?
- **OWNER:** Accept the legacy Trash import limits in Notes: imported rows get new IDs and a fresh deletedAt, and their recordings stay in the device audio trash.

## Shell (integration)

- `src/shell/assistantHost.vibe` keeps local copies of `learnPeer`/`comparePeer`/`statusRead`, because upstream `./client` does not re-export them at the pin. The eliza branch `vibestack-dp-alpha-peer-exports` (`3b83b114b84`, not built or merged) adds the re-exports; drop the copies after the next repin.
- `src/web/runtime.ts` does not type-check yet: the composed runtime layer's error and requirement types read as `unknown` while other areas' layers still have type errors (seen with the other areas' syntax errors patched locally, not committed). Shell, Clock and Platform sources and tests type-check otherwise.
- Browser has no always-mounted sheet; the "Browser shade sheet" was read as the browser build's notification shade in clock-notices. If another Browser sheet was meant, it needs its own surface and Back.
- Hardware Back does not close an open Inbox search field that has no submitted query, because that state is UI-local in InboxScreen (Inbox). The on-screen Back does close it.
- The assistant's advertised capabilities are re-selected for each request from those advertised at registration (`EnrolledDevice.capabilities`), not from everything the agent offered: a capability that becomes available after registration is advertised only after the next enrollment. Keeping the offered list in `EnrolledDevice` (account) would close this.
- Not yet ported from the shell/clock audit (`alpha-shell-clock.md`):
  - G5: no landscape arrangement and no fitted 412 px canvas; `swipe` takes raw client pixels, so the right-edge Back and the bottom-bar HOME zones assume a 412 x 872 window;
  - G6: Home's brief card is never fed: `Overview.reportBrief` has no caller, and Workflows' digest panel keeps the brief's text but not its outcome (Workflows);
  - G7 (upcoming): an upcoming, not yet overdue, reminder never leads Home's agenda; `spec/calendar/home.md` `nextLead` has no caller (Calendar). Overdue reminders now reach Home;
  - G8: the legacy `reminder-creations:v1:device`, `reminder-deletions:v1:device` and `clock-handoff:v1:device` slots are neither adopted nor listed below as accepted losses;
  - G10: the held Back gesture previews nothing; Android still posts `alpha-back-preview` and no rule covers it;
  - the toast in a dialog is drawn in the topmost open Radix dialog found in the DOM, not chosen by the spec's `toastHost(nav.layers)`;
  - V1/V2: no Dafny proof and no conformance driver exists for any shell, clock or platform machine.
- Not yet ported from the platform audits (`alpha-platform-a.md`, `alpha-platform-b.md`):
  - legacy page-storage keys (`alpha.appearance.v1`, `alpha.maps.saved-places.v1`, `alpha.connection.conversations.v1`, voice and calendar preferences and others) are not adopted on update, so saved Maps places and the theme are lost at the cutover (see the OWNER item below);
  - no fallback for a WebView without `AbortSignal.any` (WebView 113); either an upstream `anySignal` helper or a stated minimum WebView is needed;
  - the device's locale and 12/24-hour setting (`System.getLocaleInfo`) are not read; every time uses the WebView's `Intl` default;
  - an agent start refused with nothing held for review is a dead end (`resident-live.vibe` answers `needs-recovery` until the page restarts, and `control.recovered()` has no caller); legacy offered Try again and named each refusal;
  - `DeviceStorage.reset()` and `resetOwner` have no caller, and about 30 stores use the literal `device` namespace instead of the bound owner;
  - nothing holds Home until the sign-in page or the agent is ready (#1357), so Home flashes before the required sign-in page;
  - `spec/platform/rendererRecovery.md` has no consumer and no native conformance driver over `RendererRecoveryBudget.java`;
  - a cancelled connect no longer withdraws the native start (no `cancelStart` upstream);
  - native voice turns carry no `X-Eliza-Trace-Id`, and the stream's 60 s idle and 600 s turn limits are shell constants with no Quint value or clocked test.

## Assistant

- The composer sends the Browser page as `metadata.clientDevice.browserPage`, but upstream at the pin reads it only as `metadata.browserPage` (`readTurnContext`, `turns.vibe`), so the page never reaches the agent even now that the peer declares it.
- `spokenCue`'s `replyReady()` does nothing when no cue was said, so a later `say()` would still play after the reply (`src/assistant/cue.vibe`). Voice guards against it with its own machine.
- `metadata.clientDevice.calendarAgendaSource` is not sent, because Calendar exports no agenda source for the shown day.
- `workflowStepDecisions` and the workflows layer each build their own WorkflowApi/WorkflowVersions. Composition may want to share one.

## Areas consuming assistant changes

- **Telephony:** `useComms` and CallBar approve/decline should call `commsReviewFromAssistant().approve/decline` (`src/assistant/call-facts.vibe`) after CommsStage, so a bar approval runs through DeviceReview. `askAlpha` should call `Assistant.askComms(key, text)` so asking the same text twice is detected.
- **Clock:** a tapped workflow approval notice now asks through `workflowStepSource`, but the tap names neither the workflow nor the step, so the review is titled "Workflow step"; naming them needs the run's workflow and pending step from Workflows.
- **Workflows:** `src/workflows/notices.vibe` should call `DeviceReview.workflowStep(runId, stepId)` in its Executing phase, so an admitted phone step actually runs. `WorkflowCalendar` (`src/workflows/calendarRanges.vibe`) has no screen consumer; the simulator still uses the pure range helpers. The `post_notification` bindingHash omits the proposal digest, because `ExecutorCall` carries none.
- **Notes:** `create_note` still treats "Workflows in front" as a workflow run. Notes sits before the assistant in the runtime order, so it needs a port, filled by the shell from `DeviceReview.callFacts(call).workflow`. `NotesListFilter.negotiate` and `filesCapabilities` can read the advertised names once the shell fills `AdvertisedCapabilities`.
- **Maps:** `src/maps/failure.vibe` could use account's `limitOfRefusal` instead of reading `resetAt` itself.
- **Calendar:** `surfacesBack()` in `src/web/calendar/index.tsx` is no longer used and can be dropped. A device-calendar event saved from a note is not back-linked, because Calendar's new-event form always writes to the agent calendar. `linkedProviderEvents` mapped-copy suppression is not wired (legacy did not use it either).

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
- ElizaSecureStore must accept the exact `inbox-drafts:v1:*` names the renderer reads and the keys `device:alpha/device/inbox/drafts~held` and `device:alpha/device/inbox/operations~held` (keys over 200 characters are refused). AlphaConnection must keep answering `secureRead`/`secureCompareExchange` for the `inbox-drafts:v1:*` slots and `notes-folders:v1:device`, `note-origins:v1:device` and `notes-trash:v1:device`.
- `WorkflowBridgeHost.perform` still reads `read_calendar_range` in-process with SelectedCalendarReader instead of forwarding to the renderer's Calendar operationPorts.
- `spec/shell/system.md` (home-start handoff, text zoom, Settings shortcuts) has no renderer path.
- The Google App Link `appReturn` has no native source. The delegation-callback and workspace-return methods stay on AlphaConnection.
- Java-side host models are missing: IdentitySession, NativeCredentialMutation, NativeGoogleAccessFile and GoogleBrowserReturnClaim. There is no native conformance driver for `voice__keyboard`.
- `AlphaTelephonyBase` is still Alpha's fork of upstream TelephonyPlugin.
- The agent's Gmail-changes and Calendar-edits switches are saved and published, but `android/agent/host.json` launches the agent with `gmailChanges: false, calendarEdits: false` and nothing reads `ALPHA_GOOGLE_AGENT_ACCESS_FILE` (upstream takes consent only from the launch document), so agent-side Google writes are always refused whatever Settings shows. The launch must carry the saved switches (and restart the agent on a change).
- `android/agent/host.json` sets no `CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS`, so one hosted-model 429 holds the account for the provider's whole retry time instead of legacy's under five seconds (#1417/#1428/#1448).

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
- **cloud:** `@elizaos/cloud` has no `CloudServices.client.googleCalendarSync(request, { signal })` (assumed signature, used by `src/calendar/deviceSync.vibe`), and the device route table lacks `creditsCheckout`.
- **plugin-inbox:** `inboxComposeActionName` is exported only from the package root, so voice keeps a local copy.

## Unverified in the code-only phase

- **Generated names:** the gen names each area assumed from its quint have not been checked against generated output:
  - platform: resetCarried, adoptionOf, legacyCleared, SlotAdoption, `headerAdmitted`, `DeviceHeader`;
  - assistant: timedAsVoice, browserCarded, sendsBrowserPage, `ownerTyped`, `destinationOf`, `workflowStepRuns`, the views module and others;
  - voice: `voice__acknowledgement` (CueTurn, acknowledged, audible, replyReady, ended, cancel, replyMayStart), cross-module `R::cueReplyBoundMs`, `R::ackLimit`, `R::Cue`, plus the extended `voice__latency`;
  - account: `account__enrollment`, `paymentPageOpens`, `authorizePageOpens`;
  - browser: `browser__pageContext`;
  - calendar: `calendar__deviceSync`;
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
  - `createCalendarSyncHost`'s effect members called from VibeLang;
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
- `owner-routes.json` still lists `/api/lifeops/calendar/sync-control` and `/links`.
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

