# Agent acknowledgements, reply chain, context and caching: review

2026-11-21. Reviewed at product `develop` f8f00732721 with the eliza pin 032222c7fe.
Sections 1 to 10 are the review as written before any change; section 0 records what landed
afterwards.

## 0. Outcome (2026-11-22)

Landed upstream on elizaOS develop:

- **Acknowledgement cues**, elizaOS/eliza#40028 (merge `347d77ee55`). The rule is short and
  example-led: "On it." / "One sec." for actions, "Let me check your calendar." for look-ups,
  and "Let me open Maps." only for the apps the grammar accepts (now including Contacts,
  Messages, Phone and Clock). "Working on it." is gone from the schema example, and the routing
  classifiers read every cue the grammar would speak as an ack. Answers that open with cue words
  ("Just a second, your dentist is Thursday.") stay answers.
- **Agent context follow-ups**, elizaOS/eliza#40037 (merge `cfd908406e`):
  - Recorded outcomes without UUIDs and ISO times, with a fixed legend.
  - Minute-precision stamps.
  - Bounded re-sends.
  - A constant evaluator schema.
  - Guessed tools kept behind tool search on device turns.
  - The Cloud carries provider 400 fields.

  Landing it took three fixes:
  - A revert of the photo-plus-text commit, whose review found a false-claim path. A
    replacement is landing separately.
  - Restoring develop's guarantee that a navigation-only turn never classifies as applied:
    it is now enforced after decoding, so the evaluator schema stays constant.
  - A test update for develop's compound-photo card rule.
- **Calendar delete read fix**, elizaOS/eliza#40038 (merge `89baf73d94`).

Measured:

- **Acknowledgement replay** (46 recorded Stage 1 requests): acknowledgements accepted by the
  grammar rose from 7% to 60–72% across five wordings.
- **Whole-turn streaming eval** (43 cases, desktop resident, `qwen-3.8-27b`):

  | Arm | Pass | Acknowledgement delivered |
  |---|---|---|
  | Control at pin `032222c7fe` (3 arms) | 108/129 (84%) | 8/129 |
  | Acknowledgement change (2 arms) | 76/86 (88%) | 57/86 |

  Cues delivered: "On it." 42, "One sec." 8, "Let me check your calendar." 3. On the quieter
  arm the acknowledgement arrived at a median 1.6 s and the reply at 4.2 s.
- **Context cost**: the follow-ups measured 894K → 528K charged tokens over the 46-turn run and
  46% → 55% cache reuse. At the old pin a turn used about 34K input tokens, 39–47% cached,
  mostly per-outcome receipt blocks with UUIDs, which the follow-ups slim.

Still open (owned elsewhere or follow-ups):

- The Alpha repin that carries all three upstream merges.
- The Pixel build and typed device checks.
- Planner tool order, owned by the context session.
- A small Stage 1 schema trim (about 1,040 characters per turn), being tested.
- Acknowledging slow planner-less reads (section 9, item 5).

`scripts/eval-phone-actions.ts --stream` reproduces the acknowledgement numbers: each row
records the acknowledgement status, activity label, first token and done frame, and the summary
counts acknowledged turns.

## 1. Summary

The acknowledgement feature already exists end to end. The first model step
(Stage 1) writes a short acknowledgement next to its routing decision, the runtime
sends it as a transient status, the chat shows it as a shimmering status line, and
voice speaks it once. It rarely reaches the user for two reasons:

1. **The runtime throws almost all of them away.** An acknowledgement is only
   delivered if it matches a closed "claim-safe" grammar. The model's wording
   almost never does. On the phone, 22 of 197 action turns got one (11%). In a
   46-turn run on current code, 1 of 42.
2. **It cannot be early on the phone today.** It is sent about 60 ms after Stage 1
   finishes, and Stage 1 finished a median 5.0 s after send on the phone
   (17 to 20 Nov builds). The action itself was about 1% of the median wait; the
   two model calls were about 75%.

A shorter, example-led instruction raised delivery from 7% to 61–72% in a replay
of the same 46 requests, halved the length of the acknowledgement, and left
routing unchanged within run-to-run noise.

Recommended order of work: (1) rewrite the acknowledgement instruction, (2) re-measure
time to acknowledgement on a current device build, (3) fix the status label so it
names the app, (4) acknowledge slow planner-less reads, (5) the cache items in
section 8. Details and evidence follow.

## 2. How a turn runs

```
send ─► pre-model (embedding, state)         phone p50 0.75 s
     ─► Stage 1 model call (HANDLE_RESPONSE)  4.1 s   ← routing + replyText
          │  direct answer: replyText streams as the reply, turn ends
          │  planned work:  replyText is the acknowledgement  ──► status "thinking"+label
     ─► on-device work between calls          1.2 s   (state, discovery, preprocess)
     ─► planner model call (ACTION_PLANNER)   4.7 s   ← picks the tool
     ─► tool runs                             0.13 s  (p90 6.6 s) ──► status "running_tool"+label
     ─► evaluator / reply phrasing            1.2 s   (p90 3.2 s)
     ─► reply, then cards and navigation
```

Phone figures are medians over 118 single-planner, single-tool turns from the
on-device timing log (304 turns in all, 17 to 20 Nov). Median action turn 15.0 s,
median direct answer 5.2 s.

On a desktop rig with the current code and the model called directly (46 turns,
21 Nov): Stage 1 ends at 0.5 s, action turns finish at 2.0 s (p90 5.5 s), and 35 of
42 action turns still had more than a second to go after Stage 1.

What the user gets while waiting:

| Moment | Typed chat | Voice |
|---|---|---|
| Send | typing dots at once | nothing |
| Stage 1 done, direct answer | reply streams | reply spoken |
| Stage 1 done, planned work | status line with the acknowledgement, if it survives | acknowledgement spoken once, if it survives |
| Tool starts | status line "Using X" or "Working" | nothing |
| Tool running | nothing more; no handler sends progress text | nothing |
| Reply | reply replaces the status line; cards and navigation follow | reply spoken |

Code: delivery `plugins/plugin-assistant/src/services/message/pipeline.ts:1016-1094`,
grammar `side-effect-claims.ts:915-1114`, model instruction
`plugins/plugin-assistant/src/prompts/acknowledgment.ts`, once-per-turn guard
`turn-lifetime.ts:477-506`, activity label `turn-lifetime.ts:78-98,565-607`,
status frames `packages/agent/src/api/chat-routes.ts:2914-2939`, product status line
`apps/app/src/prototype/agent-adapter.ts:2259-2271`, product voice cue
`apps/app/src/runtime/local-agent-stream.ts:65-121`.

## 3. Why acknowledgements are lost

**The grammar and the instruction do not meet.** The grammar accepts a bare wait cue
("On it.", "One sec.", "One moment.", "Just a sec/second/moment."), a look-up
("Let me check.", "Let me check your calendar.", "Checking tomorrow's calendar."),
"Let me open" plus one of ten apps, and "Let me save/create/update" plus a generic
item. Everything else is dropped, on purpose: text spoken before any tool runs must
not sound like a result or a completed effect.

The instruction given to the model (about 1,150 characters in the `replyText`
schema) describes the look-up and open forms abstractly, gives no example, and never
mentions the bare wait cue. Most phone requests are effects (call, text, alarm,
reminder, note, directions, photo), for which the instruction offers no form at all.
The model then writes the natural thing, which is a promise naming the effect:

| Request | Model wrote | Result |
|---|---|---|
| Call Sam. | "Let me call (contact)." | dropped |
| Set an alarm for 7am. | "Setting the alarm for 7am." | dropped |
| Directions to the Ferry Building | "Let me pull up directions to the Ferry Building." | dropped |
| Create a note called Groceries | "Creating that note for you." | dropped |
| Remind me to call mom at 5pm. | "I'll set that reminder." | dropped |
| What's on my calendar tomorrow? | "Checking tomorrow's calendar." | delivered |

Other points:

- "Sure", "Yeah, one sec", "Okay", "Got it", "Will do" are rejected. The grammar
  treats assent as an answer to a possible yes/no question. Only "Sure!" followed by
  a full lead sentence passes.
- The base schema's own example, "Working on it.", is rejected
  (`packages/core/src/actions/to-tool.ts`, `replyText` description).
- "Let me open Contacts/Messages/Clock/the dialer" is rejected: the app list has
  calendar, notes, inbox, maps, files, photos, settings, workflows, camera, browser.
- The 19 acknowledgements stored on the phone were all natural and short:
  "Let me save that note." ×5, "Let me open Browser for you." ×3,
  "Let me pull up your contacts." ×2, "Let me open Maps.", "Let me check your
  calendar.", and so on.

**Some turns never acknowledge by design.**

- A turn Stage 1 routes straight to a tool with no planner call
  (`pipeline.ts:1088`): a single calendar read, one named note, a direct view
  request, a reminder choice. That is right when the tool is instant and wrong for
  calendar reads, which took 3.9 to 6.8 s on the phone.
- Navigation-only turns: `replyText` is the confirmation ("Opening Messages."),
  held until the view opens. It is not an acknowledgement.
- Direct answers, ignored turns, clarifying questions. Correct.

## 4. Experiment: a shorter instruction

Replayed the first Stage 1 request of each of the 46 recorded turns against the same
model, same options, changing only the acknowledgement part of the `replyText`
description. Two runs per variant, 92 calls each. Scored with the unmodified grammar.

| Instruction | Acknowledgements delivered | Mean length | Routing vs recording (respond / contexts / effect status) |
|---|---|---|---|
| Today's rule | 5 of 76 (7%) | 31 chars | 89/91, 55/91, 82/91 |
| V1: examples for look-up, open, and "On it." / "One sec." for everything else | 50 of 82 (61%) | 18 | 90/92, 58/92, 88/92 |
| V2: only "On it." / "One sec." / "Let me check." | 58 of 81 (72%) | 16 | 90/92, 60/92, 86/92 |
| V3: V2 plus named look-ups ("Let me check your calendar.") | 47 of 75 (63%) | 19 | 89/92, 58/92, 81/92 |

The three rewrites are within noise of each other at this sample size; all are about
nine times today's rate. Direct answers were unchanged ("Paris.", "Anytime.").

What still fails under the rewrites:

- About 10 per variant are the model repeating the earlier final reply it sees in
  the transcript ("Review this request on your phone before it can run."). The eval
  conversation is unusually full of those.
- About 11 per variant are navigation confirmations ("Opening Contacts."), which
  are not acknowledgements (section 3).

V1 text, as a starting point for the upstream change:

> For pending work, replyText is only a brief cue that you heard the request; the
> real reply comes after the work. Use one of these and nothing more. For a lookup:
> "Let me check." or "Let me check your calendar." (or notes, inbox, messages,
> reminders, tasks, files, photos, contacts, the weather). To open an app: "Let me
> open Maps." (the app asked for). For any other action or change, such as a call,
> text, alarm, timer, reminder, note, directions, photo or search: just "On it." or
> "One sec." Never name the people, items, times or outcome, never say the work is
> done or under way ("Calling...", "Opening...", "Setting..."), and never repeat the
> request. Leave it empty if the user asked for silence.

This is a single-call replay, not whole turns. Before landing it needs the whole-turn
phone eval (46 cases) to confirm no drop in action accuracy.

## 5. Where acknowledgements belong

The turn type decides, not the action. Once Stage 1 has chosen planned work, a
planner call always follows, so even an instant tool leaves a wait of a second or
more (rig) to several seconds (phone).

| Turn | Acknowledge? | Today |
|---|---|---|
| Direct answer, thanks, small talk | No. The answer is the response. | Correct |
| Clarifying question, refusal, preview | No | Correct |
| Planned work, any action | Yes, once, right after Stage 1 | Built; about 9 in 10 dropped |
| Planner-less read that is slow (calendar) | Yes, if not settled within about 400 ms | Never |
| Planner-less instant tool (open a view, named note) | No | Correct |
| Navigation only | No; the held confirmation is the reply | Correct |
| Work still running after about 8 s (routes, calendar writes, workflows) | Text: status line is enough. Voice: at most one follow-up cue, optional | Nothing in voice |
| Group or ambient rooms, user asked for quiet | No | Correct |

Which actions are actually slow (phone medians, tool time only):

| Action | Typical | Why |
|---|---|---|
| Device proposals (call, text, contact, alarm, files), open view, browser open, camera | about 0.1 s | local proposal row; the phone acts after the reply |
| Notes create/patch/delete | 0.3–0.5 s | local file write |
| Tool discovery | 0.25 s | local, but costs another planner call |
| Browser control | 1.4 s | view round trip |
| Reminder create | 1.2–1.8 s (rig) | model extraction inside the handler |
| Maps place / route / start navigation | 0.1–3.9 s / 5.1 s / 2.1 s (p90 18.8 s) | 1–3 Cloud Maps calls, phone relay, GPS fix |
| Calendar feed / search / delete / update / create | 3.9 / 6.8 / 4.5 / 9.0 / 21.6 s | live broker reads, model extraction on writes |
| Web search | 4.4 s | network |
| Workflow (4 runs, sub-operation not recorded) | about 31 s | model authoring and compiler, or a full run |

No action handler sends progress text while it runs; the only feedback during a slow
tool is the status label. The full per-action inventory is in the appendix.

## 6. Keeping it brief and not annoying

Already true and worth keeping:

- At most one per turn. Never stored as a message, never part of the reply, never
  in history. The reply replaces it.
- The model writes it; nothing canned is substituted when it is dropped.
- Nothing is said for direct answers.
- It may only look forward. No names, numbers, times or outcomes.
- Voice never speaks draft or action-status text, only the acknowledgement.

To add:

- **Two to three words for effects** ("On it.", "One sec."). Name the source only
  for look-ups, where it is information ("Let me check your calendar."). The
  rewrites already produce a mean of 16–19 characters.
- **Let the model pick among several cues** so consecutive turns do not all say the
  same thing. Decide whether "Sure" and "Yeah, one sec" should pass. They are safe
  after an imperative; the grammar cannot tell an imperative from a question, but
  Stage 1 can (the effect status is `pending` and the intent is a verb).
- **Voice: do not start a cue the reply is about to cut off.** The cue starts one
  microtask after it arrives and is aborted when reply text arrives
  (`local-agent-stream.ts:83-110`). With fast model calls that can clip "On it."
  mid-word. Either hold the cue about 300 ms, or let a cue shorter than about 600 ms
  finish.
- **Voice: no instant signal exists.** Between end of speech and the acknowledgement
  there is silence (5 s on the measured builds). A short non-verbal tone when the
  turn is accepted costs no tokens and cannot be wrong. This is a product decision.
- **Keep the persona rule.** The character already says no preamble and no stock
  phrases; a two-word cue fits it, a sentence does not.

## 7. Reply chain findings beyond acknowledgements

1. **The status label says "Working" for Maps, Calendar and every device
   proposal.** The label is "Using X" only when the action declares exactly one
   labelled context; Maps declares four, Calendar five, the device tool five
   (`turn-lifetime.ts:78-98`). Stage 1 has already chosen the context for the turn,
   so the label could be the action's context that Stage 1 selected: "Using Maps",
   "Using Calendar".
2. **The label appears late.** It is sent when the planner's tool call starts
   (phone median 11.7 s). The selected context is known at Stage 1 (5.0 s).
3. **About 2 s of each phone turn is on-device work, not model or tool time**:
   0.75 s before the Stage 1 request goes out and 1.2 s between Stage 1 and the
   planner request (state, discovery, and 0.25–1.3 s of per-call preprocessing over
   the prompt). Preprocessing scales with prompt size, so the context cuts that
   landed on 20 Nov should have reduced it. Not re-measured.
4. **Effects wait for the reply text.** A view opened 3.5 s (median) after its tool
   had finished, because navigation is delivered after the reply settles. Device
   proposals that carry fixed text were delivered within 25 ms. Worth checking
   whether a prepared navigation can be released when the tool settles.
5. **Tool discovery costs a planner round.** 40 of 208 tool runs on the phone were
   `DISCOVER_ACTIONS` (0.25 s each, then another 4–5 s planner call).
6. **A context read re-runs Stage 1** with reasoning switched on after a history
   read (`stage1-decision.ts:1719`), and rebuilds the request rather than appending
   to it.

## 8. Context and caching

State at the pin, measured on the 46-turn run (provider cache works on the request
prefix: tools, then system, then messages; 1,024-token units; about 10 minutes):

| Call | Calls | Input tokens | Served from cache | Tools identical to the previous same-kind call |
|---|---|---|---|---|
| Stage 1 | 47 | 380K | 69% | 44 of 46 |
| Planner | 46 | 658K | 49% | 11 of 45 |
| Evaluator (no tools) | 8 | 71K | 48% | n/a |
| Planner reply-only round (no tools) | 3 | 19K | 16% | n/a |

Overall 55% of input was cached. The planner is 58% of all input and the worst
cached, because its tool list is rebuilt per request from the contexts Stage 1
picked, and tools are the first thing the cache reads.

Already landed (eliza#39984, alpha#1417): 40/20 history window, stable references,
constant tool head with `REPLY` last, minute-precision clock, no output caps.
Local and not yet landed (`eliza-followups`, `alphaphone-wt/ctx-budget`): constant
evaluator schema, slimmer recorded outcomes, guessed tools kept behind tool search on
device turns, minute message stamps, calendar field descriptions stated once.

New opportunities, ranked. None is covered by the branches above.

| # | Change | Why it helps | Risk |
|---|---|---|---|
| 1 | Admit planner tools in first-seen order for the conversation and keep a family for the cache lifetime, instead of sorting by name per request (`planned-tool.ts:994-1003`, `pipeline.ts:1570-1576`) | A turn needing a new family appends after the cached tools instead of changing the middle. The earlier audit's replays with stable tools reached 78–85% (its figure, not re-run here) | More tools per request; earlier work showed tool count affects routing. Needs the whole-turn eval |
| 2 | Keep Stage 1's tool bytes fixed: always declare `threadOps`, keep `replyText` in its parts form from turn 1, keep `contextRequests`/`READ_CONTEXT` shapes fixed (`stage1-decision.ts:533-631`) | Each toggle makes the whole Stage 1 request a miss (2 of 46 here; more in conversations that open threads or read context) | Model may fill fields it should leave empty |
| 3 | Make the Stage 1 context-read re-ask an append, not a rebuild (`stage1-decision.ts:1640-1672`) | The second call reuses the whole first request | Loaded history after the current message may read as an instruction; today's placement is deliberate |
| 4 | Shorten the acknowledgement rule (section 4) | Small: 300–800 characters off every Stage 1 request, and it sits in the cached part | None beyond section 4's eval |
| 5 | Move "Current date and time" below the fixed guidance in the reminder extractor (`plugin-personal-assistant/src/actions/lib/extract-task-plan.ts:265-282`) | About 2.4K tokens become a stable prefix | Low. Whether that route is cached at all is unverified |
| 6 | Run the planner's reply-only round as a continuation of the planner request | 16% cached today | Tools were removed there on purpose so the action cannot run twice |

Not recommended: one shared prefix for all stages. Stage 1 would carry the 6K-token
device tool on simple turns, and the earlier audit measured only two points from a
never-changing device tool.

`calendarReadBindings` is 5.5K of the 12.2K characters of the Stage 1 tool schema.
It is in the cached prefix, so it costs on cold turns only; the pending "stated
once" commit already trims it.

Caching and acknowledgements meet in one place: time to acknowledgement is Stage 1
latency. Stage 1 took 4.1 s on the phone with the old prompts and 0.5 s on the rig
with the current ones. Whether the phone is now near the rig figure is the most
useful thing to measure next.

## 9. Recommended changes

| # | Change | Where | Evidence | Size |
|---|---|---|---|---|
| 1 | Rewrite the acknowledgement instruction: examples, bare wait cue as the default for effects; fix the "Working on it." example | upstream `prompts/acknowledgment.ts`, `to-tool.ts` | 7% → 61–72% delivered in replay | Small; needs whole-turn eval |
| 2 | Re-measure time to acknowledgement on a current device build; set a target (for example p50 under 1.5 s) | device | Old builds: 5.0 s | Measurement only |
| 3 | Add phone apps to the "Let me open …" list (Contacts, Messages, Phone, Clock, Mail) | upstream `side-effect-claims.ts:983` | Weak: one case in the recorded run, none in the replay (the model wrote "Opening Contacts." instead) | Small |
| 4 | Status label from the Stage 1 context ("Using Maps", not "Working"), sent at Stage 1 rather than at tool start | upstream `turn-lifetime.ts:78-98` | Maps, Calendar and device tool all resolve to "Working" | Small to medium |
| 5 | Acknowledge planner-less tool calls that have not settled within about 400 ms | upstream `pipeline.ts:1088` | Calendar reads 3.9–6.8 s with no acknowledgement possible | Medium |
| 6 | Voice: hold or finish short cues so the reply never clips one | product `local-agent-stream.ts` | Code reading; not observed | Small |
| 7 | Voice: decide on an instant non-verbal tone at turn accept | product | Silence until Stage 1 | Decision first |
| 8 | Decide whether assent ("Sure", "Yeah, one sec") passes for imperative requests | upstream grammar | Owner preference | Small, but reopens a deliberate rule |
| 9 | Planner tool ordering and the other cache items | upstream, section 8 | 49% planner cache | Medium to large |
| 10 | Release prepared navigation when the tool settles | upstream/product | View opens 3.5 s after its tool finishes | Needs investigation |

## 10. What was and was not verified

- Phone timings come from one Pixel's on-device log, builds of 17 to 20 Nov,
  before the context cuts landed. Proportions should hold; absolute numbers will
  have moved. No device was attached, so nothing was measured on a current build.
- The 46-turn run used the unlanded follow-up tip (6cc102a735), which carries the
  same acknowledgement rule and grammar as the pin.
- The replay changes one field description in one call. It does not show what a
  changed acknowledgement does to later turns, where the model reads its own
  earlier replies.
- The action inventory was built by reading registration and handler code. Nothing
  was booted; a few entries are marked inferred in the appendix.
- The review itself ran no unit tests and changed no code; section 0 covers what landed later.

The whole-turn numbers come from `scripts/eval-phone-actions.ts --stream`. The Stage 1 replay
and phone-log analysis scripts were one-off tools and are not part of the repository.

## Appendix: action inventory

Every action the phone's resident agent can run, by family. Class is from what the
handler does: INSTANT (in memory), SHORT (local IO or bridge, under a second), SLOW
(network, model call or view load), OWNER (nothing happens until the owner taps).
"Label" is the status line shown while it runs.

Load set: sql, native-filesystem, browser (mobile build), vision, scheduling,
personal-assistant (full LifeOps), reminders, goals, inbox, notes, maps, calendar,
todos, the model providers, and workflow when packaged
(`packages/agent/src/runtime/plugin-collector.ts:542-590`, `core-plugins.ts:22-77`).
Coding tools, the orchestrator, computer use, PDF, video and iMessage are stubs.

### Phone device operations (`PROPOSE_DEVICE_ACTION` and `DEVICE_*`)

| Operation | What happens | Class | Label |
|---|---|---|---|
| Any proposal | One local proposal row; the tool performs no device operation (`services/device-actions/action.ts:1462,1791`) | SHORT | Working |
| Run without a card when bound to the owner's message: browser open/search/new tab/switch/find/history, camera photo, keypad, create note, open view, photo and file filters/open, notes filter/record | Phone runs it right after the reply; fixed reply text ("Opening Camera to take the photo.") | SHORT | Working, or Using Browser / Media / Notes for `DEVICE_*` names |
| Card: call, dial, send SMS, contact create/update/delete/show, read selected message/voicemail/contact, clock handoff, reminder ops, note read/delete/move/restore/query, calendar read/delete, photo album/share, file share/move/trash, tab close, read selected map | Card appears after the reply; nothing happens until the tap | OWNER | Working (Using Notes / Calendar / Media / Maps for `DEVICE_*`) |
| Calendar create (local) | Model extraction, then a card | SLOW, then OWNER | Working / Using Calendar |
| Note update, calendar update, availability | Phone shares or reads first; edit inference follows | OWNER | Working |

### Navigation, Maps, Notes

| Action | What happens | Waits | Class | Label |
|---|---|---|---|---|
| `VIEWS_SHOW` | Registers a prepared handoff; the renderer opens the view after the reply | none in handler | SHORT | Working |
| `VIEWS_LIST` | Registry read | none | INSTANT | Working |
| `MAPS_PLACE` | 1–2 Cloud Maps calls; a "near me" with no fix returns a locate card with no network | 20 s per call | SLOW | Working |
| `MAPS_ROUTE` | Resolve each end, then a routes call | 20 s each | SLOW | Working |
| `MAPS_SELECT`, `MAPS_NAVIGATE` | 0–2 Cloud calls, then the phone relay | 20 s + 30 s | SLOW | Working |
| `MAPS_NAVIGATION_START` | Cloud calls, relay, phone GPS fix; owner taps Start | relay 30 s, GPS 15 s | SLOW, then OWNER | Working |
| `MAPS_NAVIGATION_REROUTE`, `_STOP` | Relay only | 30 s | SLOW / SHORT | Working |
| `MAPS_SAVE`, `MAPS_SAVED` | Local store (lookup first if needed) | none | SHORT | Working |
| `MAPS_COVERAGE` | Cloud capabilities call | 20 s | SLOW | Working |
| `MAPS_SHARE` | Resolve, then a yes/no | 20 s | OWNER | Working |
| `NOTES_LIST`, `NOTES_GET` | In-memory read | none | INSTANT | Using Notes |
| `NOTES_CREATE/UPDATE/PATCH/DELETE/RESTORE/MOVE` | Local file write | none | SHORT | Using Notes |

### Calendar

All reads are live: one sources call plus one feed call per calendar through the
managed broker, 30 s per request, no retry.

| Action | What happens | Class |
|---|---|---|
| `CALENDAR_FEED`, `_NEXT_EVENT`, `_TRIP_WINDOW`, bulk reschedule preview | Live read; the planner's next pass writes the reply | SLOW |
| `CALENDAR_SEARCH_EVENTS` | Live read, plus a model grounding call on a weak match | SLOW |
| `CALENDAR_CHECK_AVAILABILITY`, `_PROPOSE_TIMES` | 1–2 live reads | SLOW |
| `CALENDAR_CREATE_EVENT`, `_UPDATE_EVENT` | Live read, model extraction, 2–4 broker calls, then approval (Google) or local write | SLOW, then OWNER |
| `CALENDAR_DELETE_EVENT` | Live lookup, then approval; managed Google delete is refused on the phone | SLOW, then OWNER or refusal |
| `CALENDAR_READ_SELECTED`, `CALENDAR_SOURCES` list/select, conflict scans | Live read | SLOW |
| `CALENDAR_SOURCES` connect | Returns a sign-in or Settings handoff | OWNER |
| `CALENDAR_UPDATE_PREFERENCES`, `CALENDAR_REVIEW` | Local | SHORT |

Label is "Working" for all except `CALENDAR_READ_SELECTED` ("Using Calendar").

### Reminders, todos, goals, routines, scheduled work

| Action | What happens | Class |
|---|---|---|
| `OWNER_REMINDERS_CREATE` | Always a model plan extraction, then preview or local save | SLOW |
| `OWNER_REMINDERS_UPDATE`, `OWNER_TODOS_UPDATE`, `OWNER_ROUTINES_UPDATE` | Model extraction unless the change is explicit | SLOW / SHORT |
| Cancel, delete, complete, skip, snooze, review (reminders, todos, routines) | Local | SHORT |
| `OWNER_TODOS_CREATE`, `OWNER_ROUTINES_CREATE` | Local when the planner supplies a full plan, else model extraction | SHORT / SLOW |
| `OWNER_GOALS_CREATE` | Model extraction unless grounded | SLOW |
| `TODO` ops, `SCHEDULED_TASKS_*`, `TRIGGER_*` except run | Local | SHORT |
| `TRIGGER_RUN` | Runs a nested agent turn or a workflow and waits | SLOW |
| `OWNER_ALARMS_*` | Not offered on this phone; alarms go to the clock handoff device operation | n/a |

### Workflows (when packaged)

| Sub-operation | What happens | Class |
|---|---|---|
| list, search, get, executions, rename, activate, remove, restore | Local | SHORT |
| create, modify | Model authoring plus a compiler subprocess (60 s each, 2 attempts) | SLOW |
| run | Queues and returns; the run continues in the background | SHORT |
| dossier | Waits for a full run plus a model summary (30 min limit) | SLOW |
| cancel_run | Aborts the worker | SLOW if live |

### Mail and messages

| Action | What happens | Class |
|---|---|---|
| `INBOX_LIST/SEARCH/SUMMARIZE`, `MESSAGE_LIST_INBOX/SEARCH_INBOX/READ_MESSAGE` | Gmail through the broker, 30 s per call | SLOW |
| `INBOX_TRIAGE` | Fan-out plus up to three small model calls | SLOW |
| `MESSAGE_DRAFT_FOLLOWUP`, `MESSAGE_SEND_DRAFT` | Hands a draft to the phone's Inbox editor | SHORT (SLOW with extraction), then OWNER |
| `INBOX_ARCHIVE/REPLY/APPROVE`, `MESSAGE_TRIAGE/DRAFT_REPLY/RESPOND`, `MESSAGE_MANAGE` | Fail or are refused for managed Gmail on the phone | SLOW / fails |
| `MESSAGE_SEARCH`, room and channel reads, `INBOX_SNOOZE`, schedule draft send | Local | SHORT |

### Web, browser, vision

| Action | What happens | Waits | Class | Label |
|---|---|---|---|---|
| `WEB_FETCH` | HTTPS GET | 15 s, 60 s total | SLOW | Using Web |
| `WEB_SEARCH` | Browser-first search | not read | SLOW | none |
| `BROWSER`, back/forward/reload | Frame to the phone's Browser view; page load not awaited | 5 s | SHORT | none |
| `VISION_DESCRIBE` | Cached scene | 10 s | SHORT | Working |
| `VISION_CAPTURE`, `VISION_GET_SCREEN` | Capture through the renderer | 10–30 s | SLOW | Working |

### Memory, documents, contacts, settings, core

| Action | What happens | Class |
|---|---|---|
| `REPLY` | Echoes text, or composes with a model call | SHORT / SLOW |
| `IGNORE`, `NONE`, `CALCULATE` | In memory | INSTANT |
| `MEMORY_*`, `CONTACT_*` (the agent's own records), `DOCUMENT` list/read/delete, `FILES`, `NOTIFY`, `SETTINGS`, `SECRETS` get/list, status and database reads | Local | SHORT |
| `SEARCH_KNOWLEDGE`, `SEARCH_EXPERIENCES`, `DOCUMENT` search, `MEMORY_UPDATE` | On-device embedding plus local search | SHORT (inferred) |
| `DOCUMENT` import_url, `ATTACHMENT` read, `GENERATE_MEDIA`, `CHARACTER` edits, `SECRETS` request | Fetch or model call | SLOW |
| `CONTACT_DELETE`, `TODO` clear | Yes/no first | OWNER |
| `CLOUD_ACCOUNT_STATUS` and other Cloud account actions | HTTPS to Eliza Cloud | SLOW |

### Other LifeOps actions

| Action | What happens | Class |
|---|---|---|
| Household, school and family coordination (about 37 ops) | Local; a model call when a required argument is missing; proposal ops wait for approval | SHORT / SLOW / OWNER |
| `PARENTING_GUIDANCE`, `PRIORITIZE_RANK_*`, `CREATIVE_DRAFT_*`, `PERSONAL_ASSISTANT_SCHEDULING` | Model call every time | SLOW |
| `LOCAL_CONDITIONS_WEATHER_OUTLOOK`, `_DISCOVER_ACTIVITIES` | Public API fetch, 8 s per request | SLOW |
| `BRIEF_COMPOSE_*` | Parallel calendar and inbox reads | SLOW |
| `RESOLVE_REQUEST_APPROVE` | Executes the queued effect | SLOW |
| `OWNER_HEALTH_*`, `ENTITY`, follow-ups, `WORK_THREAD`, `OWNER_DOCUMENTS_*`, `CONNECTOR_LIST/STATUS` | Local | SHORT |
| `CONNECTOR_VERIFY` | Forced Gmail and calendar read | SLOW |

### Registered but not usable on this phone

`TERMINAL_SHELL`, `CREDENTIALS_*`, `VOICE_CALL_DIAL` (no Twilio), plugin install and
configure actions, `RUNTIME_RESTART`, database writes, `ROLE` (group channels only),
`OWNER_SCREENTIME`, `PAYMENT`.

### Planner-level steps that add time without being an action

| Step | When | Cost |
|---|---|---|
| Stage 1 | Every turn | One model call; up to two retries on empty output |
| Context or history read | Stage 1 asks for it | Re-runs Stage 1; reasoning on after a history read |
| Planner iteration | Each tool round | One model call |
| `DISCOVER_ACTIONS` | Planner lacks a tool | Local lookup plus another planner call |
| Evaluator | After tools, unless one tool returned final text or the planner wrote the message | One model call |
| Reply recovery review | A reply was recovered | One small model call |
| Planner-less routing | Direct view request, single calendar read, one named note, reminder choice | Skips the planner call; no acknowledgement today |
