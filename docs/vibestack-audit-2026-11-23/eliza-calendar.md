# eliza-calendar: develop -> vibestack parity audit

Slice: develop `plugins/plugin-calendar`, `plugin-native-calendar`, `plugin-meetings`, the Calendar parts of
`plugin-google-workspace`; vibestack `packages/calendar`, `spec/calendar`.
Trees: `eliza-develop` at 7a124190a1; `eliza-vs` (vibestack-dp) at 769b4f00d98b ("Settle workflow device steps
through the generated applied rule"); consumer `alpha-vs` 3d7ca9727, legacy `alpha-develop` dd63c6bc6.
Read-only. Nothing was built, generated or run; every claim below is from reading both sides.
Paths are relative to the tree named (`D:` = `/home/shaw/.cache/vibeaudit/eliza-develop`, `V:` =
`/home/shaw/.cache/vibeaudit/eliza-vs`, `A:` = `/home/shaw/.cache/vibeaudit/alpha-vs`, `AD:` = `alpha-develop`).

## Summary

| Class | Count |
| --- | --- |
| OK | 25 |
| NOT_APPLICABLE | 16 |
| MISSING | 11 |
| CHANGED | 7 |
| UNIMPLEMENTED | 4 |
| UNVERIFIED | 2 |
| UNMODELED | 1 |
| Gaps total | 25 (4 high, 12 medium, 9 low); 5 already named in wave3.md |

Verdict: **not at parity.** The vibestack calendar is a ground-up rewrite with a much smaller agent surface
(one 387-line action against develop's 9,214-line handler and 8,861-line service). What exists is well specified:
all 66 rules carry Quint, the resident calendar, ledger, availability, device proposals and HTTP routes are present,
and the native Android plugin is byte-identical. But four things the phone owner would notice are absent in the
audited tree:

1. The connected (Cloud-managed) Google Calendar never reaches the resident agent: nothing registers a provider
   with the calendar host and nothing reads `ELIZA_MANAGED_CALENDAR_READ_BROKER`, so the feed, the `CALENDAR`
   action, the context provider, check-ins and linked-sync destinations see only the agent's own calendar.
2. Built-in calendar events saved under develop (`app_calendar` tables) are not imported.
3. A chat delete of a built-in event runs at once on the planner's choice of event; develop required the owner to
   have named the event, selected it, or answered yes.
4. A calendar change that waits for review cannot be reviewed on the phone: the approval row's id and payload
   shape are not the ones Alpha's port reads.

Wave 3 (item C, plus B's `calendarMutationTimeIsUngrounded`) already names travel buffers, unspaced titles, the
Google respond port, `notifyAttendees`/`sendUpdates` and the ungrounded-time egress; those are marked below and
were not re-derived. `w3-calendar` (commit 9391cca0e71, not audited) appears to be adding the delete authority.

## Gaps

### High

**eliza-calendar-01 · UNIMPLEMENTED · high · not in wave3.md**
Behaviour: the owner's connected Google Calendar (Cloud-managed `alpha-google:` grants) is read into the agent
feed and written through reviewed approvals.
Develop: `D:plugins/plugin-calendar/src/service/CalendarService.ts:1416` (`createManagedCalendarRead` wired into
the service), `:3909-3942` (feed discovery of managed sources), `:6471` and `:8335`
(`createManagedCalendarMutationPort`); `D:plugins/plugin-calendar/src/service/managed-calendar-read.ts:61-63`;
`D:plugins/plugin-calendar/README.md` "Managed Google Calendar writes" (`ELIZA_MANAGED_CALENDAR_READ_BROKER`).
Vibestack: `V:packages/calendar/src/plugin/host.vibe:135` (the provider map starts with the resident only) and
`:141` (`register` has no production caller: grep over `V:packages` and `A:apps`, `A:scripts`, `A:android`);
`V:packages/calendar/src/feed/broker.vibe:68` (`configuredBroker`) and `V:packages/calendar/src/feed/managed.vibe:111`
(`managedFeed`) are called only from `V:packages/calendar/test/feed.test.vibe`; no `process.env`/`getSetting` read
exists in `V:packages/calendar/src`; `V:packages/calendar/src/plugin/routes.vibe:98-108` serves `/feed` from
`host.search`; `V:packages/calendar/src/plugin/linked-routes.vibe:71-80` verifies a link destination against a
`provider === "google"` row that can never be listed; `V:packages/calendar/src/index.vibe:59` passes no linked
worker, so `recoverDispatch`/`bootstrap` are no-ops (`linked-routes.vibe:114-115`). `spec/calendar/managedFeed.md`
and `aggregateMerge.md` rules therefore have code no production path reaches. Alpha still sets the broker
variables (`A:android/app/src/main/java/ai/alphacompute/alphaphone/runtime/NativeProviderSlot.java:370-372`) and
its app models `alpha-google:` sources (`A:apps/app/src/calendar/model.vibe:111-113`).
Impact: with Google connected, the phone's Calendar app, Home next-event card, "what's on my calendar", free-time
answers, check-ins and resident-to-Google linking show and use only the agent's own calendar. Invitations,
approvals for provider writes, monthly events and guests all depend on this provider.
Smallest fix: a `CalendarProviderPort` over `ManagedCalendarBroker` (sources, read via `managedFeed`, get,
create/update/remove through `broker.mutation`), registered by `CalendarService.start` when the host's settings
name the broker; a spec rule for when the managed provider is registered; feed route honouring `includeInFeed`.

**eliza-calendar-02 · MISSING · high · not in wave3.md**
Behaviour: events the owner already saved in the agent's built-in calendar survive the upgrade.
Develop: `D:plugins/plugin-calendar/src/service/schema.ts:30-32` (`app_calendar.calendarEvents`), `:247`
(`linkedCalendarEvents`), `:283` (`linkedCalendarControl`).
Vibestack: `V:spec/calendar/residentStore.md:15` and `V:packages/calendar/src/plugin/providers.vibe:99-131`,
`:157-177` import only an earlier vibestack key (`calendar.resident.<agent>.<account>`, format
`resident-events-1`). No reference to `app_calendar` anywhere in `V:packages`, `V:spec`, `A:apps`, `A:scripts`,
`A:android`.
Impact: on cutover the built-in calendar starts empty; develop-era events, link mappings and pending reviews are
gone from the phone. Unverified whether an out-of-tree migration is planned.
Smallest fix: one more `PriorState` in `residentStore.md` and an importer that reads the develop rows once (same
exact-or-needs-review rule), or a recorded owner decision that built-in events are not carried.

**eliza-calendar-03 · MISSING · high · not in wave3.md (w3-calendar 9391cca0e71 appears to add it; #39853 depends on it)**
Behaviour: a built-in event is deleted from chat at once only when the owner's words hold its whole title with
every calendar read, the event is the one open in Calendar, or the owner said yes to the action's own question;
otherwise the action asks, and a "no" spends the question (#39842, #39990, #39994).
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:7989-8088` (authority and question),
`:2622-2681` (`deleteConfirmationAnswer`), `:2735` (`ownerNamedCalendarEvent`), `:8008-8034` (declined).
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:189-203` (target is the planner's `eventId`, or the single
title-substring match) and `:300-314` (no owner-words check); `V:packages/calendar/src/plugin/host.vibe:221`,
`:242` (resident route is `ApplyNow`). The only "owner's own words" delete rule is for phone proposals
(`V:spec/calendar/reviewedReads.md:157`).
Impact: a planner-resolved or partial match deletes an agent-calendar event with no review and no question.
Smallest fix: port the rule into `spec/calendar/actions.md` (named, selected or confirmed, else ask) and gate
`delete_event` in `actions.vibe` on `ask.text`, the turn's selected object and a pending-question record.

**eliza-calendar-04 · CHANGED · high · not in wave3.md** (also a contract mismatch)
Behaviour: a calendar change waiting for review is listed with the fields the phone's review sheet reads.
Develop: `D:plugins/plugin-calendar/src/actions/mutation-approval.ts:387-404`, `:469-486`: flat payload with
`action`, `side`, `grantId`, `calendarId`, `eventId`, `expectedProvider`, `expectedEventStartAtMs`,
`notifyAttendees`, `cancellationMode`.
Vibestack: `V:packages/calendar/src/plugin/host.vibe:27-35` and `:246-249` file
`payload: { change: CalendarMutationPayload, digest }`, and `:241` uses the id `calendar-<40 hex>`;
`V:packages/agent/src/approvals/routes.vibe:39-43` passes both through unchanged.
Alpha port: `A:apps/app/src/calendar/approvals.vibe:30` and `:123` (id must be a UUID), `:84-85`
(`row.payload.action === row.action && row.payload.side === "owner" && typeof row.payload.calendarId === "string"`),
`:96`; `A:apps/app/src/calendar/approvalFields.vibe:41-53`; `A:apps/app/src/calendar/feed.schema.vibe:106-107`.
Impact: a review-first create (`reviewBeforeSaving`) or any provider change queues, the chat says "I've asked for
your approval", and the phone can never open or resolve it; it expires after 24 hours.
Smallest fix: agree one shape. Either Alpha reads `payload.change` and accepts the `calendar-` id, or the host
files a UUID and a flat projection beside `change`.

### Medium

**eliza-calendar-05 · UNIMPLEMENTED · medium · not in wave3.md**
Behaviour: a request's zone is the stated zone, else the client's, else the owner's; a planner-proposed zone is
never part of the choice.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:1761-1776`, `:2161-2171` (owner's configured
zone outranks everything; comment records the live UTC failure of host-zone creates).
Vibestack: rule `V:spec/calendar/readClock.md:15`; `requestTimeZone`/`createTimeZone`
(`V:packages/calendar/src/clock.vibe:126`, `:131`) have no caller outside tests; the action uses the planner's
`timeZone` else the agent process zone (`V:packages/calendar/src/plugin/actions.vibe:64-70`, `:264`), as do the
routes (`routes.vibe:83-89`) and `CALENDAR_CONTEXT` (`actions.vibe:380`).
Impact: if the resident process zone is not the phone's (UTC is common in embedded runtimes, and after travel),
reply times, "tomorrow morning", past-start checks and saved event zones are wrong. Process zone on Android not
verified.
Smallest fix: read the turn's client zone and the owner's zone and call `requestTimeZone` in `handle`.

**eliza-calendar-06 · MISSING · medium · wave3.md B**
Behaviour: a reply that states a calendar change at a time the change did not carry is caught at egress
(`calendarMutationTimeIsUngrounded`).
Develop: `D:plugins/plugin-assistant/src/services/message/time-observations.ts:66`, `egress-policy.ts:764`.
Vibestack: only `statedTimeIsUngrounded` for the clock (`V:spec/agent/conversation/planning.md:360`). Listed.

**eliza-calendar-07 · CHANGED · medium · not in wave3.md**
Behaviour: event times and read windows come from the owner's words; the planner writes wall-clock time plus a
zone and code applies the offset.
Develop: `D:plugins/plugin-calendar/src/calendar-action-schema.ts:121-126`, `:144-150`;
`D:plugins/plugin-calendar/src/actions/calendar-handler.ts:3750-3790` (one stated local day outranks the
planner's date), `:3265` (`applyStatedDateToCreateRequest`), `:4648` (create fields re-extracted from the
request), `:2961` (`verifyAppliedCalendarMutation`).
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:23-24` (every instant must carry an offset the planner
computed), `:205-216`, `:281-298` (fields taken as sent); the only correction is the year
(`V:packages/calendar/src/clock.vibe:207`).
Impact: a planner that fabricates a UTC instant or the wrong day creates or moves the event there; the DST and
"Z-suffix" failures develop recorded come back. Device proposals are unaffected (they re-derive day and time).
Smallest fix: reuse `parseExplicitLocalDate`/`parseStatedClockTimes` (already used by `device-proposals.vibe`) to
check `create_event`/`update_event` instants against `ask.text`, and accept offset-less wall time with the zone.

**eliza-calendar-08 · MISSING · medium · not in wave3.md**
Behaviour: a create or move that overlaps an existing commitment is refused with the conflict, and the reply says
when another calendar could not be checked.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:6929-6974`, `:7630`, `:337-343`.
Vibestack: no overlap read in `V:packages/calendar/src/plugin/actions.vibe:280-314`.
Impact: the agent double-books silently.
Smallest fix: before `host.change`, run the existing `blockingSpans`/`intervalFree` over the new span and return
the conflicts unless the owner confirmed.

**eliza-calendar-09 · CHANGED · medium · not in wave3.md**
Behaviour: finding the event to change by name.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:3489-3498` (one year back, five forward),
`:5064-5100` (title, description, location and attendee scoring), `:351-372` (no match while a source is unread is
refused, not "not found"), #39990 target-day vs destination-day reading.
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:195` (yesterday to 60 days ahead), `:199` (any count but
one is "Which one?" or "couldn't find"), `V:packages/calendar/src/plugin/host.vibe:180` (whole query must be a
substring of the title).
Impact: an event more than 60 days out or before yesterday cannot be changed by name; every occurrence of a
resident series matches its own title, so a named series event is always ambiguous; "not found" is claimed on an
incomplete read.
Smallest fix: widen the default lookup window, collapse occurrences of one series, and refuse rather than deny
when `searched.complete` is false.

**eliza-calendar-10 · CHANGED · medium · not in wave3.md**
Behaviour: a change to a repeating event asks "this one, this and following, or all" unless the owner's words say.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:598-625`, `:668-677`, `:7930-7957`.
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:309-310` defaults to `instance`;
`V:spec/calendar/seriesScope.md:199` has no asking rule. (#39885's month-end label has nothing to attach to.)
Impact: "delete my weekly standup" removes one occurrence and reports "Deleted".
Smallest fix: when the target has `recurringEventId`/`recurrence` and no scope was sent, return a
`requiresInput` result naming the three scopes.

**eliza-calendar-11 · MISSING · medium · not in wave3.md**
Behaviour: guests on a new event, adding a guest the owner wrote an address for, removing a guest by name.
Develop: `D:plugins/plugin-calendar/src/calendar-action-schema.ts:240-259`;
`D:plugins/plugin-calendar/src/actions/calendar-handler.ts:5464`, `:2512`.
Vibestack: no `attendees` parameter (`V:packages/calendar/src/plugin/actions.vibe:26-47`) and no attendee field in
`CalendarEventFields` (`V:packages/calendar/src/model.vibe`); routes likewise (`routes.vibe:35-45`).
Impact: "add sam@example.com to the meeting" cannot be done from chat or the editor route.
Smallest fix: attendees in `FieldsRecord` and the digest, with the owner-wrote-the-address rule.

**eliza-calendar-12 · MISSING · medium · wave3.md C**
Behaviour: `notifyAttendees` reaches the provider as `sendUpdates`; the built-in calendar says nobody was emailed.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:1284-1310`, `:7978`;
`D:plugins/plugin-google-workspace/src/calendar.ts:491`, `:603`, `:632`, `:679`.
Vibestack: accepted and dropped at `V:packages/calendar/src/plugin/routes.vibe:185`;
`V:packages/cloud/src/services/google/calendar.vibe:462-468` always sends `sendUpdates=none`. Listed.

**eliza-calendar-13 · UNIMPLEMENTED · medium · wave3.md C**
Behaviour: accept, tentative or decline an invitation (#39947).
Develop: `D:plugins/plugin-calendar/src/routes/calendar-routes.ts:500-555`;
`D:plugins/plugin-google-workspace/src/calendar.ts:679-685`.
Vibestack: rule `V:spec/calendar/actions.md` "Only an invitee answers an invitation...", route
`V:packages/calendar/src/plugin/routes.vibe:173-184`, ledger path `provider-port.vibe:140-149`, but `respond` is
optional (`providers.vibe:42`) and no provider implements it, so every answer ends `answers_unsupported`
(`host.vibe:230-232`). The prior ledger note "skipped" is stale: the write path exists, the provider does not.
Listed (Google respond provider port).

**eliza-calendar-14 · MISSING · medium · wave3.md C (#39828)**
Behaviour: travel buffers before an event, and a buffer that moves with its rescheduled event.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:4289`, `:6975-6984`;
`D:plugins/plugin-calendar/src/service/CalendarService.ts:3831-3858`, `:7314`.
Vibestack: no travel buffer of any kind in `V:packages/calendar` or `V:spec/calendar` (the base feature is absent,
not only the #39828 refinement). Listed.

**eliza-calendar-15 · CHANGED · medium · not in wave3.md**
Behaviour: "what's on my calendar" while a day is shown in Calendar reads that day; whole-day reads take
`date`/`endDate`/`windowDays` and code computes the midnights.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:3616-3625`, `:3742-3749`;
`D:plugins/plugin-calendar/src/calendar-action-schema.ts:347-359`.
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:270` (default is now to seven days ahead; no day
parameters; the observation is not read). The displayed-day read exists only for the phone's own calendar source
(`V:packages/agent/src/device-actions/agenda.vibe:26-36`).
Impact: on a day view of the agent calendar the answer covers the coming week unless the planner builds the day's
instants itself.
Smallest fix: a `date`/`endDate` pair on `search_events` resolved with `startOfCivilDay`, defaulting to
`observation.calendarDay`.

**eliza-calendar-16 · UNVERIFIED · medium · not in wave3.md**
Behaviour: calendar answers are bound to a verified read with filter evidence from the owner's words (#39957).
Develop: `D:plugins/plugin-calendar/src/read-binding.ts:1`, `search-filter-evidence.ts:1`,
`calendar-read-result.ts:11-20`.
Vibestack: nothing in `V:packages/calendar`; whether the agent's egress covers it is the agent slice. Not traced.

### Low

**eliza-calendar-17 · MISSING · low · wave3.md C (#39853)**
A whole title written without spaces (Chinese, Japanese, Korean delete phrasing) reads as the event named.
Develop: `D:plugins/plugin-calendar/src/actions/calendar-handler.ts:2735-2770`. Vibestack: no counterpart; it
needs eliza-calendar-03 first. Listed.

**eliza-calendar-18 · CHANGED · low · not in wave3.md**
A create with a start and no end lasts one hour; `durationMinutes` is accepted for creates.
Develop: `D:plugins/plugin-calendar/src/internal/calendar-normalize.ts:360`, `:408`. Vibestack:
`V:packages/calendar/src/plugin/actions.vibe:281-286` refuses ("A new event needs a title and a start before its
end"); `durationMinutes` is for `propose_times` only. Fix: default the end, or say so in the parameter text.

**eliza-calendar-19 · CHANGED · low · not in wave3.md**
Repeating creates carry any RFC 5545 rule to the provider (`D:packages/contracts/src/calendar.ts:795-800`);
vibestack offers daily, weekdays or weekly only (`V:packages/calendar/src/plugin/actions.vibe:44`, `:353`). The
built-in calendar now holds series, which develop's did not (an improvement). Monthly and yearly events cannot be
created anywhere.

**eliza-calendar-20 · MISSING · low · not in wave3.md**
Every calendar event gets a "30m before event" in-app reminder plan.
Develop: `D:plugins/plugin-calendar/src/internal/constants.ts:14-20`;
`D:plugins/plugin-calendar/src/service/CalendarService.ts:4440-4472`. Vibestack: none in `packages/calendar` or
`spec/assistant`. Whether the phone delivered these on develop was not verified.

**eliza-calendar-21 · MISSING · low · not in wave3.md**
Calendar reads the bound original owner request, not the delivered message text (#39994).
Develop: `D:plugins/plugin-calendar/src/internal/detail.ts:38` (`incomingMessagePersistenceSnapshot`, PR #39994).
Vibestack: `V:packages/calendar/src/plugin/actions.vibe:184-187` uses `message.content.text` for the
tomorrow-morning and stated-year checks; Notes already has `ownerRequestText`
(`V:packages/notes/src/lookup.vibe:78`). Fix: use the same helper.

**eliza-calendar-22 · MISSING · low · not in wave3.md**
Smaller agent surfaces: `trip_window` (`D:plugins/plugin-calendar/src/actions/calendar-handler.ts:464-470`),
`CONFLICT_DETECT` (`actions/conflict-detect.ts:896`), rejecting a pending review from chat (`CALENDAR_REVIEW`,
`actions/calendar-review.ts:13-20`). Vibestack subactions: `V:packages/calendar/src/plugin/actions.vibe:20`;
`V:spec/agent/approvals.md:30` makes the route the only way out of a review (deliberate).

**eliza-calendar-23 · UNIMPLEMENTED · low · not in wave3.md**
`V:spec/calendar/mutationLedger.md:123` "Reconciliation settles an ambiguous attempt from evidence or the owner's
word": `host.ledger.reconcile`/`inspect` (`V:packages/calendar/src/plugin/host.vibe:270-273`) have no route or
action caller, so a change left "didn't confirm, check it before I try again" stays blocked. Likewise the managed
purge (`managedFeed.md:54`) has no route.

**eliza-calendar-24 · UNMODELED · low · not in wave3.md**
Code without a rule: the delete receipt's time is the delete time (#39982,
`V:packages/calendar/src/mutations/provider-port.vibe:163`); the whole route layer's statuses and reply shapes
(`V:packages/calendar/src/plugin/routes.vibe:52-75`, `:119-198`); the `CALENDAR_CONTEXT` 24-hour provider
(`actions.vibe:369-387`); the 24-hour approval lifetime (`host.vibe:105`).

**eliza-calendar-25 · UNVERIFIED · low · not in wave3.md**
Vibestack usage. All 66 rules in `V:spec/calendar` have a Quint block. `V:spec/lock.json` holds only the scaffold
`spec/app/*` entries: no calendar rule is accepted and no proof is recorded, simulated or otherwise. Proof files
exist for 2 of 13 spec files (`availability.proof.dfy`, `syncSettlement.proof.dfy`). Generated conformance drivers
exist for 3 areas (`V:packages/calendar/test/drivers/calendar__{seriesScope,syncSettlement,linkedSync}.ts`);
actions, the mutation ledger, reviewed reads, the managed feed, reconcile, read clock and the resident store are
covered by hand-written tests only. `gen/` is not checked in, so nothing here was run.

## Contract mismatches with Alpha's port

1. Approval id: `V:packages/calendar/src/plugin/host.vibe:241` files `calendar-<40 hex>`; Alpha opens and decodes
   only UUIDs (`A:apps/app/src/calendar/approvals.vibe:30`, `:123`; `feed.schema.vibe:107`).
2. Approval payload: upstream `{ change, digest }` (`host.vibe:32`, `:248`); Alpha reads develop's flat
   `payload.action`, `.side`, `.calendarId`, `.grantId`, `.eventId`, `.expectedEventStartAtMs`,
   `.expectedProviderVersion`, `.expectedProvider` (`A:apps/app/src/calendar/approvals.vibe:84-85`, `:96`;
   `approvalFields.vibe:41-53`).
3. Adjacent, `packages/agent` (outside this slice, read but not traced further): `/api/approvals` answers
   `ownerEntityId` once at the top (`V:packages/agent/src/approvals/routes.vibe:39-43`, `:67`), while Alpha checks
   `row.ownerEntityId ?? row.ownerId` per row (`A:apps/app/src/calendar/approvals.vibe:107-108`), so no row is
   "owned".
4. Alpha's Android host sets `ELIZA_MANAGED_CALENDAR_READ_BROKER` and `ELIZA_MANAGED_CALENDAR_DELETE_ENABLED`
   (`A:android/.../runtime/NativeProviderSlot.java:370-372`); nothing in `eliza-vs` reads either. Neither tree
   serves the broker path (`/__alpha-owner-gmail` appears only in `V:packages/calendar/src/feed/broker.vibe:62`).
5. Alpha's model expects `google` sources with `alpha-google:` grants in `/calendars` and `/feed`
   (`A:apps/app/src/calendar/model.vibe:111-113`, `:135`); upstream emits only the resident source
   (`V:packages/calendar/src/plugin/providers.vibe:243-245`).
6. `DELETE /events/{id}` requires `cancellationMode` to be present but never reads its value, and accepts and
   ignores `notifyAttendees`, `grantId`, `side` (`V:packages/calendar/src/plugin/routes.vibe:185-197`). `/feed`
   accepts and ignores `mode`, `side`, `grantId`, `includeHiddenCalendars`, `timeZone`, `forceSync` (`:120`).
   Alpha sends `side` and `timeZone` (`A:apps/app/src/calendar/agent.vibe:127`); harmless today.

No mismatch found for imports: every name Alpha takes from `@elizaos/plugin-calendar`, `/client`,
`/availability` and `/series` exists (`sourceKeyId`, `utcInstant`, `CalendarEvent`, `CalendarSummary`,
`createCalendarApi`, `CalendarApi`, `CalendarFetch`, `CalendarChangeReply`, `CalendarCreateRequest`,
`CalendarUpdateRequest`, `CalendarDeleteRequest`, `namedReadWindow`, `executeNamedCalendarRead`,
`executeCalendarAvailability`, `CALENDAR_CAPABILITY`, `CALENDAR_NAMED_READ_CAPABILITY`, `NamedReadUnavailable`,
`NamedCalendarReadContext`, `NamedReadOutcome`, `AvailabilityOutcome`, `AvailabilitySource`,
`CalendarAvailabilityOperation`, `CalendarAvailabilityResult`, `ReadAnswer`, `SourcesAnswer`,
`AvailabilityUnavailable`; `deleteScope` and `readClearsHold` are Quint definitions at
`V:spec/calendar/seriesScope.md:60`, `:100`, exported from generated code that is not checked in). The
change-reply shapes Alpha branches on (`approvalRequestId`, `receipt.source`) match `routes.vibe:60-75`. Alpha does
not import `/linked-sync`, `/feed` or `/request-time`.

## Confirmed OK

| # | Behaviour | Spec | Code |
| --- | --- | --- | --- |
| 1 | Reads show only the active account's listed calendars | actions.md "An event is shown only from a listed calendar..." | plugin/host.vibe:165-189 |
| 2 | Next event (action and `/next-context`) | actions.md read story | plugin/actions.vibe:268-276; routes.vibe:127-144 |
| 3 | Free time and openings, tomorrow-morning clamp (#39856, #39865, #39881) | actions.md free-time rules | plugin/actions.vibe:218-259; free-time.vibe:8-21 |
| 4 | Built-in create applies at once and is reported only after same-calendar readback | actions.md "A create is reported only after..." | mutations/provider-port.vibe:130-137 |
| 5 | Review a new event before saving (#39873) | actions.md "A write goes to the active account's writable calendar..." | plugin/actions.vibe:297; host.vibe:221 |
| 6 | Stated year wins, year before a slash date, past start asks (#39632, #39800) | readClock.md:79 | clock.vibe:183-226; request-time.vibe:107-109; actions.vibe:287-294 |
| 7 | An approved change runs only with its reviewed digest and account | actions.md "An approved change runs only..." | mutations/provider-port.vibe:76-85 |
| 8 | Reviewed change runs at most once; restart quarantines | mutationLedger.md | mutations/ledger.vibe:150 and whole file |
| 9 | Event, this-and-following and series writes on the built-in calendar | seriesScope.md:199, :122 | plugin/providers.vibe:268-281; series/document.vibe |
| 10 | Role check: invitee delete is a decline, invitee edit refused | actions.md "Only an invitee answers..." | plugin/host.vibe:227-238; provider-port.vibe:118-124 |
| 11 | Result names the target as read and the version produced | actions.md last rule | mutations/provider-port.vibe:150-164; actions.vibe:96-109 |
| 12 | Routes Alpha calls: feed, calendars, next-context, events POST/PATCH/DELETE, response | (routes unmodelled, see -24) | plugin/routes.vibe:119-198; client/calendar-api.vibe |
| 13 | Linked sync control, links, disconnect, rebind routes | linkedSync.md | plugin/linked-routes.vibe:147-216 (blocked in practice by -01) |
| 14 | Phone calendar vs agent calendar: a local create is proposed only on the owner's "phone calendar" words when CALENDAR is offered | reviewedReads.md:100 | plugin/device-proposals.vibe:111-117 |
| 15 | Phone delete proposed only on the owner's words; a no keeps the event | reviewedReads.md:157 | plugin/device-proposals.vibe:304, :321, :326 |
| 16 | New phone event at the stated day and time in the phone's zone | reviewedReads.md:173 | plugin/device-proposals.vibe:208-226 |
| 17 | Change after a shared read keeps length unless stated | reviewedReads.md:206 | plugin/device-proposals.vibe:348-361 |
| 18 | Phone availability window from the owner's words | availability.md:204 | plugin/device-proposals.vibe:230-252 |
| 19 | Named read and reviewed availability clients | reviewedReads.md:13, :75; availability.md:17 | client/named-read.vibe; client/availability-review.vibe |
| 20 | Native Android calendar plugin | (os slice) | packages/os/android/calendar/src identical to develop (`diff -rq` clean) |
| 21 | Calendar offered from any open view (#39936, #39951) | spec/agent/conversation/planning.md:32 | packages/agent/src/conversation/planning.vibe:76 |
| 22 | Displayed-day agenda for the phone's own calendar | spec/agent/deviceActions | packages/agent/src/device-actions/agenda.vibe |
| 23 | Earlier vibestack resident events imported once, exactly | residentStore.md:15 | plugin/providers.vibe:109-131, :161-177 |
| 24 | Check-ins read events with the provider's edit time | managedFeed.md:221 | plugin/service.vibe:42-54, :77-83 |
| 25 | Late sync attempts never replace a newer decision (#39501) | syncSettlement.md (+ proof, driver) | linked-sync/settlement.vibe |

NOT_APPLICABLE (16): #39884 Outlook "working elsewhere" (no Microsoft provider, none on the phone); #39885
month-end label (no recurrence description; see -10); #39871 and #40017 extraction retries (no second model
call); #39593 webhook URL; #40037 schema description trimming (different schema); #39715, #39732, #39737
(infrastructure); `plugin-meetings` and meeting auto-join routes (desktop browser capture; Alpha staged types
only); Microsoft, Apple and ICS sources with `CALENDAR_SOURCES`; Google push watch; React views and hooks (Alpha
owns its renderer); `calendarEventUndo` (never read by Alpha's app); `plugin-google-workspace` local client (the
phone used the Cloud-managed path); `POST /seed`; the iOS native plugin.

## Not covered

- `packages/cloud` managed Google calendar and `calendar/sync-v1` routes (cloud slice); only the hard-coded
  `sendUpdates=none` was read.
- `packages/agent` approvals queue, device-proposal core and egress policy beyond the lines cited.
- Line-by-line comparison of linked sync (`linked-sync/*.vibe`, about 2,400 lines) against develop's
  `linked-sync/*.ts`, `linked-calendar-control.ts` and `linked-calendar-sync.ts`; export names were compared, and
  three develop types are not exported (`CalendarSyncForeground`, `CalendarSyncHost`,
  `GoogleCalendarReaderOptions`).
- Line-by-line comparison of the feed merge (`feed/merge.vibe`) and the mutation ledger against develop.
- Develop's ICS parser, recurrence expansion (`internal/recurrence.ts`, 1,354 lines) against
  `availability/recurrence.vibe`.
- Owner-facing sentences: only named-read and availability-review strings were diffed.
- The Android process time zone, and whether develop's 30-minute event reminders reached the phone.
- Nothing was generated, built or run: no test, Quint check, proof or conformance case was executed.
- The `w3-calendar` branch contents.
