# eliza-assistant: develop → vibestack parity audit

Slice: develop `plugins/plugin-personal-assistant`, `plugin-assistant` (reminder, clock and assistant parts only), `plugin-todos`, `plugin-reminders`, `plugin-goals`, `plugin-scheduling`, `plugin-relationships`, `plugin-knowledge` against vibestack `packages/assistant` and `spec/assistant`.

Trees (all under `/home/shaw/.cache/vibeaudit/`): `eliza-develop` at 7a124190a1, `eliza-vs` at 769b4f00d98b (branch vibestack-dp), `alpha-vs` at 3d7ca97278a9, `alpha-develop`. Paths below are relative to those trees. Nothing was built, generated or run; every claim is from reading code and specs.

## Summary

| Class | Count |
|---|---|
| OK (rule and code cited) | 17 |
| NOT_APPLICABLE | 20 |
| Gaps | 22 (4 high, 13 medium, 5 low) |
| of which already in wave3.md | 7 |

Verdict: **not at parity.** The four chat actions that exist (`OWNER_REMINDERS`, `OWNER_GOALS`, `TODO`, `OWNER_ROUTINES`) cover the simplest path of each develop feature, and the PR fixes that apply to them are present. Four things would be noticed on the phone at once:

1. Alpha's Automations screen reads and writes reminders, routines and goals through `/api/lifeops/definitions`, `/api/lifeops/reminders` and `/api/lifeops/occurrences/{id}/snooze`. Vibestack serves none of them.
2. The assistant's providers never reach the planner, and reminders and goals have no list operation, so "what reminders do I have?" cannot be answered and a saved reminder can only be changed by guessing its exact title.
3. Two reminders asked for in one message save one and report both as saved.
4. A reminder that draws a clarifying question ("Should this reminder alert you…", "When should I remind you?") cannot be completed by answering it, because the save re-reads only the newest message.

How the phone used develop: the legacy on-device agent loaded the full `@elizaos/plugin-personal-assistant` plus scheduling, reminders, goals and todos (`eliza-develop/packages/agent/src/runtime/core-plugins.ts:25-38`, `plugin-collector.ts:903-911` keeps the full assistant on mobile). `alpha-develop/docs/agent-acknowledgement-review-2026-11.md:482-552` lists the actions the phone offered. The phone UI called the lifeops routes in `alpha-develop/apps/app/src/runtime/automations-protocol.ts:110-179`.

## Gaps

### High

**eliza-assistant-01 · MISSING · The lifeops definition, reminder and occurrence routes do not exist**
- Behaviour: the phone lists reminders, routines and goals, pauses or resumes them, archives or deletes them, and snoozes a reminder occurrence over HTTP.
- Develop: `plugins/plugin-personal-assistant/src/routes/plugin.ts:384-386` (GET reminders, GET/POST definitions), `:515-517` (GET/PUT/DELETE definition), `:538` (occurrence snooze); handlers `routes/lifeops-routes.ts:2624-2634`. Legacy caller `alpha-develop/apps/app/src/runtime/automations-protocol.ts:110,168-179`.
- Vibestack: `packages/assistant/src/index.vibe:115` registers only `/api/personal-assistant/routines*` and `/api/personal-assistant/dossier*` (`routines.vibe:174-215`, `dossier.vibe:86-113`). A search of `eliza-vs` for `lifeops/definitions`, `lifeops/reminders` and `lifeops/occurrences` finds no route.
- Alpha's port still calls them: `alpha-vs/apps/app/src/workflows/automations.vibe:156,165,232,277,303`, schemas `wire.schema.vibe:58-75`.
- Impact: two of the four Automations sources fail to read, so no reminder, routine or goal row appears. Enable, delete and snooze on those rows fail. The legacy UI path that created and edited a reminder (`automations-protocol.ts:168-176`) has no upstream route either.
- Smallest fix: point Alpha's Automations at what exists (`/api/scheduled-tasks?ownerVisibleOnly=1` for reminders and goal check-ins, `/api/personal-assistant/routines` for routines) and drop the two lifeops sources; or add the four routes to `packages/assistant` over the same stores.
- In wave3.md: no (item G names "best-effort host.json routes and policy" on Android, not the missing upstream routes).

**eliza-assistant-02 · UNIMPLEMENTED · The assistant's providers never reach the planner, and reminders and goals have no list operation**
- Behaviour: the owner asks what reminders or goals they have, or changes one without repeating its exact title.
- Develop: `OWNER_REMINDERS` review "reads saved reminders by exact title or lists existing reminders" (`plugins/plugin-personal-assistant/src/actions/owner-surfaces.ts:309-331`); goal review (`actions/life.ts:267-271`); `lifeOpsProvider` in every owner turn (`src/plugin.ts:782-800`).
- Vibestack: five providers are registered (`packages/assistant/src/index.vibe:112`) but the turn composes state with an empty include list and `onlyInclude` true (`packages/agent/src/conversation/message-service.vibe:190`), which selects no provider (`packages/core/src/runtime/state-composition.vibe:175-181`), and nothing in `packages/agent/src` reads provider text. `OWNER_REMINDERS` ops are create, complete, dismiss, snooze, acknowledge, escalate (`reminders.vibe:309`); `OWNER_GOALS` ops are create, update, delete, dismiss_checkin, checkin (`goals.vibe:190`). Neither lists. `TODO` and `OWNER_ROUTINES` do have `list`.
- Impact: "what reminders do I have" and "what are my goals" have no data to answer from. A change needs the whole title (`reminders.vibe:200-203`, `goals.vibe:106-109`) which the model cannot see. The owner's zone line (`PERSONAL_ASSISTANT_CLOCK`) is also never shown.
- Smallest fix: add `list` to `OWNER_REMINDERS` and `OWNER_GOALS`, or have the agent turn include the assistant's providers.
- In wave3.md: no.

**eliza-assistant-03 · CHANGED · Two reminders asked for in one message save one and report both**
- Behaviour: "remind me at 3 to call Sam and at 5 to pick up the kids".
- Develop: each create is its own definition; the create key is per operation, "distinct keys only for intentionally separate items" (`actions/owner-surfaces.ts:226-233`).
- Vibestack: the save key is `reminder:${messageId}` (`packages/assistant/src/reminders.vibe:110`). The scheduler answers a reused key with the existing row (`packages/agent/src/schedule/store.vibe:247-250`). The second call records a replayed receipt (`reminders.vibe:129`), which counts as applied (`replies.vibe` `ended`, noop with `replayed`), and the reply is built from the second plan (`reminders.vibe:137-138`): "I'll remind you: "pick up the kids" at …". Nothing was saved for it. The recent-save record then pairs the second title with the first task (`reminders.vibe:134-136`).
- Related, honest but limiting: a second goal in one message is refused (`goals.vibe:131`, id `goal-${messageId}`), and a second routine answers "already added by this request" (`routines.vibe` create, key `chat:${messageId}`).
- Impact: a reminder the owner was told is saved never fires.
- Smallest fix: key the save on the message and the plan (title and due), as to-dos already do (`todos.vibe:57`).
- In wave3.md: no.

**eliza-assistant-04 · CHANGED · A reminder question cannot be answered, and the alert question is asked whenever nobody stated a preference**
- Behaviour: the owner asks for a reminder, is asked a question, answers it.
- Develop: the extractor sets `notificationMode` to `default` "when normal reminder notification is wanted; null only when unclear" (`actions/lib/extract-task-plan.ts:217`, examples `:277-278`), so the alert question is rare (`actions/life.ts:5713-5729`). The pending request is kept as a deferred draft (`life.ts:5394-5422`) and the answer is routed to it (`src/plugin.ts:822`, `ownerReminderChoiceRoutingEvaluator`).
- Vibestack: the planner is told "Leave a choice null unless the owner stated it" (`reminders.vibe:310`) and the checker returns null "when it says neither" (`reminders.vibe:32`); with both null the save is cancelled and the question asked (`reminders.vibe:103-104`). The same happens for an unreadable or past time (`:107-108`). No draft is kept. The next message is checked on its own text (`reminders.vibe:85`, `checkOriginalMessage(request.text)`), and an answer such as "yes, alert me" or "at 5pm" is not a request for a reminder, so the save is refused: "I didn't save a reminder because your message didn't ask me to remind you." (`reminders.vibe:146`).
- Impact: an ordinary "remind me in 20 minutes to …" may draw a question develop did not ask, and answering it fails; the owner must restate the whole request. How often depends on the model; the journey test feeds a canned `alert: "alert"` (`packages/assistant/test/assistant.test.vibe:22`).
- Smallest fix: treat an unstated alert as "alert", and keep the cancelled intent for a few minutes so the next message can complete it.
- In wave3.md: no.

### Medium

**eliza-assistant-05 · UNIMPLEMENTED · Routines exist upstream but the phone cannot reach them**
- Develop: `OWNER_ROUTINES` offered on the phone (`src/plugin.ts:742`; `alpha-develop/docs/agent-acknowledgement-review-2026-11.md:490-493`).
- Vibestack: `OWNER_ROUTINES` is registered (`packages/assistant/src/routines.vibe:224`, `index.vibe:111`), rule `spec/assistant/routines.md:146`.
- Alpha: `alpha-vs/android/agent/policy.json:6` allows `OWNER_REMINDERS`, `OWNER_GOALS`, `TODO` and not `OWNER_ROUTINES`; the launch refuses any action it does not name (`eliza-vs/spec/agent/host/launch.md:70-76`). The routine routes are listed in `alpha-vs/android/agent/host.json:709-729` but no code under `alpha-vs/apps/app/src` or `android/app` calls them.
- Impact: no habit or routine can be created or answered from chat or from the UI.
- Smallest fix: add `OWNER_ROUTINES` to Alpha's policy.
- In wave3.md: no.

**eliza-assistant-06 · MISSING · Recurring, date-only and deadline reminders**
- Develop: "one-off, date-only, deadline ("by the 20th"), and recurring reminders" (`actions/owner-surfaces.ts:325`); cadences once, daily, times_per_day, interval, weekly (`packages/contracts/src/lifeops/scheduling.ts:197-222`); lead-up steps (`actions/life.ts:5922-5938`); snooze presets tonight and tomorrow_morning (`life.ts:261`).
- Vibestack: a reminder is one-shot only: `due` is `in`, `at` or `local` (`packages/assistant/src/requests.schema.vibe:7-11`), trigger `once` (`reminders.vibe:115`). A routine repeats only at 9:00, 15:00, 18:00 or 21:00 (`routines.vibe:15`).
- Impact: "remind me every weekday at 7:15" or "every two hours" cannot be saved as asked.
- Smallest fix: a `repeat` field on the plan mapped to a cron trigger.
- In wave3.md: no.

**eliza-assistant-07 · MISSING · Moving or editing a saved reminder**
- Develop: `OWNER_REMINDERS_UPDATE`, `delayMinutes` "moves a one-off", cancel archives and delete removes, skip (`actions/owner-surfaces.ts:325-331`, `actions/life.ts:226-256`).
- Vibestack: no update op (`reminders.vibe:309`); cancel and delete are both `dismiss`.
- Impact: "actually make that 30 minutes" cannot change the saved reminder.
- In wave3.md: yes (D, "moving a saved reminder").

**eliza-assistant-08 · UNIMPLEMENTED · A reminder saved as silent, or for the phone's own app, is delivered like any other**
- Develop: `notificationMode: "none"` or `noAlert` saves no reminder plan, so nothing alerts (`actions/life.ts:5917-5921`).
- Vibestack: rule `spec/assistant/reminders.md:79` keeps the choice, and it is stored in the task (`reminders.vibe:117`), but `deliverReminder` (`reminders.vibe:165-176`) reads neither `alert` nor `destination` and always posts a notification (`host.vibe:240-256`, `runtimePresenter`).
- Impact: a reminder the owner asked to be silent still notifies.
- Smallest fix: pass `conversationOnly` when `metadata.alert` is `silent`.
- In wave3.md: no.

**eliza-assistant-09 · CHANGED · To-dos match only the exact text, case included**
- Develop: case-, punctuation- and plural-insensitive matching with paraphrase (`plugins/plugin-todos/src/todo-match.ts:30-41,121-128`), the same for duplicate detection (`:145`), and a near miss is offered back with its reference (#39825, `src/actions/todo.ts:443-448`). Actions also include `update` (rename, sub-tasks) and `write` (`src/actions/todo.ts:974-1065`).
- Vibestack: `t.content == content` for both match and duplicate (`spec/assistant/todos.md:45,64`); the target is only trimmed (`packages/assistant/src/todos.vibe:37-41`). A miss lists candidates only when several items have identical text (`todos.vibe:80-87`). Ops: create, start, complete, cancel, reopen, delete, list, clear (`todos.vibe:116`).
- Impact: "mark buy milk done" misses "Buy milk"; "buy milk" is added beside "Buy milk" without the duplicate question; a to-do cannot be renamed. With gap 02 the model has to call `list` first to learn the exact text.
- Smallest fix: compare a normalised form (case, punctuation, spaces) and return the nearest item on a miss.
- In wave3.md: no.

**eliza-assistant-10 · UNIMPLEMENTED · The daily dossier never fires on the phone**
- Develop: the morning brief pack is on by default and fires on the owner's first activity (`src/default-packs/morning-brief.ts:44-48,62,75`).
- Vibestack: rule `spec/assistant/scheduledDossiers.md:49-67`, code `packages/assistant/src/dossier.vibe:47-58`. The control starts off (`scheduledDossiers.md:35`, `dossierOn: false`) and only `PUT /api/personal-assistant/dossier` turns it on; only `POST …/dossier/activity` admits activity. No caller exists in `eliza-vs` outside the test, or in `alpha-vs/apps/app/src` or `alpha-vs/android/app` (the routes appear only in `android/agent/host.json:693-705`).
- Impact: no "your day" brief is ever shown.
- Smallest fix: have Alpha turn the dossier on and post foreground and unlock activity.
- In wave3.md: no (D names the chat BRIEF, not this).

**eliza-assistant-11 · CHANGED · Develop's standing scheduled items are gone, and Alpha titles tasks by develop's keys**
- Develop: default packs seed good morning, good night, the daily check-in and its 30-minute follow-up, the morning brief, a quiet-user watch, a follow-up watch and a daily inbox review (`src/default-packs/daily-rhythm.ts:66,97,131,174,188`, `morning-brief.ts:62`, `followup-starter.ts:62,116`, `inbox-triage-starter.ts:51`, `quiet-user-watcher.ts:71`), with triggers relative to wake and bedtime anchors.
- Vibestack: two standing tasks, a morning check-in at 08:00 and a hidden follow-up tick (`packages/assistant/src/index.vibe:44-51`). Task kinds are `personal-assistant.reminder`, `.goal-checkin`, `.routine`, `.checkin` (`reminders.vibe:16`, `goals.vibe:11`, `routines.vibe:12`, `checkin.vibe:12`); no task sets `metadata.recordKey`.
- Alpha: the row title is `metadata.recordKey ?? kind` (`alpha-vs/apps/app/src/workflows/automations.vibe:108`) mapped by `scheduledTitles`, whose keys are develop's (`apps/app/src/web/workflows/words.ts:104-109`: `gm`, `gn`, `checkin`, `morning-brief`, `reminder`, `followup`, …).
- Impact: every assistant task in Automations reads "Scheduled task"; the anchor and window wording in `words.ts:116-125` is never used.
- Smallest fix: add the four `personal-assistant.*` kinds to Alpha's title table.
- In wave3.md: no.

**eliza-assistant-12 · MISSING · Chat actions develop offered on the phone that have no vibestack action**
- Develop registration `src/plugin.ts:716-780`; offered on the phone per `alpha-develop/docs/agent-acknowledgement-review-2026-11.md:482-552`:
  `SCHEDULED_TASKS_*` (`plugin.ts:769`), `RESOLVE_REQUEST` approve and reject in chat (`:737`), `ENTITY` and the contact follow-ups `LIST_OVERDUE_FOLLOWUPS`, `MARK_FOLLOWUP_DONE`, `SET_FOLLOWUP_THRESHOLD` (`:749-752`), `WORK_THREAD` (`:764`), `OWNER_DOCUMENTS_*` (`:753`), `PRIORITIZE_*` (`:758`), `CONNECTOR_*` (`:779`), `PERSONAL_ASSISTANT_SCHEDULING`, `CREATIVE_DRAFT_*`, `LOCAL_CONDITIONS_*`, `BRIEF_COMPOSE_*` (`:756`).
- Vibestack: the assistant registers four actions (`packages/assistant/src/index.vibe:111`). Across all packages the action names are REPLY, IGNORE, NONE, STOP, CONFIRM, VIEWS, WORKFLOW, NOTES_*, MAPS_*, BROWSER*, CALENDAR, INBOX_READ, INBOX_COMPOSE_EMAIL and these four.
- Note: vibestack "follow-ups" (`spec/assistant/followups.md`) are nudges about open approvals. Develop's follow-up actions are about people the owner has not contacted. They share a name only.
- Impact: asking the agent in chat to list or snooze a scheduled item, approve a waiting request, remember a person, rank priorities or check a connector has no tool.
- Smallest fix: decide per action; `SCHEDULED_TASKS` list and verbs over the agent's scheduler is the cheapest.
- In wave3.md: partly (D names BRIEF only).

**eliza-assistant-13 · CHANGED · Repeating tasks keep the zone they were created in**
- Develop: cron slots use the `owner_local` sentinel, resolved at fire time against owner facts (`plugins/plugin-scheduling/src/scheduled-task/trigger-tz.ts:9-13`, `plugins/plugin-goals/src/services/checkin.ts:21,192`).
- Vibestack: the zone is read once and written into the trigger: morning check-in (`packages/assistant/src/index.vibe:42-46`, created once under key `checkin:morning`), goal check-ins (`goals.vibe:58,69`), routines (`routines.vibe` create). The scheduler accepts only a known zone name (`packages/agent/src/schedule/scheduled-tasks.vibe:92-94`).
- Impact: after "my time zone is …" or during a trip, the check-in, goal check-ins and routines keep firing on the old clock, against `spec/assistant/timezone.md:57`.
- Smallest fix: re-create or edit the standing tasks when the owner's zone changes.
- In wave3.md: no.

**eliza-assistant-14 · MISSING · Reminder intensity policy**
- Develop: `policy_set_reminder` with minimal, normal, persistent, high_priority_only (`actions/life.ts:272-279`, `packages/contracts/src/lifeops/reminders.ts:37-42`).
- Vibestack: none; only per-reminder escalation (`packages/assistant/src/escalation.vibe`).
- In wave3.md: yes (D).

**eliza-assistant-15 · MISSING · Owner check-in times, and the night check-in**
- Develop: morning and evening windows are owner facts (`src/lifeops/owner/fact-store.ts:153-154`); the check-in fires in the owner's window with a follow-up.
- Vibestack: the morning check-in is fixed at 08:00 (`packages/assistant/src/index.vibe:46`). `deliverCheckin` handles a night check-in (`checkin.vibe:104`) but none is ever scheduled.
- In wave3.md: yes (D).

**eliza-assistant-16 · MISSING · BRIEF compose and goal review (includes #39691)**
- Develop: `BRIEF` compose_morning, compose_evening, compose_weekly (`actions/brief.ts:108-110`); model-backed goal progress review (`plugins/plugin-goals/src/goal-semantic-evaluator.ts:1-11`). #39691 fixed that review's prompt (`goal-prompt-value.ts`), so it has nothing to apply to until the review exists.
- Vibestack: a goal's review state comes only from the owner's check-in answer (`spec/assistant/goals.md:58`).
- In wave3.md: yes (D).

**eliza-assistant-17 · UNVERIFIED · None of the assistant's rules is accepted or proved in the lock**
- `eliza-vs/spec/lock.json` holds entries only for `spec/app/*` and `spec/index.md`; no `spec/assistant` rule is recorded, and `unproved` is empty because nothing was checked.
- All 80 rules in 16 files have a Quint block. Seven files have a `.proof.dfy`; `reminders`, `reminderEscalation`, `checkin`, `timezone`, `travel`, `replies`, `scheduledDossiers`, `evaluatorProgress` and `index` have none.
- `packages/assistant/test/assistant.test.vibe` is one file of hand-written journeys over fake ports (`test/support/ports.vibe`); it uses no generated conformance cases. `gen/` is git-ignored and absent, so every `../gen/assistant__*.effect.vibe` import is unresolved in this tree.
- Impact: the rules cited as OK below are read, not checked.
- In wave3.md: no (J records the same state for Alpha's app, not for this package).

### Low

**eliza-assistant-18 · MISSING · A to-do completed again is reported as changed (#39636)**
- Develop: `replayed: true`, `applied: false` (`plugins/plugin-todos/src/sql-store.ts:1903-1929,1979,1998`, the no-op test at `:1917`).
- Vibestack: a later message completing a completed item takes a new key (`packages/assistant/src/todos.vibe:57`) and answers `"X" is now completed.` with an applied receipt (`todos.vibe:100-101`).
- In wave3.md: yes (D).

**eliza-assistant-19 · MISSING · Never resend an unanswered SMS or call (#39674)**
- Develop: `src/lifeops/domains/reminders-service.ts:5204-5232`.
- Vibestack: no SMS or call channel; such a step is refused (`packages/assistant/src/escalation.vibe:58-62`). The phone had no Twilio (`alpha-develop/docs/agent-acknowledgement-review-2026-11.md:555`), so nothing is lost today.
- Nearest analogue to watch: a reminder whose notification was posted but whose chat message failed is retried whole after 60 s (`reminders.vibe:173`), which can notify twice.
- In wave3.md: yes (D).

**eliza-assistant-20 · CHANGED · Output caps on the assistant's model calls**
- Vibestack: 120 tokens for the reminder check (`packages/assistant/src/reminders.vibe:40`), 400 for the check-in (`checkin.vibe:88-91`), 500 for the dossier (`dossier.vibe:66`). A truncated check decodes to nothing and the reminder is refused as unverified (`reminders.vibe:41-42,147`).
- Develop: the extractor runs uncapped with low reasoning (#40037, `actions/lib/extract-task-plan.ts`, `taskCreatePlanProviderOptions`).
- In wave3.md: yes (B, "remove the assistant package output caps").

**eliza-assistant-21 · CHANGED · Goals are simpler than develop's**
- Develop: similarity dedup over title, description and success criteria at 0.85, scored both ways (#39927, `plugins/plugin-goals/src/goals-service.ts:320-344`); check-in windows and weekdays chosen per goal (`services/checkin.ts:97-105,170-192`); several goals per message.
- Vibestack: #39927's case is right (see OK table), but a duplicate is only an equal title (`spec/assistant/goals.md:88-98`); a daily goal always checks in at 9:00 and 18:00 and a weekly one on Monday 9:00 (`packages/assistant/src/goals.vibe:17`); update cannot rename (`requests.schema.vibe:69`); one goal per message (`goals.vibe:131`).
- In wave3.md: no.

**eliza-assistant-22 · MISSING · Owner facts stated in chat other than zone and travel**
- Develop: preferred name, location, partner and relationship edges (`src/lifeops/owner/profile-extraction-evaluator.ts:68-86`).
- Vibestack: only "my time zone is …" (`packages/assistant/src/timezone.vibe:36`) and travel (`travel.vibe:17-19`).
- In wave3.md: no.

## Contract mismatches with Alpha's port

Everything Alpha imports from the package resolves: `alpha-vs/scripts/resident/entry.vibe:7,42` uses the default export (`eliza-vs/packages/assistant/src/index.vibe:118`); no subpath export is imported. The mismatches are routes, names and policy.

| # | Alpha expects | Vibestack has | Evidence |
|---|---|---|---|
| 1 | `GET /api/lifeops/reminders` → `{reminders:[{definition, occurrence}]}` | no route | `alpha-vs/apps/app/src/workflows/automations.vibe:156`, `wire.schema.vibe:69` |
| 2 | `GET /api/lifeops/definitions` → `{definitions:[{definition}]}` | no route | `automations.vibe:165`, `wire.schema.vibe:72` |
| 3 | `PUT /api/lifeops/definitions/{id}` `{status}` → `{definition}` | no route | `automations.vibe:232-234` |
| 4 | `DELETE /api/lifeops/definitions/{id}` → `{deleted:true}` | no route | `automations.vibe:277-278` |
| 5 | `POST /api/lifeops/occurrences/{id}/snooze` `{minutes:10}` | no route | `automations.vibe:303-304` |
| 6 | `POST /api/lifeops/definitions` allowed in the owner route table | no route | `alpha-vs/apps/app/src/platform/owner-routes.json:154` |
| 7 | owner route table and `host.json` list `/api/lifeops/scheduled-tasks/*`; the app calls `/api/scheduled-tasks/*`, which the owner table does not list | serves `/api/scheduled-tasks/*` only (`eliza-vs/packages/agent/src/schedule/scheduled-task-routes.vibe:177-199`) | `owner-routes.json:127-166`, `android/agent/host.json:555-604`, `automations.vibe:152,239,312,324` |
| 8 | task title from `metadata.recordKey` or develop kinds (`reminder`, `checkin`, `gm`, …) | kinds `personal-assistant.*`, no `recordKey` | `automations.vibe:108`, `apps/app/src/web/workflows/words.ts:104-113` |
| 9 | action allow-list without `OWNER_ROUTINES` | action registered | `alpha-vs/android/agent/policy.json:6` |
| 10 | `/api/personal-assistant/routines*` and `/dossier*` listed in `host.json`, never called | routes exist | `android/agent/host.json:693-729` |
| 11 | cron zone may be `owner_local` on read | never emitted; a cron edit must name a known zone | `automations.vibe:90`, `eliza-vs/packages/agent/src/schedule/scheduled-tasks.vibe:92-94` |
| 12 | `GET /api/automations` (outside this slice; develop `packages/agent/src/api/server.ts:1779`) | no route found in `eliza-vs/packages` | `automations.vibe:143`, `shell/overview.vibe:56` |

## Confirmed OK

| Behaviour | Develop | Vibestack rule | Vibestack code |
|---|---|---|---|
| #39646 "Read the new" never names "Read the news" | `plugin-todos/src/todo-match.ts:50-53` | `spec/assistant/todos.md:55` | `packages/assistant/src/todos.vibe:37-41,80-87` |
| #39825 a word-swapped target changes nothing (reply differs, gap 09) | `plugin-todos/src/sql-store.ts:1643-1655` | `todos.md:55` (`stepMissChangesNoItem`) | `todos.vibe:80-87` |
| #39927 "Run a marathon" beside "Run a half marathon" | `plugin-goals/src/goals-service.ts:320-344` | `spec/assistant/goals.md:88` | `goals.vibe:129` |
| #39643 new escalation steps keep the quiet hours | PA `life.ts` policy_configure_escalation | `spec/assistant/reminderEscalation.md:63` | `escalation.vibe:77-84` |
| #39668 "don’t save that one" with a typographic apostrophe | PA life save retraction | `spec/assistant/reminders.md:110` | `reminders.vibe:255` |
| #39627 ordinal return day; impossible date keeps the 30-day cap | PA `profile-extraction-evaluator.ts` | `spec/assistant/travel.md:50,64` | `travel.vibe:23-24,70-82` |
| #39824 a return named for today ends the trip | same | `travel.md:50` | `travel.vibe:85-96` |
| #40106 "Tell me the address, like example.com." | `plugin-assistant/src/services/device-actions/action.ts:2003-2010` | `spec/browser/control.md:254-264` | `packages/browser/src/proposal.vibe:45` |
| Reminder saved only after the owner's message is re-read | PA `OWNER_REMINDER_INTENT_*` | `reminders.md:43` | `reminders.vibe:37-43,99-102` |
| Take back the reminder just saved, within five minutes | PA #17116 | `reminders.md:110` | `reminders.vibe:260-289` |
| Complete, dismiss, snooze, acknowledge one named reminder | PA life ops | `reminders.md:59` | `reminders.vibe:216-237` |
| Escalation steps per channel, held in quiet hours, stop once answered | PA escalation | `reminderEscalation.md:26,73` | `escalation.vibe:54-135` |
| To-do applied once per key; duplicate asks first; clear previews then confirms | `plugin-todos/src/sql-store.ts` | `todos.md:15,38,88` | `todos.vibe:47-103` |
| Goal check-ins follow status and cadence; a dismissed slot stays gone; an answer sets the review state | `plugin-goals/src/services/checkin.ts` | `goals.md:19,47,58` | `goals.vibe:56-92,152-162` |
| Owner states a zone; unknown names change nothing | PA `profile-extraction-evaluator.ts:82-83` | `spec/assistant/timezone.md:30` | `timezone.vibe:36-50,75-84` |
| Check-in stores a summary only for the reported day; only provider-changed events count as changed | PA `checkin-service.ts` | `spec/assistant/checkin.md:18,64` | `checkin.vibe:20-33,79-100` |
| Phone reminder and Clock proposals bound to the owner's words | `plugin-assistant` device actions | `reminders.md:139,154,177` | `device-proposals.vibe` (not compared line by line with develop) |

## Not applicable

| Item | Why |
|---|---|
| #39760, #39741, #39708, #39704, #39698, #39689, #39684 (circadian, HID idle, meals, sleep day, schedule buckets) | Health and schedule insight are left out on purpose (`spec/assistant/index.md:17-18`). The only phone-visible effect was the wake and bedtime anchors of the default packs, covered in gap 11. |
| #39672, #39667 (app blocking) | Blocking is left out on purpose; legacy Alpha has no reference to it. |
| #39649 (purge Gmail sync cursor) | No local Gmail import in vibestack; inbox slice. |
| #39737, #39732, #39847, #39935 | Deprecation, env names, ElevenLabs presets, lint; no behaviour here. |
| #39882 `VOICE_CALL` offered only with Twilio | No `VOICE_CALL` action; the phone had no Twilio. |
| #40037 "a condition is not a recurrence" extractor line | Vibestack reminders have no recurrence to misread (gap 06). |
| `OWNER_ALARMS` | Not offered on the phone in develop either (`alpha-develop/docs/agent-acknowledgement-review-2026-11.md:497`); alarms go to the Clock handoff, which exists (`packages/assistant/src/clock.vibe`). |
| `CREDENTIALS_*`, `OWNER_SCREENTIME`, `VOICE_CALL_DIAL` | Registered but unusable on the phone in develop (`…review-2026-11.md:553-557`). |
| Household, school, family, food, parenting, travel booking, document signing | Left out on purpose (`spec/assistant/index.md:17-18`). They were offered in chat on develop (about 37 operations); the owner should confirm they are not wanted. |
| `plugin-knowledge` routes | Not in the mobile plugin set (`core-plugins.ts:21-38`) and the phone never called them. |
| `plugin-reminders` | Data-layer migration service only; no behaviour of its own. |

## Not covered

- `plugin-assistant` beyond the reminder, clock and address-hint parts: the turn pipeline, acknowledgements, device-action families, telephony, memory, documents and contacts belong to other slices.
- `plugin-scheduling` against `packages/agent/src/schedule`: only the route paths, the verbs, the trigger kinds and the zone sentinel were compared. Fire reasons, global pause, quiet-hours deferral, missed-run handling and task history were not.
- `plugin-relationships`: only its action surface (`ENTITY`, follow-ups). The knowledge graph, identity merge and #39830 were not compared.
- How a fired reminder reaches Android: the agent's notification transport and Alpha's native notification session, and whether the `{taskId, kind}` notification data vibestack sends is accepted by Alpha's native parser.
- `plugin-native-reminders` and the phone's own reminder journal (os slice).
- Whether develop's Cloud resident agent (lean-chat set, `plugin-todos` without the assistant) is a second topology the phone relied on.
- Model behaviour: gaps 03 and 04 are read from code; how often the alert question appears depends on the model and was not measured.
- Nothing was generated, type-checked, proved or run in either tree.

## Skeptic verdicts

Checked 2026-11-22 against eliza-vs 769b4f00d98 and w3-assistant 47f8eb38c12 (the other six w3 checkouts carry eliza-vs's assistant package unchanged). Paths under `w3-assistant/` are `/home/shaw/.cache/vibecut/w3-assistant/`. Nothing was generated, built or run.

- eliza-assistant-01: confirmed. No `/api/lifeops/definitions`, `/reminders` or `/occurrences` route in eliza-vs or any w3 checkout (grep of packages and spec; only calendar's `/api/lifeops/calendar*` exists). alpha-vs still calls them (apps/app/src/workflows/automations.vibe:156,165,232,277,303) and routes them to the agent (android/agent/host.json:531-551). Impact is narrower than stated: vibestack reminders, goal check-ins and routines are owner-visible scheduled tasks, so they still list through `/api/scheduled-tasks?ownerVisibleOnly=1` (automations.vibe:152; packages/agent/src/schedule/scheduled-task-routes.vibe:177); the two lifeops sources fail as issues.
- eliza-assistant-02: in_flight_wave3. eliza-vs is as reported: `composeState(message, [], true, true)` selects no provider (packages/agent/src/conversation/message-service.vibe:190; packages/core/src/runtime/state-composition.vibe:175-181,228-233) and no pipeline hook adds any. w3-assistant adds OWNER_REMINDERS op list (w3-assistant/packages/assistant/src/reminders.vibe:453,535; spec/assistant/reminders.md:205) and OWNER_GOALS op review, which names every active goal (goals.vibe:152; spec/assistant/goals.md:107). Residual: providers are still not composed in any w3 tree (message-service.vibe:190 unchanged), targets still need the whole title (reminders.vibe:264-267), and paused or archived goals have no list. The turn does show the phone's clock line (packages/agent/src/conversation/clock.vibe:36-38), not the assistant's stated zone.
- eliza-assistant-03: confirmed. Key is `reminder:${messageId}` in eliza-vs (packages/assistant/src/reminders.vibe:110) and still in w3-assistant (reminders.vibe:177); the store returns the existing row for a reused key (packages/agent/src/schedule/store.vibe:238-251), the receipt is a replayed noop that counts as applied (replies.vibe:43,114-117) and the reply is built from the second plan (reminders.vibe:137-138). Develop keys per operation (owner-surfaces.ts:226-233).
- eliza-assistant-04: confirmed. Both the planner (reminders.vibe:310 "Leave a choice null unless the owner stated it") and the checker (reminders.vibe:32) leave alert null when unstated, so the save is cancelled with the question (:103-104,:148); the next message is re-checked on its own text (:85) and no draft is kept. Unchanged in w3-assistant (reminders.vibe:97,151,171). Develop defaults notificationMode unless unclear (extract-task-plan.ts:217), asks only on null (life.ts:5713-5729) and keeps a deferred draft (life.ts:5394-5422; plugin.ts:822). Frequency depends on the model and was not measured.
- eliza-assistant-05: confirmed (Alpha-side). OWNER_ROUTINES is registered upstream (eliza-vs/packages/assistant/src/index.vibe:111; routines.vibe:224) but alpha-vs/android/agent/policy.json allows only OWNER_REMINDERS, OWNER_GOALS and TODO from the assistant, and no code under alpha-vs/apps/app/src or android/app calls `/api/personal-assistant/routines` (only host.json:709-729). The in-progress /home/shaw/.cache/vibecut/alpha-vs policy does not name it either.
- eliza-assistant-06: in_flight_wave3. eliza-vs takes only in, at and local, once (requests.schema.vibe:7-11; reminders.vibe:115). w3-assistant adds a day (date-only or deadline, due 09:00) and a repeat at HH:MM every day or on named weekdays as a cron trigger (w3-assistant/packages/assistant/src/requests.schema.vibe:9-15; reminders.vibe:30-45). Residual, not in any w3 tree: interval repeats ("every two hours"), lead-up reminders, and the tonight and tomorrow-morning snooze presets (snooze takes minutes only, requests.schema.vibe:47-51).
- eliza-assistant-07: in_flight_wave3. w3-assistant moves a waiting reminder by a delay or to a stated time and renames it through the scheduler's edit (w3-assistant/packages/assistant/src/reminders.vibe:382-426,429-450; spec/assistant/reminders.md:158,186,205). Residual: no cancel-versus-delete distinction and no skip (ops at reminders.vibe:511).
- eliza-assistant-08: confirmed. The choice is stored (eliza-vs/packages/assistant/src/reminders.vibe:117) but deliverReminder reads neither alert nor destination (:165-176) and the presenter notifies unless conversationOnly (host.vibe:240-256). Same in w3-assistant (reminders.vibe:232-240 passes no conversationOnly). Develop saves no reminder plan for none or noAlert (life.ts:5917-5921).
- eliza-assistant-09: in_flight_wave3. eliza-vs matches exact text (todos.vibe:37-41; spec/assistant/todos.md:45,64). w3-assistant matches apart from case, punctuation and spacing for changes and duplicates and adds rename (w3-assistant/packages/assistant/src/todos.vibe:36-48,78,81; spec/assistant/todos.md:38,57). Residual against develop (plugin-todos/src/todo-match.ts:30-41,121-145; actions/todo.ts:443-448): no plural or paraphrase match, no "did you mean" on a near miss, no sub-tasks.
- eliza-assistant-10: not_applicable_to_phone. The difference is real upstream (dossier starts off and only its routes drive it: eliza-vs/spec/assistant/scheduledDossiers.md:35,49-67; no caller outside the test), but the legacy phone could not reach develop's brief either: develop fires it only from an admitted owner activity (default-packs/morning-brief.ts:44-48; lifeops/scheduled-task/dossier-activity-policy.ts:216-228) admitted solely by POST /api/lifeops/activity-signals (lifeops/domains/reminders-service.ts:5690-5705; routes/lifeops-routes.ts:2172-2182), which upstream's own renderer posts (lifeops/activity-signals-capture.ts). alpha-develop has no reference to activity-signals, MobileSignals or USER_PRESENT in apps, android, scripts or test, and alpha-vs has no dossier caller. Not verified on a device.
- eliza-assistant-11: confirmed. eliza-vs keeps two standing tasks (packages/assistant/src/index.vibe:44-51), kinds are `personal-assistant.*` with no metadata.recordKey, and Alpha titles by recordKey or develop kind (alpha-vs/apps/app/src/workflows/automations.vibe:108; apps/app/src/web/workflows/words.ts:104-113; AutomationList.tsx:34), so each reads "Scheduled task". w3-assistant adds only an owner-chosen night check-in (checkin.vibe:150-190) and no recordKey. Whether develop's default packs were live on the legacy phone was not verified; Alpha's legacy title table named them (alpha-develop/apps/app/src/ui/workflows/scheduled-task-presentation.ts:13-26).
- eliza-assistant-12: confirmed. eliza-vs registers four assistant actions (packages/assistant/src/index.vibe:111); no package in eliza-vs or any w3 checkout registers SCHEDULED_TASKS_*, RESOLVE_REQUEST, ENTITY or contact follow-ups, WORK_THREAD, OWNER_DOCUMENTS_*, PRIORITIZE_*, CONNECTOR_*, PERSONAL_ASSISTANT_SCHEDULING, CREATIVE_DRAFT_* or LOCAL_CONDITIONS_* (grep of action names across packages/*/src). Only BRIEF is in flight (w3-assistant/packages/assistant/src/brief.vibe:149; see 16). Develop registers them at plugin.ts:716-780 and the legacy phone doc lists them as usable (alpha-develop/docs/agent-acknowledgement-review-2026-11.md:482-552).
- eliza-assistant-13: in_flight_wave3. eliza-vs writes the zone into each cron trigger once (packages/assistant/src/index.vibe:42-46; goals.vibe:58,69). w3-assistant re-points check-ins, goal check-ins, routines and repeating reminders at the owner's current zone when a zone is stated and at every start (w3-assistant/packages/assistant/src/checkin.vibe:195-201; index.vibe:45,101-118; goals.vibe:94; routines.vibe:193; reminders.vibe:464). Residual: a trip starting or ending does not reschedule until the next start (travel.vibe has no followOwnerClock call).
- eliza-assistant-14: in_flight_wave3. Absent from eliza-vs (no "intensity" in packages/assistant/src). w3-assistant: OWNER_REMINDERS op intensity with minimal, normal, persistent, high_priority_only, per owner, reminder or routine (w3-assistant/packages/assistant/src/reminders.vibe:484-496,519; escalation.vibe:87-137; spec/assistant/reminderEscalation.md:127-186).
- eliza-assistant-15: in_flight_wave3. eliza-vs fixes 08:00 and schedules no night check-in (packages/assistant/src/index.vibe:44-47). w3-assistant keeps owner-chosen morning and night times, morning at 08:00 until chosen and night only once chosen (w3-assistant/packages/assistant/src/checkin.vibe:150-190,212-235; routes :245,:252; spec/assistant/checkin.md:97-102). On the phone it is reachable only through the new BRIEF action (schedule_checkins) or `/api/personal-assistant/checkins`, and alpha-vs's policy.json and app name neither.
- eliza-assistant-16: in_flight_wave3. w3-assistant adds BRIEF compose_morning, compose_evening and compose_weekly (w3-assistant/packages/assistant/src/brief.vibe:107,149; index.vibe:130; spec/assistant/checkin.md:136-142) and OWNER_GOALS op review (goals.vibe:152-185; spec/assistant/goals.md:101-107). The goal review is read from check-in answers, not model-backed, so #39691 still has nothing to apply to. Alpha's policy.json must add BRIEF for the phone to offer it.
- eliza-assistant-17: confirmed. eliza-vs/spec/lock.json lists only spec/app/echo.md, tally.md, words.md, index.md and spec/index.md; spec/assistant has 15 rule files (16 with index.md) and 7 .proof.dfy, the eight named files having none; packages/assistant/gen is absent and git-ignored (.gitignore:2). I count 70 rule headings, each with a Quint block, not 80. w3-assistant is the same (no spec/assistant entry in spec/lock.json, 7 proofs).
- eliza-assistant-18: in_flight_wave3. eliza-vs has no already-set outcome (spec/assistant/todos.md:26) and answers "is now completed" (packages/assistant/src/todos.vibe:100-101). w3-assistant answers a replayed request with a noop receipt and "Nothing changed" and an item already at the status as unchanged (w3-assistant/packages/assistant/src/todos.vibe:90-95,97-103; spec/assistant/todos.md:26,80; commit ef35e9d7745).
- eliza-assistant-19: in_flight_wave3. The SMS and call channel itself does not exist on either side of the phone (eliza-vs/packages/assistant/src/escalation.vibe:58-62; no Twilio on the legacy phone, alpha-develop/docs/agent-acknowledgement-review-2026-11.md:555). The unknown-acceptance rule is carried for the channels that exist: a delivery that may have reached the owner is never sent again (w3-assistant/spec/assistant/reminderEscalation.md:111-125; packages/assistant/src/host.vibe:258-289; commit a378f7bd923), which also closes the double-notify retry at eliza-vs reminders.vibe:173.
- eliza-assistant-20: in_flight_wave3. eliza-vs caps at 120, 400 and 500 tokens (packages/assistant/src/reminders.vibe:40; checkin.vibe:88-91; dossier.vibe:66; host.vibe:228-230). w3-assistant's Model.complete takes no limit (w3-assistant/packages/assistant/src/host.vibe:91,243; reminders.vibe:106; commit 2acac5292f2).
- eliza-assistant-21: confirmed. Unchanged in w3-assistant: a duplicate is an active goal with the equal title (spec/assistant/goals.md:88-98; goals.vibe:23,193), slots are fixed at 9:00, 18:00 and Monday 9:00 (goals.vibe:20-21), the goal id is `goal-${messageId}` (goals.vibe:195) and update carries no title (requests.schema.vibe:76). Develop scores similarity at 0.85 (plugin-goals/src/goals-service.ts:320-344) and maps windows per goal (services/checkin.ts:97-105).
- eliza-assistant-22: confirmed. eliza-vs and every w3 checkout keep only the stated zone and travel (packages/assistant/src/timezone.vibe:36; travel.vibe:17-19; no "preferredName" in packages/assistant, packages/agent/src, spec/assistant or spec/agent). Develop keeps preferredName, location and partner from chat (lifeops/owner/profile-extraction-evaluator.ts:68-86).
