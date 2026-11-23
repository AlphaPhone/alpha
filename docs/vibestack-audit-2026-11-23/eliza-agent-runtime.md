# eliza-agent-runtime: develop → vibestack parity findings

Slice: develop `packages/agent`, `packages/host` (plus the turn pipeline in `plugins/plugin-assistant` that the
task's look-list names) against vibestack `packages/agent` (all but `src/device-actions`) and `spec/agent`.
Trees: `eliza-develop` 7a124190a1, `eliza-vs` 769b4f00d (branch vibestack-dp), consumer `alpha-vs`, legacy consumer `alpha-develop`.
Read-only audit. Nothing was built or generated: `packages/agent/gen/` is git-ignored and absent, so every generated
function (`decide`, `resendWait`, `planActionOf`, `step`, ...) was read from its Quint block in the spec, not from code.

## Summary

- 46 behaviours confirmed OK (8 of them at route-presence level only, marked in the table).
- 21 items not applicable.
- 22 gaps: 5 high, 11 medium, 6 low. 7 of the 22 are already named in `wave3.md` (marked).
- 13 contract mismatches between `alpha-vs` and `eliza-vs` (6 of them block a phone feature outright).

Verdict: the vibestack agent is a redesign, not a port. Turn admission, idempotent replay, Stop, the stream text
protocol, the 429 re-send bound, the no-cap rule on the agent's own handlers, the fork route and the navigation
claim lease are all present with a rule and code. Behaviour is lost in three places:

1. The wire between Alpha's port and the agent does not line up. The Browser page, the phone position for Maps, the
   Calendar agenda source, the conversation list, the search page and `/api/auth/me` each have a shape on one side
   the other does not read.
2. The stream carries less than develop's: no `reply_ready`, no status after the first `thinking`, no status label,
   so the spoken acknowledgement and the early voice reply have no transport.
3. Output is capped twice despite the no-cap rule: the vibestack Cloud forwards `max_tokens: 500` when the agent
   names none, and the agent refuses any model text over 32,768 UTF-16 units as a provider issue.

Vibestack usage: all 345 `###` rules under `spec/agent` carry a Quint block. `spec/lock.json` records only the five
`spec/app/*.md` template files and no agent rule; 9 of 46 agent spec files have a `*.proof.dfy`; 12 areas have a
conformance driver, and turns, planning, turnContext, events and models/binding have none.

## Gaps

### High

**eliza-agent-runtime-01 · CHANGED · high · Cloud adds a 500-token output cap to every call that names none** (not in wave3; cross-slice with cloud)
- Behaviour: #40174 "send no output cap by default". The agent sends no `max_tokens`; the Cloud must not add one.
- develop: `packages/cloud/api/v1/chat/completions/route.ts:1707` (`effectiveMaxTokens = request.max_tokens`), `:1729-1730` (500 only as the credit estimate), `:2724-2726` (`max_tokens` forwarded only when set).
- vibestack: agent side is right (`spec/agent/models/binding.md:201-205`, `packages/agent/src/models/chat.vibe:496-511`). Cloud side: `packages/cloud/src/services/chat-request.vibe:69` (`outputTokens: ... ?? defaultOutputTokens`), `spec/cloud/services/inference.md:139` (`defaultOutputTokens = 500`), `packages/cloud/src/services/chat.vibe:18-19` and `:51` (`providerBody` always writes `max_tokens: max`). Alpha's Cloud is this worker: `alpha-vs/cloud/src/worker.vibe:2`.
- Impact: every planner call on Alpha Cloud stops at 500 output tokens. A longer answer ends as a provider `length` stop. Because the agent sent no cap, `stoppedAtOutputLimit` (`planning.vibe:158-161`) reads it as the model's own maximum and the owner gets "That answer got cut off..." for any answer over roughly 2,000 characters.
- Smallest fix: in `providerBody`, forward a cap only when the request named one; keep 500 for the quote only. Add the law to `spec/cloud/services/inference.md`.

**eliza-agent-runtime-02 · CHANGED · high · The Browser page is read from `metadata.browserPage`, Alpha sends `metadata.clientDevice.browserPage`** (#40067, #40193)
- develop: `packages/contracts/src/client-turn-observation.ts:60` and `:670-680` (`clientDevice.browserPage`); `alpha-develop/apps/app/src/runtime/connection-ui.tsx:3346`.
- vibestack: `packages/agent/src/conversation/turns.vibe:99` and `:104-110`, `conversation/turn-context.schema.vibe:324-335` (`metadata.browserPage`), `packages/browser/src/proposal.vibe:98-100`. Alpha: `alpha-vs/apps/app/src/assistant/composer.vibe:372` (`clientDevice: { browserPage }`), `alpha-vs/apps/app/src/shell/assistantHost.vibe:92` (the peer facts never set `browserPage`, so `composer.vibe:352` never builds a page).
- Impact: "summarise this page" and "open the second link" get no page. The nested page lands in `rest` unvalidated and is stored with the message.
- Smallest fix: pick one location. Either Alpha sends `metadata.browserPage` and its peer facts carry `browserPage: sends`, or the agent reads `clientDevice.browserPage`. State the location in `spec/agent/conversation/turnContext.md`.

**eliza-agent-runtime-03 · CHANGED · high · The phone position has two homes: the agent keeps `observation.location`, Maps reads `clientDevice.context.location`**
- develop: one home, `content.metadata.clientDevice.context` (`packages/contracts/src/client-turn-observation.ts:3`, `:412-430`).
- vibestack: agent `conversation/turn-context.schema.vibe:28-41`, `spec/agent/conversation/turnContext.md:111`; Maps `packages/maps/src/client/location.vibe:44` and `:57-59`, used at `packages/maps/src/plugin.vibe:105` and `:419`. Alpha sends only `metadata.observation` (`composer.vibe:340-351`).
- Impact: the model sees the coordinates as JSON in the screen note, but the Maps action has no phone position, so "coffee near me" and "where am I" lose their origin.
- Smallest fix: make `messageLocation` read through `readTurnContext(message).observation?.location`.

**eliza-agent-runtime-04 · CHANGED · high · The conversation list answers epoch numbers where develop answered ISO strings**
- develop: `packages/agent/src/api/conversation-routes.ts:3367` (`updatedAt: new Date(...).toISOString()`).
- vibestack: `packages/agent/src/conversation/conversations.vibe:54` (`conversationView` gives `createdAt`, `updatedAt` as numbers), stored at `:75-77`. Alpha: `alpha-vs/apps/app/src/assistant/payloads.schema.vibe:5-10` (`updatedAt?: string`), decoded strictly at `conversations.vibe:21-22`, used by `list`, `create` and `branch` (`:46-52`, `:72-77`).
- Impact: listing, creating and forking a conversation each fail as `UnreadableAnswer` on the phone. Sending still works, because `TurnController` decodes only `{id, roomId}`.
- Smallest fix: one side changes type; the spec (`spec/agent/conversation/conversations.md:15`) should state the wire type.

**eliza-agent-runtime-05 · MISSING · high · `TurnTransport` has no headers, so device identity and capabilities never ride a turn** (wave3 G)
- develop: `alpha-develop/apps/app/src/runtime/local-agent.ts:481` (`headers: {...this.deviceHeaders, ...}`); `packages/agent/src/api/device-action-routes.ts:56-57`, `:75`.
- vibestack: `packages/agent/src/client/turn-controller.vibe:42-45` (`request(path, body?)`, `stream(path, body, signal?)`); the server reads them (`access/socket.vibe:78`, `device-actions/enrollment.vibe:26-27`, `device-actions/capabilities.vibe:4`).
- Impact: no device proposal can be offered on a phone turn. Already wave3 item G.

### Medium

**eliza-agent-runtime-06 · UNIMPLEMENTED · medium · `reply_ready` is never written**
- develop: `packages/agent/src/api/conversation-routes.ts:6093-6124` (published before persistence so voice can start).
- vibestack: rule `spec/agent/conversation/replyStream.md:208`; `conversation/stream.vibe:176` defines `writer.ready`; nothing calls it (`turns.vibe:396-397` wires only `append`, `restart`, `tool`).
- Impact: a voice turn cannot speak a plain reply before the `done` frame; Alpha's `onReady` (`alpha-vs/apps/app/src/voice/conversation.vibe:359`) never fires.
- Smallest fix: call `writer.ready(replyText, ran)` from `send` once the reply text is settled and no failure is held.

**eliza-agent-runtime-07 · CHANGED · medium · Status frames carry only `activity`, and only the admission `thinking` is ever sent** (wave3 B and I cover the acknowledgement half)
- develop: `packages/contracts/src/contracts/chat.ts:30-45` (`kind`, `label`, `actionName`, `toolName`), written at `conversation-routes.ts:5861` and `:6299`; tool events `chat.ts:62-75`.
- vibestack: `client/reply-frame.schema.vibe:6-7` (`{type:"status", activity}`, `{type:"tool", name}`); admission status `spec/agent/conversation/replyStream.md:31-36`; `stream.vibe:174` `writer.status` has no caller.
- Impact: the chat row shows "thinking" and nothing after; a voice turn gets no label to speak. Alpha's voice hook already declares a second `label` argument the reader never supplies (`alpha-vs/apps/app/src/voice/conversation.vibe:353` against `client/stream-reader.vibe:9`, `:78`).

**eliza-agent-runtime-08 · UNIMPLEMENTED · medium · The planning acknowledgement has no path to the client** (wave3 I)
- develop: #40028, #40196; history row `planningAcknowledgment` at `conversation-routes.ts:3826-3829`.
- vibestack: rule `spec/agent/conversation/planning.md:198-212`, grammar `conversation/reply-text.vibe:13-52`, call site `planning.vibe:283`; `turns.vibe:265-270` builds the processing options without `onPlanningAcknowledgment`, so `message-service.vibe:208` passes nothing. The cue streams as ordinary non-provisional tokens and is then erased by a restart.
- Owned by session local_803a7de1 per wave3 I.

**eliza-agent-runtime-09 · UNMODELED · medium · A model text over 32,768 UTF-16 units is refused as a provider issue**
- develop: no such limit in `plugins/plugin-elizacloud/src/models/text.ts`, `plugins/plugin-openai/models/text.ts` or the chat routes; the phone displayed up to 200,000 characters (`alpha-develop/apps/app/src/runtime/local-agent-stream.ts:199`).
- vibestack: `packages/agent/src/models/chat.vibe:364` and `:409`; tool-call arguments over 65,536 units at `:404`. No rule in `spec/agent/models/binding.md` states either.
- Impact: a long answer fails as `provider_issue` with a Retry affordance that fails the same way. Against the owner's "no output cap anywhere".
- Smallest fix: remove both checks or raise them to the client's display limit, and state the bound in the spec.

**eliza-agent-runtime-10 · MISSING · medium · History rows carry only `id`, `role`, `text`, `timestamp`**
- develop: `conversation-routes.ts:3811-3900` (also `clientMessageId`, `failureKind`, `terminalFailure`, `interrupted`, `attachments`, `planningAcknowledgment`, `source`).
- vibestack: `conversation/history.vibe:71-76`. `spec/agent/client/turns.md:158` ("A stopped turn's user row is found by its clientMessageId alone") and `client/stopped-turn.vibe:27-31` need a `clientMessageId` no row has.
- Impact: after a Stop the owner's own row is never matched and released; a failed or stopped reply reopens as an empty or partial assistant bubble with no failure mark; Alpha's `createdAt` (`composer.vibe:157`) is never present because the field is named `timestamp`.
- Smallest fix: add `clientMessageId` (from `content.chatIdempotency`) and `failureKind` to `messageView`, with a rule in `conversations.md`.

**eliza-agent-runtime-11 · UNIMPLEMENTED · medium · `proactive-message` is in the event table and never published; a trigger's turn publishes nothing**
- develop: `packages/agent/src/services/client-chat-sender.ts:207`, `:318`; consumed at `alpha-develop/apps/app/src/runtime/local-agent.ts:162`.
- vibestack: `spec/agent/conversation/events.md:18` lists it; `conversation/events.vibe:225` publishes only `conversation-updated`, `:201` `system-notice`. `schedule/trigger-delivery.vibe:88` calls `processTurn` directly, so not even `conversation-updated` (`turns.vibe:402`) is sent. `alpha-vs` subscribes to no conversation feed.
- Impact: a scheduled prompt's reply appears only when the owner reopens the conversation.
- Smallest fix: publish `conversation-updated` from trigger delivery, and either publish `proactive-message` or drop it from the table.

**eliza-agent-runtime-12 · CHANGED · medium · The Calendar agenda source is read from `clientDevice`, and Alpha no longer sends it**
- develop: `alpha-develop/apps/app/src/runtime/connection-ui.tsx:3336`, `:3346` (`clientDevice: { context, calendarAgendaSource }`).
- vibestack: `packages/agent/src/device-actions/agenda.vibe:15`, `:25-31` needs `clientDevice.context` and `clientDevice.calendarAgendaSource`; `alpha-vs/apps/app/src/assistant/composer.vibe:372` sends neither.
- Impact: "what's on today" asked from the Calendar screen is never offered as an agenda read. Same split shape as gap 03.

**eliza-agent-runtime-13 · CHANGED · medium · `GET /api/auth/me` answers `mode: "local"` with no `session`; Alpha's native hosts require a machine session**
- develop: `packages/agent/src/api/auth-routes.ts:97`, `packages/app/src/api/auth-session-routes.ts:631` (`mode: "session"`, `session {kind:"machine", id, expiresAt}`).
- vibestack: `spec/agent/access/auth.md:94-95`, `packages/agent/src/access/auth.vibe:26-30` (`{identity:{kind:"owner", id: agentId}, access:{role:"OWNER", mode:"local"}}`). Alpha: `alpha-vs/android/app/src/main/java/ai/alphacompute/alphaphone/NativeOwnerReminderHost.java:75-79`.
- Impact: the native owner reminder host throws "Native owner session unavailable". Android is unbuilt (wave3 G), so this is latent.

**eliza-agent-runtime-14 · CHANGED · medium · An unstarted attempt is closed by any later success or proposal of the same action** (wave3 H, #40234 / draft #40245)
- develop: #40234, `plugins/plugin-assistant/src/services/message/egress-policy.ts` (supersession on target evidence only).
- vibestack: `spec/agent/conversation/planning.md:162-170`, `conversation/planning.vibe:107-124`. A receipted or receipt-less `Failed` is kept beside another target's success (OK); a `Rejected` (`executionStatus: "not_started"`) is closed by action name alone, so "couldn't text Alice: no number" vanishes once Bob's text is proposed.

**eliza-agent-runtime-15 · CHANGED · medium · The failure vocabulary collapsed from fifteen kinds to six**
- develop: `packages/contracts/src/contracts/chat.ts:96-112`, `:146-152`; phone copy at `alpha-develop/apps/app/src/runtime/connection-ui.tsx:1664-1683`.
- vibestack: `spec/agent/models/binding.md:241-256`, `conversation/turns.vibe:161-171`, `spec/agent/conversation/turns.md:196-204`. A context overflow is a refused request, so `provider_issue` with `planAction: "retry"` (`models/chat.vibe:296`), where develop said `context_overflow` and offered no Retry. A failure that is not an account failure (an action that throws, an empty reply) stores no reply and answers `error` `ASSISTANT_RESPONSE_UNAVAILABLE` (`message-service.vibe:235-247`, `turns.vibe:407`), where develop stored a typed terminal failure.
- Impact: Retry is offered where it cannot succeed; some failed turns leave an unanswered user row until the key is replayed.

**eliza-agent-runtime-16 · UNVERIFIED · medium · No agent rule is recorded in `spec/lock.json`, and the core turn specs have no proof or driver**
- `spec/lock.json` holds `spec/app/{echo,tally,words,index}.md` and `spec/index.md` only (last touched 2026-11-14). Proofs exist for 9 of 46 agent spec files (`access/routes`, `client/runtimeClient`, `conversation/events`, `deviceActions/capabilities`, `models/binding`, `notifications`, `plugins/bundle`, `schedule/triggers`, `storage/database`). Drivers: `packages/agent/test/drivers/` has 12; none for `conversation/turns`, `planning`, `turnContext`, `events`, `models/binding`, `host/*`, `tasks/*`, `voice/*`.
- Impact: turn admission, planning and failure mapping are checked only by hand-written tests; nothing shows the spec was accepted.

### Low

**eliza-agent-runtime-17 · CHANGED · low · View switching is model-chosen only; no direct routing and no Back**
- develop: `packages/agent/src/runtime/view-navigation.ts:125` (direct routing rule), `view-navigation-targets.ts:129-203` (explicit, compound, Back, page history), PRs #39882, #39898, #39899, #39942.
- vibestack: `views/show-action.vibe:56-69` (one `show` mode), `spec/agent/views.md:169`.
- Impact: "open Maps" costs a planner call; "go back" has no previous-view meaning. Whether the model still tells "open Maps" from a place request is not tested here.

**eliza-agent-runtime-18 · CHANGED · low · A used-up period allowance no longer carries its reset time on the reply**
- develop: `chat.ts:128-136` (`rateLimit` with `scope: "period"`, `resetAt`); `alpha-develop/apps/app/src/ui/cloud/subscription-presentation.ts:181-194`.
- vibestack: `spec/agent/models/binding.md:249-252` (allowance → `insufficient_credits`, no time), `turns.md:196-204`.

**eliza-agent-runtime-19 · MISSING · low · A tool's activity is named by its action name, not the app chosen** (wave3 B, I; #40195)
- vibestack: `conversation/planning.vibe:291` (`label: call.name`), `turns.vibe:268`.

**eliza-agent-runtime-20 · MISSING · low · No acknowledgement for a tool call still running after 400 ms** (wave3 B, I; #40196)
- develop: `plugins/plugin-assistant/src/services/message/delayed-acknowledgment.ts`. vibestack: no counterpart in `packages/agent/src/conversation`.

**eliza-agent-runtime-21 · MISSING · low · No prompt cache key is sent** (wave3 B, rest of #39984)
- develop: `packages/cloud/api/v1/chat/completions/route.ts:2727`. vibestack: `models/chat.vibe:501-523` builds the request without one. The ordering rule is present (`planning.md:56`).

**eliza-agent-runtime-22 · UNVERIFIED · low · The Stage 1 duplicate-source re-send has no counterpart** (wave3 H; #40213)
- vibestack has no Stage 1. `planning.vibe:172-182` re-sends only for a 429 or an unparsed tool call. Whether the single planner loop can produce the duplicate-source decision at all was not established.

## Contract mismatches with Alpha's port

Imports: every name `alpha-vs` imports from `@elizaos/agent`, `/client`, `/operations`, `/device-actions`, `/launch`,
`/voice`, `/cli` and `/bundle` exists in `eliza-vs` (checked against `packages/agent/package.json` exports and each
entry file). The mismatches are all on the wire.

| # | Alpha (`alpha-vs`) | Upstream (`eliza-vs`) | Effect |
|---|---|---|---|
| 1 | `assistant/composer.vibe:372` sends `metadata.clientDevice.browserPage`; `shell/assistantHost.vibe:92` never sets `browserPage` | reads `metadata.browserPage` (`turns.vibe:99`, `browser/src/proposal.vibe:98`) | Browser page never reaches the agent (gap 02) |
| 2 | sends `metadata.observation.location` only | Maps reads `metadata.clientDevice.context.location` (`maps/src/client/location.vibe:44`) | no phone position in Maps (gap 03) |
| 3 | sends no `clientDevice.context` or `calendarAgendaSource` | `device-actions/agenda.vibe:15` requires both | no agenda read (gap 12) |
| 4 | `payloads.schema.vibe:5-10` `ConversationRow.updatedAt?: string` | numbers (`conversations.vibe:54`) | list, create, fork unreadable (gap 04) |
| 5 | `payloads.schema.vibe:32-41` `SearchPage { messages: [{ id, ... createdAt?: string }] }` | `{ results: [{ messageId, conversationId, roomId, role, text, createdAt: number }], count }` (`history.vibe:112-114`, same as develop) | search always unreadable; Alpha's schema is the one that drifted |
| 6 | `payloads.schema.vibe:18-25` `HistoryRow.createdAt?: string`, `clientMessageId?`, `source?` | `{ id, role, text, timestamp }` (`history.vibe:71-76`) | no times, no stopped-turn match (gap 10) |
| 7 | `voice/conversation.vibe:353` `onStatus(activity, label?)` | `onStatus(activity)` (`client/stream-reader.vibe:9`) | label never supplied (gap 07) |
| 8 | `voice/conversation.vibe:367` reads `awaitingReview` on the done outcome | `DoneFrame` has no such field and frames decode with `onExcessProperty: "error"` (`reply-frame.schema.vibe:13-25`, `stream-reader.vibe:22`) | always false; a frame that carried it would be a protocol failure |
| 9 | `NativeOwnerReminderHost.java:75-79` wants `access.mode == "session"` and `session {kind, id, expiresAt}` | `access.mode: "local"`, no `session` (`auth.md:94-95`) | native owner host refuses (gap 13) |
| 10 | `assistant/transport.vibe:52-70` adds device headers inside its own transport | `TurnTransport` has no header parameter (`turn-controller.vibe:42-45`) | wave3 G (gap 05) |
| 11 | `workflows/automations.vibe:143`, `shell/overview.vibe:56` call `GET /api/automations` | no such route in any `eliza-vs` package (develop: `plugins/plugin-workflow/src/plugin-routes.ts:333`) | automations list unreadable (workflow slice) |
| 12 | `workflows/automations.vibe:156`, `:165`, `:232`, `:277` call `/api/lifeops/reminders`, `/api/lifeops/definitions[/{id}]` | no such routes; `packages/assistant/src/routines.vibe:174-215` serves `/api/personal-assistant/routines` | reminders and definitions unreadable (assistant slice) |
| 13 | `platform/owner-routes.json:143-163` allows `/api/lifeops/scheduled-tasks...`; the app calls `/api/scheduled-tasks...` (`workflows/automations.vibe:152`, `:239`, `:312`, `:324`) | serves `/api/scheduled-tasks` (`schedule/scheduled-task-routes.vibe:177-199`) | the phone's own allowlist refuses the route the agent serves |

Checked and matching: `/api/conversations/{id}/messages` and `/stream` body (`text`, `images`, `channelType`,
`metadata`, `clientMessageId`, `task`), `/api/turns/{room}/abort` with `{reason}`, the `/heard` body, `/api/status`
(`serverInstanceId`, `requestBodyLimit`), `/api/agents` (`status: "running"`), `/api/cloud/warm`,
`/api/views/interact-claim` and `interact-result`, `viewClientId` + `viewDelivery` in metadata,
`/api/approvals?state=all&limit=500`, `/api/notifications?nativeTransport=true&afterSequence=`, `/api/triggers*`.
`streamProtocol` is refused with 400 (`stream.vibe:208-213`); Alpha's port does not send it.

## Confirmed OK

`(p)` = route and rule found, handler not read line by line.

| Behaviour | Spec | Code |
|---|---|---|
| Token frames: append, whole-text snapshot at max(2048, last length), replace | `conversation/replyStream.md:129`, `:184` | `conversation/stream.vibe:87-91` |
| Exactly one `done` or `error` ends a stream | `replyStream.md:232` | `stream.vibe:92-99`, `:165-169` |
| A client that leaves aborts its turn | `replyStream.md:266` | `stream.vibe:154-184` |
| First frame of a new turn is `thinking`; refusals open no stream (409, 429, 503) | `replyStream.md:31-36` | `stream.vibe:197-204`, `:208-218` |
| Send admitted, joined, replayed or refused by `clientMessageId` | `conversation/turns.md:30`, `:70` | `turns.vibe:318-381` |
| After a restart a repeat replays; a cut turn is recorded aborted, never rerun | `turns.md:225` | `turns.vibe:343-378` |
| Turn deadline 180 s (develop `chat-routes.ts:939`) | `turns.md:159` | `turns.vibe:386` |
| Stop: `/api/turns/{room}/abort`, confirmed within 5 s else uncertain | `turns.md:245` | `turns.vibe:444-465`, `:528-536` |
| Client: a dropped stream is resent once, unstreamed, same key | `client/turns.md:186` | `client/turn-controller.vibe:203-212`, `:259-270` |
| Client: uncertain Stop refuses the next send once | `client/turns.md:21-136` | `turn-controller.vibe:243-247` |
| `failureKind`, `planAction`, `retryAfterMs` on `done` and on the buffered reply | `turns.md:196` | `turns.vibe:300-312`, `client/reply-frame.schema.vibe:13-25` |
| 429 re-send once, wait ≤ 5 s (#40037; develop `evaluator.ts:1121-1143`) | `conversation/planning.md:120-134` | `planning.vibe:163-182` |
| Unparsed tool call re-sent once | `planning.md:120` | `models/chat.vibe:323-328`, `planning.vibe:166` |
| The agent's handlers send no output cap unless the caller names one (#40174) | `models/binding.md:201` | `models/chat.vibe:496-511` |
| A stop at the model's own limit ends planning and is never re-sent | `planning.md:148` | `planning.vibe:158-161`, `:268-272` |
| No call before a rate limit's retry time | `binding.md:281` | `chat.vibe:458-461` |
| A failure of one target stays beside another target's success (#40234 core) | `planning.md:162` | `planning.vibe:107-124`, `:220-233` |
| Acknowledgement cue grammar, never the reply (#40028) | `planning.md:198-212` | `conversation/reply-text.vibe:13-52`, `planning.vibe:283`, `:308-325` |
| Per-turn parts follow the history, tools sorted by name (#39984 cache order) | `planning.md:56` | `message-service.vibe:181-191`, `planning.vibe:237` |
| History window taken once; host notices left out | `planning.md:102` | `message-service.vibe:79-83`, `:173-180` |
| At most eight steps; only launch-allowed registered actions | `planning.md:32` | `planning.vibe:76-87`, `:244` |
| An action may narrow its tool to the turn | `planning.md:82` | `planning.vibe:61-73` |
| Observation kept only when valid, ≤ 2,048 bytes | `conversation/turnContext.md:34` | `turn-context.schema.vibe:177-219`, `turns.vibe:102-109` |
| Location in the observation | `turnContext.md:111` | `turn-context.schema.vibe:28-33` |
| Browser page: valid, bound to the selected tab, ≤ 16,384 bytes, wrapped as external content (#40067 server half) | `turnContext.md:132` | `turn-context.schema.vibe:236-251`, `message-service.vibe:98-123` |
| Optional fields only to the compared process instance | `turnContext.md:268` | `turn-context.schema.vibe:337-352`, `host/status.vibe:58` |
| Voice view context validated, 400 when refused | `turnContext.md:204` | `turn-context.schema.vibe:264-292`, `turns.vibe:100-101` |
| Phone clock zone; an ungrounded time answer is replaced | `planning.md:293`, `:325` | `conversation/clock.vibe`, `message-service.vibe:166`, `:212` |
| Heard report moves the boundary only | `turns.md:286`, `:327` | `conversation/heard.vibe:35-64`, `turns.vibe:495` |
| Create and list conversations | `conversation/conversations.md:15`, `:67` | `conversations.vibe:133-147` |
| History: newest 200, older pages, `around` | `conversations.md:87-159` | `history.vibe:118-146` |
| Search route, develop's result shape | `conversations.md:174` | `history.vibe:91-116` |
| Fork at the owner's own message with `expectedText` (#39808) | `conversations.md:205`, `:227` | `conversation/fork.vibe:184-205` |
| Navigation claim lease 10 s, busy wait 4 s (#40025) | `views.md:141-153`, `:302-314` | `views/host.vibe:166`, `:193` |
| View prepare, claim, result routes | `views.md:111-235` | `views/routes.vibe:53-97` |
| VIEWS show bound to the turn's renderer | `views.md:169` | `views/show-action.vibe:30-55` |
| Turn evaluators after the stored reply | `planning.md:385` | `message-service.vibe:129-136`, `:230` |
| `conversation-updated` and `system-notice` published | `conversation/events.md:88`, `:215` | `events.vibe:201`, `:225`, `turns.vibe:296`, `:402` |
| Provider silent for 60 s ends the call | `binding.md:150`, `:166` | `chat.vibe:379`, `:428-432` |
| `/api/status` (`canRespond`, `lastCloudFailure`, `serverInstanceId`, `requestBodyLimit`) | `host/process.md` | `host/status.vibe:53-63` |
| `/api/auth/status`, `/api/health` (p) | `access/auth.md:89` | `access/router.vibe:40`, `:79-81` |
| `/api/cloud/warm`, `PUT /api/host/cloud-credential` (p) | `binding.md:338`, `:380` | `models/binding.vibe:179-180` |
| Approvals list and resolve (p) | `approvals.md` | `approvals/routes.vibe:59`, `:72` |
| Notifications list with native paging, read (p) | `notifications.md` | `notifications/routes.vibe:155-160`, `:199-204` |
| Triggers create, edit, delete, runs, execute (p) | `schedule/triggers.md` | `schedule/trigger-routes.vibe:201-242` |
| Scheduled tasks list, verbs, fire (p) | `schedule/scheduledTasks.md` | `schedule/scheduled-task-routes.vibe:177-199` |
| Route admission from one list, first registration wins (p) | `access/routes.md` | `access/routes.vibe:163-193`, `access/router.vibe:89` |
| Redact a message (new on vibestack) (p) | `conversations.md:268`, `:283` | `conversation/redact.vibe:74` |

Not applicable (21): #39697 Steward wallet credentials; #39888 Windows npm update; #39673 provisioning-profile prober;
#39993 relationships paging; #39892 app package manifests; #39648 Ollama endpoint (no on-device text model,
`binding.md:68`); #39695 sandbox containers; #39685 `autoEnableModule`; #39715 SSH runtime option; #39732 env names
(the launch document replaces them); #39733, #39735, #39737 Electrobun desktop; #39847 ElevenLabs voices; #39738
trajectory recorder; #39857 validation only; #39826 and the host half of #39930 (character presets and
`connectionFailedReply`: the product supplies the character in the launch document and the client words failures);
`streamProtocol: delta-v2` negotiation (removed; Alpha's port does not send it); `/api/auth/pair`, `pair-code`,
`logout` (remote pairing; the port is resident-only); `/api/conversations/:id/greeting`, `truncate`, `DELETE` message
(never called by `alpha-develop`).

## Not covered

- `packages/agent/src/device-actions/**` internals (excluded by the task); only its routes and the metadata it reads were checked.
- `packages/agent/src/voice/**` against develop `packages/host/src/voice/session.ts` (#39796, #39805 noise-turn rejection and partials); export names only.
- Maps navigation relay: develop `packages/agent/src/api/maps-navigation-relay.ts` (#39829, #39923, #39943, #39990) and `POST /api/client-devices/maps-navigation` moved to `packages/maps/src/relay.vibe`; not compared.
- `packages/agent/src/tasks/**`, `storage/**`, `bundle/**`, `host/process.vibe`, `host/launch*`, `plugins/**`, `schedule` internals, `notifications` and `approvals` internals: presence only. #39659 (torn quarantined task record) not traced into `tasks/store.vibe`.
- Generated code: `packages/agent/gen/` is absent, so no generated function was read and no test or check was run.
- Whether earlier turns' non-device action results still reach later turns' context (develop's "recorded outcomes", #40037); only the device-outcome note (at most six) was seen.
- SSE heartbeats: develop wrote `: heartbeat` (`conversation-routes.ts:5692`); vibestack writes none. Whether Alpha's resident stream has an idle timeout was not checked.
- A trigger's prompt is stored as a message of the owner entity (`turns.vibe:187-193`, `trigger-delivery.vibe:88`); develop's storage of a trigger prompt was not compared.
- The Cloud's 256 KiB chat body limit (`packages/cloud/src/services/chat.vibe:99`) against the agent's context size.
- `/api/auth/me` and notification reads in `NativeNotificationSession.java` and `AlphaLocalAgentPlugin.java` beyond the one mismatch listed.
- PR bodies for #40090, #40106, #40186 (plugin-assistant, wave3 A) and the device-tool rework of #39984.

## Skeptic verdicts

Checked 2026-11-22 against `eliza-vs` 769b4f00d, the seven `vibecut/w3-*` checkouts (agentcore 77f3af0a09c), `alpha-vs`, `alpha-develop` and `eliza-develop` 7a124190a1. Read-only; nothing built or run. "All w3" means the same lines were read in every w3 checkout.

- eliza-agent-runtime-01 · confirmed · `packages/cloud/src/services/chat.vibe:18-19`, `:51` always writes `max_tokens`; `chat-request.vibe:69` and `spec/cloud/services/inference.md:131-139` default it to 500; develop `route.ts:1707`, `:1729-1730`, `:2724-2726` forwards a cap only when named. Identical in all w3. Same gap as eliza-cloud-services-02. Upstream `origin/vibestack` (f3a6930177c) has merged f34bc2b6f2f, which replaces 500 with the model's `defaultMaxTokens` and refuses `ModelUnavailable` when a model has none; it is not in vibestack-dp, and `alpha-vs/cloud/src/profile.vibe` sets no `defaultMaxTokens`. The impact is masked today by eliza-cloud-services-01 (`chat-request.schema.ts:39-49` refuses `tools`, so a planner call is a 400 before any cap applies).
- eliza-agent-runtime-02 · confirmed · Agent reads only `metadata.browserPage` (`conversation/turns.vibe:99-110`, `turn-context.schema.vibe:328`, `packages/browser/src/proposal.vibe:98`); `spec/agent/conversation/turnContext.md:7` already states that location. Alpha nests it (`alpha-vs/apps/app/src/assistant/composer.vibe:372`) and `shell/assistantHost.vibe:92` never sets `peer.browserPage`, so `assistant/browser-page.vibe:13` returns no page at all. Unchanged in all w3. The fix is on Alpha's side; the spec half of the proposed fix is already done.
- eliza-agent-runtime-03 · in_flight_wave3 · `w3-agentcore/packages/maps/src/plugin.vibe:91-98` reads `readTurnContext(message).observation?.location`, and `messageLocation` is removed from `packages/maps/src/client/location.vibe` (commits 84a91b77f65, 2f0c6c5804f). `eliza-vs` still reads `clientDevice.context.location` (`location.vibe:44`, `:57-59`, `plugin.vibe:105`, `:419`).
- eliza-agent-runtime-04 · confirmed · `conversation/conversations.vibe:18-19`, `:54` answers numbers on list (`:146`), create (`:141`) and fork (`fork.vibe:201`); `spec/agent/conversation/conversations.md:30` types them `int`. `alpha-vs/apps/app/src/assistant/payloads.schema.vibe:9` wants `updatedAt?: string`, decoded at `conversations.vibe:21-22`. Develop sent ISO strings (`conversation-routes.ts:3366-3367`). Unchanged in w3-agentcore.
- eliza-agent-runtime-05 · confirmed · The behaviour is missing, but not where the auditor put it. Alpha's own `TurnTransport` already carries the headers (`alpha-vs/apps/app/src/assistant/transport.vibe:51-72`, `platform/resident-bridge.vibe:95-97`, `:153`); they are dropped at `alpha-vs/android/.../ElizaAgentService.java:238` (`AgentService.request(method, path, body)`) and upstream `packages/os/android/agent-service/.../AgentChannel.java:174`, `AgentSocketClient.java:160-162` (authorization only). No w3 checkout changes either. A fix exists only as uncommitted working-tree edits in `/home/shaw/.cache/vibemig/eliza-hdr` (branch `claude/vibestack-agent-request-headers`, based on `origin/vibestack`, 12 files including `AgentSocketClient.java:162` and `turn-controller.vibe:40-45`).
- eliza-agent-runtime-06 · confirmed · `conversation/stream.vibe:176` defines `writer.ready`; a search of `packages/agent/src` finds no caller, and `turns.vibe:396-397` wires only `append`, `restart`, `tool`. Rule at `spec/agent/conversation/replyStream.md:208`. Develop published it at `conversation-routes.ts:6094-6124`. No caller in any w3.
- eliza-agent-runtime-07 · confirmed · `client/reply-frame.schema.vibe:6-7` (`{activity}`, `{name}`), `stream.vibe:174` `writer.status` has no caller, and `planning.vibe:291` passes the raw action name. Develop's `ChatTurnStatus` carried `label`, `actionName`, `toolName` (`packages/contracts/src/contracts/chat.ts:30-45`). Unchanged in all w3. Tool frames are sent per tool (`turns.vibe:268`), so the row is not silent after `thinking`; it shows raw action names.
- eliza-agent-runtime-08 · confirmed · `planning.vibe:283` calls `onPlanningAcknowledgment`, `message-service.vibe:208` forwards it, and `turns.vibe:265-270` never supplies it. Same in all w3. The owning branch `claude/vibestack-ack-cache` (`/home/shaw/.cache/ack-vs/dp`, de3827c7e13) holds one commit, a spec-gen fix, and a clean tree: no acknowledgement work is committed anywhere I could read.
- eliza-agent-runtime-09 · confirmed · `models/chat.vibe:364`, `:404`, `:409`; no 32,768 or 65,536 in `spec/agent/models`. Same lines in all w3 and on `origin/vibestack` (`chat.vibe:332`, `:371`, `:376`). Develop has no such bound in `plugin-elizacloud/src/models/text.ts` or `plugin-openai/models/text.ts`; the phone accepted 200,000 (`alpha-develop/apps/app/src/runtime/local-agent-stream.ts:180`, `:201`).
- eliza-agent-runtime-10 · confirmed · `conversation/history.vibe:71-76` answers `id`, `role`, `text`, `timestamp` only; `client/stopped-turn.vibe:27-31` matches on a `clientMessageId` no row carries; `alpha-vs/.../payloads.schema.vibe:19-26` reads `createdAt`. w3-agentcore changes how stored text is read (17a050c0db0), not the row's fields.
- eliza-agent-runtime-11 · confirmed · `proactive-message` appears only in `spec/agent/conversation/events.md:18` and `packages/core/src/activity-plaintext.vibe:656`; `conversation/events.vibe:201`, `:225` publish the other two kinds; `schedule/trigger-delivery.vibe:88` calls `processTurn` directly, bypassing `updated(room)` at `turns.vibe:402`. Develop published it (`services/client-chat-sender.ts:207`, `:318`) and the phone consumed it (`alpha-develop/apps/app/src/runtime/local-agent.ts:162`). No w3 change.
- eliza-agent-runtime-12 · confirmed · `alpha-vs` never sends `calendarAgendaSource`: the only mention is a proposal payload field (`payloads.schema.vibe:48`), and `composer.vibe:372` sends `clientDevice` only for the Browser page. The agent half is in flight: `w3-agentcore/packages/agent/src/device-actions/agenda.vibe:15-30` (3d2b8a3e244) takes the observation from `metadata.observation` and needs only `clientDevice.calendarAgendaSource`. Alpha must still send it.
- eliza-agent-runtime-13 · confirmed · `access/auth.vibe:26-30` and `spec/agent/access/auth.md:94-95` answer `mode: "local"`, no session. Alpha's shim adds `session {id, expiresAt}` for a `native:` bearer (`alpha-vs/android/.../ElizaAgentService.java:227-231`), which satisfies `AlphaLocalAgentPlugin.java:1187-1189` but not `NativeOwnerReminderHost.java:75-79`: `mode` is still `local`, `session.kind` is absent, and `expiresAt` is recomputed on each call so it cannot equal the stored one. Latent while Android is unbuilt.
- eliza-agent-runtime-14 · confirmed · `spec/agent/conversation/planning.md:162-170` (`supersedes` closes a `Rejected` step by `actionName`) and `conversation/planning.vibe:107-124`. The same clause is in all w3. Draft #40245 is not in any local branch or checkout.
- eliza-agent-runtime-15 · confirmed · Six kinds at `conversation/turns.vibe:161-171` and `spec/agent/models/binding.md:243-256`; `models/chat.vibe:296` turns a 400 into the account's failure kind, which `failureOf` makes `provider_issue`, and `spec/agent/conversation/turns.md:207-211` gives that `retry`; `message-service.vibe:235-247` stores a reply only when a kind exists, else `turns.vibe:407` answers 503 `ASSISTANT_RESPONSE_UNAVAILABLE`. Develop: fifteen kinds, five retryable (`contracts/chat.ts:98-114`, `:146-152`). No w3 change.
- eliza-agent-runtime-16 · confirmed · `spec/lock.json` lists `spec/app/{echo,index,tally,words}.md` and `spec/index.md` only; 9 `*.proof.dfy` under `spec/agent`; 12 files in `packages/agent/test/drivers`, none for turns, planning, turnContext, events, binding; `packages/agent/gen` absent; 345 `###` rules. Correction: there are 37 agent spec `.md` files, not 46 (46 counts the 9 proof files too). w3-agentcore is the same.
- eliza-agent-runtime-17 · confirmed · `views/show-action.vibe:56-69` offers `VIEWS` with one `show` mode; no direct route and no back or previous-view meaning in `packages/agent/src/views` or `spec/agent/views.md`. No w3 checkout touches either. The w3-browser and w3-surfaces direct routes are for web addresses and photo commands, not views.
- eliza-agent-runtime-18 · confirmed · `spec/agent/models/binding.md:251` maps `CloudAllowanceExhausted` to `InsufficientCredits` and drops its time; no `resetAt` or `resetAfter` in `packages/agent/src` conversation, models or client, in `eliza-vs` or any w3. Develop carried it (`contracts/chat.ts:128-136`); the phone worded it (`alpha-develop/apps/app/src/ui/cloud/subscription-presentation.ts:188-194`). `alpha-vs/.../presentation.vibe:151` has no reset time to show.
- eliza-agent-runtime-19 · confirmed · `conversation/planning.vibe:291` sends `label: call.name`, and `turns.vibe:268` forwards only `actionName`. The same line is in all w3 (agentcore `:296`). Nothing for #40195 is committed on `claude/vibestack-ack-cache`.
- eliza-agent-runtime-20 · confirmed · No delayed acknowledgement in `packages/agent/src/conversation` of `eliza-vs` or any w3. Develop: `plugins/plugin-assistant/src/services/message/delayed-acknowledgment.ts:7` (400 ms). Nothing for #40196 is committed on `claude/vibestack-ack-cache`.
- eliza-agent-runtime-21 · in_flight_wave3 · `w3-agentcore/packages/agent/src/models/chat.vibe:494-498`, `:513-514`, `:522` and `conversation/planning.vibe:171-174`, `:258`, with the rule at `spec/agent/models/binding.md:236-253` (commit 09e01d7edaf). New hazard: the vibestack Cloud refuses any field outside its schema (`packages/cloud/src/services/chat-request.vibe:21-22`, `chat-request.schema.ts:39-51`, no `prompt_cache_key`), and the agent's cloud endpoint takes reasoning hints (`models/cloud-provider.vibe:13`), so once this lands every Qwen call through Alpha Cloud is a 400 `unsupported_field` until the Cloud accepts and forwards the key.
- eliza-agent-runtime-22 · not_applicable_to_phone · Develop's repair is real (`stage1-decision.ts:461-473`, `:1013-1040`): it guards against two `HANDLE_RESPONSE` decisions carrying source-backed reply parts. Vibestack's planner offers no decision tool: `HANDLE_RESPONSE` is defined in `packages/core/src/actions/to-tool.vibe:17`, `:165` and used by nothing in `packages/agent` or `packages/assistant`; `planning.vibe:237` builds tools from actions only, the reply is the model's plain text, and several tool calls in one step each run as an ordinary action (`:289`). The duplicate decision cannot be produced, so there is nothing to repair.
