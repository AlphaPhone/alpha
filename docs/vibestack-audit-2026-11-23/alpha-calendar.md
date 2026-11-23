# Alpha parity audit: calendar

Slice: agenda, events, reviewed writes, Google Calendar linking, device calendar, availability, agent
calendar actions, alerts. Legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream
`eliza-vs`. Read-only; nothing was built or run. Paths are relative to `/home/shaw/.cache/vibeaudit/`.

## Summary

| Class | Count |
| --- | --- |
| OK | 34 |
| UNMODELED | 3 |
| UNIMPLEMENTED | 9 |
| MISSING | 5 |
| CHANGED | 9 |
| RETIRED | 19 legacy files (one item) |
| KNOWN | 8 |
| UNVERIFIED | 5 |

Verdict: **not at parity.** The models are good (every one of the 153 rules has a Quint block, and the
agent read/write machine, drafts, device writes, selection, Home ranking and range reads are both
specified and wired). The gaps are in the wiring and in what the #1422 merge removed. Four are
blocking for an owner: (1) the Calendar approval review can never open, so no agent change to a
Google calendar can be approved on the phone; (2) the Google Calendar link ("Sync Calendar with
Google", Synced status, Calendar-scoped disconnect) was deleted from the port although `develop`
still ships it after #1422; (3) the Calendar-write consent button sits in a panel nothing opens;
(4) Home's agenda card is never read until the owner opens Calendar. The 2026-11-20 cut-off fix
("Needs your approval · reply cut off") is modelled but its call site passes constants, so it is
unreachable. Android main sources for Calendar are byte-identical to develop, so the native side is
at parity. Test depth dropped from about 430 legacy tests to 34 story tests with no conformance
driver and no Dafny proof.

## Gaps

### 1. UNIMPLEMENTED (blocking): the Calendar approval review cannot be opened

- Behaviour: a change the agent asks for on a Google calendar waits in the approval queue; a card in
  the conversation opens a review that shows the exact fields, re-reads at the tap and sends one
  typed decision.
- Legacy: `alpha-develop/apps/app/src/prototype/calendar-approval-adapter.ts:79` (chat rows get
  `calendarReviews` with status and `open:()=>void review(this,id)`), `:62` (refresh on success);
  `apps/app/src/ui/calendar/calendar-approval-messages.ts`; 35 tests in
  `test/calendar-approval-ui.test.mjs`, 8 in `test/calendar-approval-client.test.mjs`,
  `test/browser/calendar-approval-queue.spec.ts`.
- Port: spec `alpha-vs/apps/app/spec/calendar/approvals.md` and service
  `src/calendar/approvals.vibe` exist, and the sheet is mounted (`src/web/calendar/Surfaces.tsx:55`).
  But `ApprovalReviews.open` has no caller outside `test/calendar/calendar.test.vibe:138`, and
  `reviewText`/`calendarReviewText` (`approvals.vibe:50`) has none at all. The assistant's reply
  parser admits only `maps-share` and `checkin-*` blocks (`src/assistant/reply-lines.vibe:25`), so a
  `[CHOICE:approval-<id>]` block is shown as literal text.
- Impact: "cancel my dentist appointment" on a Google calendar queues a request the owner can
  neither approve nor decline on the phone. The form's own "Waiting for your approval" outcome
  (`src/calendar/screen.vibe:286`) has the same dead end.
- Smallest fix: in `src/assistant/reply-lines.vibe` classify `approval-<uuid>` choice blocks (through
  `calendarReviewText`) into a transcript row; in `src/web/assistant/Transcript.tsx` render it with
  its status (`approvalStatus`) and a Review button calling `ApprovalReviews.open(id)`. Add the rule
  to `spec/assistant/reply.md` (the card) and keep `spec/calendar/approvals.md` as is. Also call
  `ApprovalReviews.retire()` on conversation change and from `hideCalendar` (`src/calendar/binding.vibe:105`);
  today only an account change retires it (`binding.vibe:22`), though the rule says "a changed
  conversation, a hidden page or Back".

### 2. MISSING (blocking, needs an owner ruling): Google Calendar link, Synced status and Calendar-scoped disconnect

- Behaviour: Settings > Calendar > Google Calendar shows Connected / Finish setup / Not connected /
  Couldn't check; opening it with a write grant links the agent's Calendar to the owner's unique
  primary Google calendar through select and resume, and reports Synced only from a clean readback
  (Syncing, Waiting, Unconfirmed, "N held", Wrong account, Changed elsewhere). Disconnect from that
  panel pauses sync through the same control before revoking.
- Legacy (live on develop after #1422): `alpha-develop/apps/app/src/prototype/settings-adapter.ts:917-935`
  (the page, row at `:924` calls `googleConnectionController.openCalendar(scope)`);
  `apps/app/src/runtime/google-accounts.ts:353` (`linkGoogleCalendar`), `:413`
  (`googleCalendarDisconnectLifecycle`); `apps/app/src/runtime/google-connection-ui.tsx:316,344`;
  `apps/app/src/runtime/agent-calendar.ts:246-262` (`reviewSync`, `listLinkedEvents`, `changeSync`
  over `/api/lifeops/calendar/links` and sync-control). Tests still on develop:
  `test/google-calendar-connect.test.mjs` (36), `test/google-calendar-link-status.test.mjs` (4);
  models `GoogleCalendarLinkFlow.qnt`, `GoogleCalendarLinkPublication.qnt`,
  `GoogleCalendarAccessChoice.qnt`, `GoogleCalendarDisconnect.qnt`, `AgentCalendarSyncControl.qnt`.
- Port: merge commit 3d7ca972 deleted `apps/app/spec/calendar/googleLink.md` (172 lines),
  `disconnect.md` (107), `sync.md` (214) and `src/calendar/sync.vibe`, `SyncSettings.tsx` along with
  the genuinely retired files. Nothing in `alpha-vs/apps/app/src` now calls sync-control or
  `/links`; only `src/platform/owner-routes.json:56,65` still lists them (open-items mentions the
  stale routes, not the lost feature). Upstream still serves the control
  (`eliza-vs/packages/calendar/src/plugin/linked-routes.vibe`, `client/linked-sync-api.vibe`,
  `eliza-vs/spec/calendar/linkedSync.md`). Settings > Calendar now opens only the two-switch
  Calendars sheet (`src/settings/navigation.vibe:90`, `src/web/calendar/CalendarSources.tsx`).
- Impact: an owner cannot make the agent's Calendar sync to Google from the phone, cannot see
  whether it is synced, and a Google disconnect no longer pauses sync first. New events are written
  to the agent's own calendar (`screen.vibe:279-284`), so without a link they never reach Google.
- #1422 retired the client-side linked sync (phone copying Google events into device storage). It
  did not retire this agent-side link. If the owner wants it retired too, say so in
  `docs/vibestack-open-items.md`; otherwise restore `spec/calendar/googleLink.md` and
  `disconnect.md` from 3d7ca972^1, re-add a link service over `@elizaos/plugin-calendar/client`
  linked-sync API, and a Google Calendar row on a Settings Calendar page.

### 3. UNIMPLEMENTED (blocking): Calendar-write consent is unreachable

- Behaviour: "Connect Google Calendar" / "Update Calendar access" asks Google for Calendar read and
  write after "Allow Calendar changes".
- Legacy: `google-connection-ui.tsx:344` (`aria-label` "Sync Calendar with Google" / "Connect Google
  Calendar"), tests "the Calendar intent asks Google once for Gmail read plus Calendar read and
  write", "Allow Calendar changes comes before Google consent" in `test/google-calendar-connect.test.mjs`.
- Port: the button exists only in the `CalendarPanel` branch
  (`alpha-vs/apps/app/src/web/account/GooglePanel.tsx:61-67`), and nothing opens that panel:
  `src/account/presentation.vibe:61` and `src/account/google.vibe:185` open `SettingsPanel` only.
  In `SettingsPanel` the buttons ask for `GmailRead + CalendarRead` or mailbox changes
  (`GooglePanel.tsx:74`). `spec/account/google.md:19` declares the panel type but no rule says who
  opens it.
- Impact: the owner can never grant `google.calendar.write`, so every agent Calendar edit on Google
  is refused. Calendar's own "Not connected > Settings" lands on the same panel
  (`src/web/calendar/CalendarScreen.tsx:139`).
- Smallest fix: `spec/account/google.md` gets a rule "Calendar opens the panel with its Calendar
  intent"; `src/web/calendar/CalendarScreen.tsx:139` and the Settings Calendar row call
  `google.open("CalendarPanel")`.

### 4. UNIMPLEMENTED: a cut-off reply never says "Needs your approval", and a server-side change is never "Done · reply cut off"

- Behaviour (fix of 2026-11-20, v613 review): when a reply fails after its only committed effect was
  a queued approval, the phone says "Needs your approval · reply cut off"; after a real change it
  says "Done · reply cut off".
- Legacy: `alpha-develop/apps/app/src/runtime/turn-effect-state.ts:4-40` (reads the reply's own
  `actionResults[].effectReceipts`, `calendar.approval_request` handling, rollbacks,
  `TURN_INTERRUPTED_AFTER_EFFECT`), used at `runtime/connection-ui.tsx:3364`.
- Port: rule in `alpha-vs/apps/app/spec/assistant/receipts.md:48-57` (`cutOffLabel`) and a dead
  duplicate `replyCutOffNeedsApproval` in `spec/calendar/approvals.md:140` (no caller). The one call
  site, `src/assistant/composer.vibe:497`, is
  `cutOffLabel(result.kind === "AgentFailed", <count of phone DoneCard receipts>, 0, false)`:
  `approvalRequests` is the constant 0 and `effectBeforeFailure` the constant false. The reply's
  effect receipts are not read here at all (only `src/workflows/changes.vibe:52` reads them).
- Impact: `NeedsApprovalCutOff` is unreachable. A resident-side calendar create/update/delete whose
  reply is cut off shows the generic failure, so the owner retries a change that already happened;
  a queued approval reads as a plain failure.
- Smallest fix: in `src/assistant/composer.vibe` count applied, not-rolled-back effect receipts and
  those of kind `calendar.approval_request` without a `calendar.event` artifact from
  `reply.actionResults` (reuse `ActionResultRecord` from `src/workflows/changes.schema.vibe`), and
  pass the reply's `TURN_INTERRUPTED_AFTER_EFFECT` code as the fourth argument. Drop
  `replyCutOffNeedsApproval` from `spec/calendar/approvals.md`.

### 5. MISSING: Home's agenda is not read until Calendar has been opened

- Behaviour: Home shows the next event (or a saved one, marked) from app start, and after resume.
- Legacy: `alpha-develop/apps/app/src/prototype/agent-calendar-adapter.ts:135` (shell
  `componentDidMount` ends in `refresh()`, plus `visibilitychange` resume), `:117` (saved feed kept
  while bootstrapping), `:363` (`goCalendar` re-reads on error or stale);
  `test/home-calendar-selection.test.mjs` (20 tests, e.g. "saved upcoming rows remain visible during
  refresh", "background arrival updates the same controller snapshot").
- Port: the only reader is `whileVisible` (`alpha-vs/apps/app/src/calendar/binding.vibe:74-91`),
  started alongside `useAgentView` (`src/web/calendar/hooks.ts:29-31`), which only
  `CalendarScreen.tsx:65` uses, and it reads only while `view === "calendar"`. `HomeAgenda.tapped`
  re-reads only if a window already exists (`src/calendar/home.vibe:107-110`). The saved feed is
  published only while `status === "Loading"` (`src/calendar/agent.vibe:110-113`), which needs a
  read to have started. `spec/calendar/home.md` has no rule that Home causes a read.
- Impact: after every app start Home shows the quiet "Calendar" card, never "Next", until the owner
  opens Calendar; after that it goes stale because nothing re-reads off-screen.
- Smallest fix: `spec/calendar/home.md` rule "Calendar reads the current window when an agent
  binding becomes usable and when the page returns"; in `src/calendar/layer.vibe` `followAccount`
  (after `bindCalendar`) and `followForeground` (on becoming visible) call
  `AgentCalendar.refresh(currentWindow())`.

### 6. CHANGED: a change made from chat or an approved request does not refresh Calendar or Home at once

- Legacy: `alpha-develop/apps/app/src/runtime/app-record-completion.ts:23-57`, emitted at
  `runtime/connection-ui.tsx:3426`, consumed at `prototype/agent-calendar-adapter.ts:135`
  (`invalidate(sessionId)` then `refresh(true)`); tests `test/app-record-completion-calendar.test.mjs`
  (4), `test/browser/calendar-chat-changes.spec.ts` ("the open Calendar follows an event the agent
  adds, changes and deletes from chat").
- Port: `src/workflows/changes.vibe:64` computes `calendar: true` and
  `src/assistant/composer.vibe:490` only adds a "Calendar changed" row. Nothing calls
  `readCalendar`/`AgentCalendar.refresh`. An approved review does refresh
  (`src/calendar/approvals.vibe:146-149`), but see gap 1.
- Impact: the open Calendar lags up to 60 s behind a chat change; Home does not update.
- Smallest fix: `spec/calendar/presentation.md` rule "A committed Calendar change in a reply reads
  again once"; in `composer.vibe` after `changes.settle`, when `changed.calendar`, call a Calendar
  port that runs `readCalendar(true, false)` or `agent.refresh(view.window)`.

### 7. CHANGED: a held deletion is sent without waiting for Calendar, and its failure is silent

- Legacy: `alpha-develop/apps/app/src/prototype/agent-calendar-adapter.ts:253-258`: the send waits
  up to 10 s while Calendar is refreshing or mutating, then deletes, then `refresh(true)`; a failure
  toasts `calendarErrorText(error)`; Undo after the send says "Couldn't undo" / "Not deleted"
  (`:251`). Tests `test/calendar-deferred-delete.test.mjs:44` ("a refused delete shows the event
  again and reports why").
- Port: `src/calendar/deletions.vibe:59-65` calls the send and on false only emits `sendFailed`. The
  send (`src/calendar/screen.vibe:160-170`) calls `agent.remove`, which the machine refuses as
  `WriteBusy` whenever a read is in flight (`spec/calendar/agent.md` `admission`,
  `src/calendar/agent.vibe:257-261`) and as not admitted when the event is no longer in the
  published feed (`agent.vibe:337-339`), for example after the owner moved to another month during
  the Undo window. No notice is shown in either case, and `retire` (`deletions.vibe:118-124`) drops
  a waiting deletion without the "was not deleted" notice its own rule states
  (`spec/calendar/deletions.md`, "A dropped deletion closes its Undo and says the event was not deleted").
  `CalendarScreen.tsx:175` also discards `deleteRow`'s result (`changed`, `external`, `unconfirmed`,
  `not-staged`).
- Impact: the owner sees "Event deleted", then the event quietly returns with no reason.
- Smallest fix: in `screen.vibe` `send`, wait (bounded) for `view.state.read.id === 0 &&
  write.id === 0` before `agent.remove`, and capture the event record at confirm time instead of
  re-finding it in the current feed; in `deletions.vibe` `dispatch` and `retire` show a `Notices`
  line; in `CalendarScreen.tsx` show the `DeleteResult`.

### 8. CHANGED: a declined invitation stays hidden after it was sent

- Legacy: `agent-calendar-adapter.ts:253` (`unchanged: row => confirmed.get(key) === row.metadata?.etag`),
  test `test/calendar-deferred-delete.test.mjs:102` ("a sent decline stops hiding once a read returns
  its row changed").
- Port: the rule exists (`spec/calendar/deletions.md`, "A declined invitation stays in the feed,
  changed: that read shows it again"), but `src/calendar/binding.vibe:54-57` passes
  `unchanged = listed and not cancelled`, with no version comparison, so a declined event that is
  still listed stays `Sent` and hidden until the app restarts.
- Smallest fix: keep the etag in `HeldRequest` (`src/calendar/deletions.vibe:14-22`) and have
  `binding.vibe` compare it.

### 9. CHANGED: a repeat chosen in the form is never sent

- Legacy: `agent-calendar-adapter.ts:297-299` (`draft.recurrence` through `calendarFormCreate` /
  `calendarFormPatch`), `runtime/agent-calendar-view.ts:18`; test
  `test/browser/calendar-options.spec.ts` ("all-day, zoned and repeating forms map to exact provider fields").
- Port: `src/calendar/screen.vibe:282-284` (create) and `:290-293` (update) build requests with no
  `recurrence`, although upstream's create request takes one
  (`eliza-vs/packages/calendar/src/client/calendar-api.vibe:41`); `repeatRule` (`screen.vibe:310`)
  is exported and unused. `agentCalendarAccepts` is called with `row === undefined` as
  "isAgentCalendar" (`screen.vibe:252`), so an edit that turns any existing event into Daily or
  changes a Google series' repeat passes, Save reports success, and the repeat is unchanged. The new
  form offers Daily/Weekdays/Weekly (`src/web/calendar/EventEditor.tsx:145-154`) and Save then
  refuses them.
- Smallest fix: pass `recurrence: rruleFor(fields.repeat)` on update when the repeat changed (scope
  `series`); pass the row's real provider to `agentCalendarAccepts`; hide the repeat select for the
  agent's own calendar as legacy did (`agent-calendar-adapter.ts:294`).

### 10. UNIMPLEMENTED: creating an event on the phone's own calendar, creation recovery, Android Calendar hand-off

- Legacy: the Calendar authority chooser "Agent Calendar / Android calendars"
  (`agent-calendar-adapter.ts:212-219`), device form in `prototype/calendar-adapter.ts`
  (`calendarNeedsHandoff` `:39`, `calendarUsesOptions` `:41`, pending creations `:70`, "Open in
  Android Calendar?" `:321`); tests `test/browser/calendar-creation-recovery.spec.ts` (9),
  `android/.../CalendarCreationRecoveryInstrumentedTest.java`, `CalendarExternalEditorInstrumentedTest.java`.
- Port: `spec/calendar/device.md` ("Create an event on my phone without making it twice") and
  `spec/calendar/editor.md:121-134` (`deviceRoute`) state it, and `src/calendar/device.vibe`
  implements `save` (create branch), `checkCreations` (`:256`), `handoff` (`:303`), `openExternal`
  (`:310`). None is reachable: `saveEditor` sends every new event to the agent's own calendar
  (`screen.vibe:277-287`), and `checkCreations`, `handoff`, `openExternal`, `remount`, `formChanged`,
  `deviceRoute`, `guestsSavable` have no caller. The form has no guests, alert or video fields.
- Also CHANGED: an existing all-day, other-zone or repeating device event is edited through the
  plain `save` with instants only (`device.vibe:226-227`), where legacy opened Android Calendar's
  editor.
- KNOWN in part: open-items, Calendar bullet ("Calendar's new-event form always writes to the agent
  calendar"). It does not say that the device create path, its recovery notice, separate creation,
  and the Android hand-off are therefore dead.
- Smallest fix: add a calendar choice to `EventEditor.tsx` (agent / a writable device calendar),
  route by `deviceRoute` in `screen.vibe` `saveEditor`, and surface `pendingShown` /
  `recoveryFailed` from `useDeviceWrites` with "Check" and "Create separately".

### 11. MISSING: reminders in Calendar

- Legacy: reminders appear as Calendar rows and the form can make one
  (`alpha-develop/apps/app/src/prototype/reminder-adapter.ts:224`); tests
  `test/browser/one-calendar.spec.ts` ("Calendar shows a saved reminder when there are no calendar
  events or Google connection"), `test/calendar-schedule.test.mjs` ("reminders without an interval
  use their day and hour"), `test/browser/calendar-form-controls.spec.ts` ("reminder drafts show
  supported fields and keep the event draft fields when switching back").
- Port: `src/web/calendar/layout.ts:11-30` builds rows from the agent feed and the device read only.
  `nextLead` (`spec/calendar/home.md:61`, "Home's next line shows whichever comes first, a phone
  reminder or the next event") has no caller. `reviewNote` ignores a reminder draft
  (`src/calendar/handoffs.vibe:88`), which may be Clock's to take.
- Smallest fix: owner decision first (Clock owns reminders now). If kept: a `CalendarReminders` port
  filled by Clock, merged in `layout.ts`, and `nextLead` called from `HomeAgendaCard.tsx`.

### 12. CHANGED: an unknown write outcome reads as a retryable failure, and refusals lost their wording

- Legacy: `test/calendar-agent-write-host.test.mjs` ("timeouts, generic HTTP failures and malformed
  rejection claims stay unknown", "only explicit nonacceptance from the mutation itself is
  retryable"), `test/calendar-managed-rejection.test.mjs`; owner wording in
  `agent-calendar-adapter.ts:44-57` ("Changed", "Can't move calendars", "Edit in Google", "Can't
  delete here") and `ui/calendar/calendar-api-messages.ts`.
- Port: the model has `ProviderUnknown` ("a create whose answer was lost is unknown, never resent",
  `spec/calendar/agent.md`), but `providerReply` (`src/calendar/agent.vibe:237-243`) never returns
  it: `sent` (`:245-248`) maps every 4xx except 408/429 to refused and everything else to
  transport. The form shows "Couldn't save" or "Refresh this event before saving" for every
  non-success (`screen.vibe:286,295`), including `WriteBusy`, `WriteOwnerChanged` and
  `WriteTransport`.
- Impact: a create whose answer was lost invites a second Save (safe only because the idempotency
  key is reused); an owner is told to refresh when the real reason is another account or a busy
  calendar.
- Smallest fix: map a lost or 5xx answer to `ProviderUnknown` in `agent.vibe`, and give
  `saveEditor` one sentence per `WriteOutcome`.

### 13. CHANGED: the phone's proposal card says less than the legacy card

- Legacy production spec `test/browser/calendar-proposal-review.production.spec.ts:23-31`: title,
  range with offset and IANA zone, "Calendar: the calendar kept on this phone. No account calendar
  is changed.", "Attendees: none. No invitations are sent.", location, description.
  `apps/app/src/browser/calendar-agent-review.ts:21-43` adds "existing attendees are kept", "All
  day", "This occurrence only".
- Port: `src/calendar/operations.vibe:125-127` (`detailOf`) and `:134-166` (`describeCalendarOperation`) shows title, range with a short zone
  name, location. No attendee, calendar, all-day or description line, and
  `agentAllDayUpdateAllowed` (`spec/calendar/editor.md:164`, "only whole UTC dates can update an
  all-day event") has no caller.
- Smallest fix: extend `describeCalendarOperation` in `operations.vibe`; call
  `agentAllDayUpdateAllowed` in `onPhone` before `requests.propose`.

### 14. UNIMPLEMENTED: modelled decisions with no caller

`confirmsDelete` / `deleteConfirmed` ("Delete only after I answered yes",
`spec/calendar/deviceActions.md`; only a test calls it), `undoQueuedDelete`, `eventChanged`
(`src/calendar/requests.vibe:49,43`), `shiftedOffset` ("A form's day follows the calendar date when
midnight passes"), `scopeNeeded`, `editorMutability`, `returnDay`, `sourceShown`, `phoneFreshness`,
`readStart`. Each is either dead or re-implemented in the shell (`agentRow.writable` in
`src/calendar/model.vibe:135`; `Math.max(0, begin)` in `model.vibe:59`). Fix: call the generated
function or delete the rule.

### 15. MISSING (developer surface): the browser-local development calendar

- Legacy: `apps/app/src/browser/calendar.ts` and siblings, live only with
  `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (`agent-calendar-adapter.ts:60`): series with occurrence edits,
  guests, all-day conversion, alerts, meeting preview, guest responses, damaged-storage
  recovery/reset, cross-tab conflicts. About 60 tests (`test/browser/dev-calendar-*.spec.ts`,
  `calendar-recovery.spec.ts`, `test/calendar-recurrence.test.mjs`, `test/calendar-deletions.test.mjs`,
  `test/browser-calendar-series.test.mjs`).
- Port: none; off the phone the device calendar is "android-only" (`src/calendar/device.vibe:110-114`).
- KNOWN in part: open-items, "Calendar features not ported" (guest response editing, meeting
  preview, alert catch-up) and the mock-mode owner decision. The store itself is not listed.

### 16. Vibestack usage

- Dangling retirement map: `alpha-vs/scripts/legacy-retirement.json` marks all 222 calendar entries
  "mapped", and 51 of them point at six spec files the #1422 merge deleted: `googleLink.md` (12),
  `sync.md` (17), `nativeSync.md` (8), `linkedLocal.md` (7), `preservation.md` (4), `disconnect.md`
  (3). 110 more point at `index.md`, which holds no rule.
- No conformance driver: `apps/app/test/drivers/` has none for `calendar__*` (notes 1, telephony 2,
  workflows 7). The 34 tests in `apps/app/test/calendar/` are story tests over fakes.
- No proof: legacy `specs/lemma/apps/app/src/prototype/calendar-days.dfy` proved
  `firstCalendarDayOf`, `calendarReturnDayOf`, `weekDayMarked`. The port has `firstColumnDay` and
  `returnDay` in `spec/calendar/presentation.md` and no `.proof.dfy` anywhere under `apps/app`.
- No `.meta.tsx`: `CalendarScreen.tsx`, `HomeAgendaCard.tsx`, `Surfaces.tsx` (UndoNotices,
  ApprovalReview, AgentRequestReview). Not in the open-items meta list.
- Shell logic the model should decide: `namedOutcome` infers the outcome from substrings of
  upstream's English summary (`src/calendar/requests.vibe:71-78`); `sent` classifies refusals
  (`agent.vibe:245-248`); `sourcesReply`/`upcomingReply` (`agent.vibe:155-170`).
- Every rule has a Quint block and each spec file has invariants or laws; no rule lacks one.

### UNMODELED

- The saved agent feed (`calendar/feed` slot, `agent.vibe:172-182,205-217`): the spec mentions it in
  one sentence of `agent.md` and in `home.md`, with no state for it.
- Note back-links for created and deleted events (`screen.vibe:33-52,227-237`): rules live in
  `spec/notes/origins.md`, none in Calendar.
- `openRoute` deep-open of an event (`screen.vibe:353-385`): legacy
  `test/browser/dev-calendar-navigation.spec.ts` ("a delayed event open cannot take over after
  navigation away"); no rule and no staleness check after the awaited read.

### KNOWN (open-items bullets)

`calendarAgendaSource` not sent (Assistant); "Not connected" opens account > google (Owner decisions,
Calendar); guest response editing, meeting preview, alert catch-up (same bullet); device event from a
note not back-linked, `linkedProviderEvents` unwired, `surfacesBack` unused (Areas, Calendar);
`WorkflowCalendar` has no consumer (Workflows); `read_calendar_range` still read in-process by
`WorkflowBridgeHost` (Android); `CalendarSyncBridge` and `AlphaCalendar.sync` kept (#1422 section);
`calendar__deviceSync` still named in "Generated names" though the file is gone (stale bullet).

### RETIRED (verified deleted on develop by 057fdc5a2, #1422)

`test/browser/calendar-{backup-restore,linked-storage,storage-migration,sync-settings}.spec.ts`,
`test/browser/native-calendar-sync-settings.spec.ts`, `test/calendar-{confirmation,delete-latch,
linked-provider,linked-store,mounted-preservation,sync-failure-copy,view-rules}.test.mjs`,
`test/google-calendar-selection.test.mjs`, `test/native-calendar-sync-port.test.mjs`,
`test/quint-calendar-{linked-local-port,preservation-confirmation}.test.mjs`,
`CalendarLinkedLocalPort.qnt`, `CalendarPreservationConfirmation.qnt`,
`refinement/services/calendar.mjs`. The port's removal of `linkedLocal`, `preservation`,
`deviceSync`, `nativeSync` matches. Its removal of `googleLink`, `disconnect` and `sync` does not
(gap 2).

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Agent feed publishes only for the bound owner, session and window | `runtime/agent-calendar.ts`, `AgentCalendarRefresh.qnt` | `agent.md` "A read publishes only when all three replies arrived…" | `src/calendar/agent.vibe:124-203` |
| Reads and writes never overlap; a read during a write is deferred | `AgentCalendarMutation.qnt` | `agent.md` "A read asked for during a write waits for it" | `agent.vibe:257-268,293-300` |
| Create needs an idempotency key and a matching readback | `test/calendar-agent-write-host.test.mjs` | `agent.md` "An applied create or change is read back…" | `agent.vibe:301-319` |
| Update and delete need the exact reviewed etag | same | `agent.md` "A write runs only between reads…" | `agent.vibe:320-346` |
| Applied delete is never "couldn't look up" (renderer path) | upstream `plugin-assistant/src/runtime/evaluator.ts:2847-2933` | `agent.md` "An applied deletion is never reported as an event Calendar could not look up" | `agent.vibe:341-345`; upstream receipt `eliza-vs/packages/calendar/src/mutations/provider-port.vibe:160-164` |
| Changed account retires feed, held deletions, drafts | `test/canonical-calendar-draft-ownership.test.mjs` | `agent.md` "Retiring the binding…", `drafts.md` "Changing owner closes the editor" | `src/calendar/binding.vibe:15-28` |
| Undo window, one waiting deletion, leave sends, retire drops | `prototype/calendar-deferred-delete.ts` | `deletions.md` | `src/calendar/deletions.vibe` (see gaps 7, 8) |
| Window holds while Undo is on screen | `test/calendar-deferred-delete.test.mjs:88` | `deletions.md` "The window ends only once its Undo notice is no longer shown" | `deletions.vibe:71-84`, `Surfaces.tsx:37` |
| Series and this-and-following hiding | same `:68` | `deletions.md` `hides` | `deletions.vibe:86-89` |
| Decline versus cancel, managed Google not deleted here | `test/calendar-event-detail.test.mjs` | `editor.md` `cancellationMode`, `managedDeleteOffered` | `src/web/calendar/EventDetail.tsx:46-58,104-106` |
| Join, repeat line, invitation notice, Google link, HTTPS only | #1403, `test/calendar-event-detail.test.mjs` | `presentation.md:163-185` | `EventDetail.tsx`, `screen.vibe:130-137` |
| Retained drafts: restore, discard, conflict, stale refusal, latch | `test/browser/calendar-form-draft.spec.ts`, `calendar-modal-draft.spec.ts`, `CalendarEditorDraft.qnt` | `drafts.md` (17 rules) | `src/calendar/drafts.vibe`, `EventEditor.tsx:83-112` |
| Draft recovery: production explains, development resets the snapshot | `test/quint-calendar-editor-draft.test.mjs` | `drafts.md` "Production only explains…" | `drafts.vibe`, `EventEditor.tsx:47-56` |
| Note and scan open a draft only when none is open | `test/calendar-mounted-draft-handoff.test.mjs`, `test/browser/scan-event.spec.ts` | `drafts.md` "A note or scan opens a draft only when…" | `src/calendar/handoffs.vibe:71-112` |
| Saved note event links back; open-note fails closed | `test/browser/note-calendar-handoff.spec.ts` | `spec/notes/origins.md` | `screen.vibe:33-52,227-237` |
| Start/end controls, 15-minute nudges, end after start | `test/calendar-form-inputs.test.mjs`, `calendar-end-after-start.test.mjs` | `editor.md:14-37` | `src/calendar/formTime.vibe`, `EventEditor.tsx:124-140` |
| New event defaults: next full hour today, ten on another day | `test/calendar-form-inputs.test.mjs` | `editor.md:39` `defaultStart` | `screen.vibe:183-191` |
| Missing or repeated wall time refused | `test/browser/dev-calendar-editor.spec.ts` | `editor.md:183` | `screen.vibe:243-246` |
| Unshowable span keeps its timing | `test/browser/canonical-calendar-form-review.spec.ts` | `editor.md:151` | `screen.vibe:248,313-318` |
| Save-off reasons in order | `agent-calendar-adapter.ts:296` | `editor.md:172` `saveBlock` | `EventEditor.tsx:74` |
| Device edit and delete: inspection first, hold on lost answer | `CalendarDeviceWrites.qnt`, `test/browser/calendar-delete-review.spec.ts` | `device.md` | `src/calendar/device.vibe:221-229,283-298` |
| Device read window and 2,000-row limit | `CalendarRangeInstrumentedTest`, `CalendarTruncationInstrumentedTest` | `device.md` | `model.vibe:53-60`, `device.vibe:127` |
| Assistant selection only for the open, inspected event | `CalendarAgentSelection.qnt` | `selection.md` | `device.vibe:263-275,314-327` |
| Shown day as lookup context only | `test/calendar-day-context.test.mjs` | `selection.md:123` | `src/calendar/observation.vibe`, `src/assistant/turn-sources.vibe:15` |
| Phone actions only through card plus native review; delete queued as unknown | `CalendarAgentWrites.qnt` | `deviceActions.md` | `src/calendar/operations.vibe:234-254`, `requests.vibe:103-119` |
| Calendar access refused is failed, not started | #1403 | `deviceActions.md` "…a refusal is failed and not started" | `requests.vibe:106-107`, `operations.vibe:212-216` |
| Named read and named change bound to the open event's title | `CalendarNamedRead.qnt` | `namedRead.md` | `operations.vibe:265-286,336-343` |
| Reviewed range read: complete, within limit, titles and times | `test/browser/dev-workflow-calendar.spec.ts` | `rangeRead.md` | `operations.vibe:288-326` |
| Availability review through upstream, 1 to 16 calendars | `CalendarAvailabilityReview.qnt`, `ui/calendar/availability-review.ts` | `availability.md`; `eliza-vs/spec/calendar/availability.md` | `requests.vibe:138-166`, `Surfaces.tsx` |
| Capabilities advertised only when offered | `runtime/phone-context.ts:163` | `deviceActions.md` `calendarAdvertised` | `operations.vibe:189-193` |
| Day, week, month, schedule, search, date picker, Back order | `test/calendar-schedule.test.mjs`, `CalendarPresentation.qnt` | `presentation.md` | `CalendarScreen.tsx`, `layout.ts`, `screen.vibe:77-92` |
| "Choose date" title button | #1403, `test/calendar-date-picker-label.test.mjs` | `presentation.md:88` | `CalendarScreen.tsx:125` |
| Re-read once a minute while in front | #1307 | `presentation.md:348` | `binding.vibe:74-91` |
| Not connected offers Settings, not a dead Connect | #1271 | `presentation.md:362` | `CalendarScreen.tsx:138-140` (target KNOWN) |
| Home ranking, verified "Nothing planned", unknown sources | `test/home-calendar-selection.test.mjs` | `home.md` | `src/calendar/home.vibe:34-87` (never fed, gap 5) |
| Back to event from Maps: same binding, epoch, exact version | `AgentCalendarEventReturn.qnt`, `MapsEventReturn.qnt` | `agent.md` "A returning event is found only…" | `agent.vibe:350-367`, `src/maps/handoff.vibe:123` |
| Approval review machine: re-read at tap, one decision, verified target | `test/calendar-approval-client.test.mjs` | `approvals.md` | `approvals.vibe`, `approvalFields.vibe` (unopenable, gap 1) |
| Time zone sent with a turn for time grounding | `runtime/phone-context.ts:34` | `eliza-vs/spec/calendar/readClock.md`, `reviewedReads.md:173` | `src/assistant/composer.vibe:341-344` |
| Android Calendar classes | `android/**/*Calendar*` | `spec/os/android/calendar.md` (upstream) | identical file set and contents in `alpha-vs/android` |

## Not covered

- Whether upstream's update/delete take the internal `event.id`: the port passes `event.id`
  (`agent.vibe:332,343`), legacy passed `event.externalId` (`runtime/agent-calendar.ts:239,244`).
  `eliza-vs/packages/calendar/src/plugin` routes were not read.
- The Undo notice for a queued deletion on a phone calendar (legacy `refreshDeletionViews`); it
  belongs to `spec/clock/deletions.md` and `src/web/clock/DeletionUndo.tsx`, not read.
- Whether a legacy retained Calendar draft is adopted at update (`prototype/canonical-calendar-drafts.ts`
  storage was not traced; `src/platform/legacy-slots.vibe` has no Calendar entry).
- `slotName` truncates a draft target to 200 characters (`src/calendar/drafts.vibe:43-45`); agent
  event keys can be longer, so two events of one calendar may share a slot. Not confirmed against
  `drafts.schema.vibe`.
- Upstream's chat-side "couldn't look up" evaluator and delete-confirmation planner in
  `eliza-vs/packages/assistant`: only the mutation receipt was checked.
- Time grounding when the screen is not observed: `composer.vibe:341-344` attaches `timeZone` only inside
  the observation.
- `spec/calendar/presentation.md` (29 rules) and `drafts.md` (17) were checked by heading, call site
  and UI wiring, not block by block; `approvalFields.vibe`, `feed.schema.vibe`, `device.schema.vibe`,
  `time.ts`, `formTime.vibe`, `Timeline.tsx`, `MonthGrid.tsx`, `DatePicker.tsx`, `ScheduleList.tsx`
  were not read line by line.
- Legacy tests not traced to a counterpart: `test/browser/calendar-accessibility.spec.ts` (7),
  `calendar-wide-days.spec.ts`, `home-calendar-density.spec.ts`, `calendar-month-focus.spec.ts`,
  `calendar-maps-handoff.spec.ts` (7, Maps side), `maps-event-return*.spec.ts` (7, Maps side),
  `test/scan-event.test.mjs` poster rules (21, `src/camera/scanText.ts`),
  `test/managed-calendar-broker-read-header.test.mjs` (11, cloud),
  `test/calendar-snapshot-digest.test.mjs`, `test/scoped-calendar-snapshot.test.mjs`,
  `test/workflow-calendar-run-anchor.test.mjs`, `test/local-agent-native-events.test.mjs`,
  `test/native-voice-event-worker.test.mjs`, `test/quint-recognizer-availability.test.mjs`,
  `test/quint-previous-notes-availability.test.mjs` (the last four are not Calendar despite the list).
- Android instrumented tests under `android/app/src/androidTest` (15 Calendar files) and the JVM
  fixtures `test/fixtures/Calendar*Test.java`: only the main sources were compared.
- Cloud-side Calendar routes (`cloud/**`) and `scripts/**`.
