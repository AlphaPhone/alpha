# Alpha Phone parity audit: `assistant`

Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-vs` (`vibestack-dp`, 769b4f00d), legacy pin `eliza-develop`.
Paths below are relative to those trees. `port:` means `alpha-vs/apps/app/`, `legacy:` means `alpha-develop/`, `up:` means `eliza-vs/`.

Read-only audit. Nothing was built, generated or run, so every finding is from reading source.

## Summary

| Class | Count |
| --- | --- |
| OK (spec rule and code both read) | 21 |
| CHANGED | 7 |
| MISSING | 9 |
| UNIMPLEMENTED | 3 |
| UNMODELED | 1 |
| KNOWN (in `docs/vibestack-open-items.md`) | 6 |
| UNVERIFIED | 3 |
| RETIRED | 0 |
| Vibestack-usage findings | 6 |

Verdict: **not at parity.** The domain core is a careful port: drafts, sends, Stop, the stopped-reply check, review custody, recovery, the location reader and the network fallback all have a spec rule and code that matches legacy closely. The gaps are at the edges, and several are severe:

- The chat card cannot be approved for most action families (gap 1).
- The port is written against upstream pin `c84e5d68e37`, 768 commits behind `vibestack-dp`. Against `vibestack-dp` the turn and proposal wire no longer match in four places (gaps 2 to 5), and at the pin itself upstream has no close-all tabs, no Browser page and no "no output cap" rule.
- Most of #1453 is not in the port (gaps 9 to 12). The port's spec cites #1450 but never #1453.
- A group of chat UI behaviours that legacy tested have no spec and no code (gaps 14 to 19).

## Gaps

Most severe first.

### 1. CHANGED: a chat card with a destination shows "Open" in place of "Approve"

- Behaviour: a pending action card offers Approve and Decline, and also names where it acts.
- Legacy: `legacy:test/action-message-presentation.test.mjs:16` ("pending review keeps its existing approve/cancel handlers and shows the destination once"); `legacy:apps/app/src/runtime/action-message-presentation.ts:164-165` relabels the approve row "Open" for a Browser open but keeps its approve handler.
- Port: `port:src/web/assistant/ActionCardView.tsx:58-60` renders `card.destination !== undefined ? <Button onClick={() => onOpen?.(card)}>Open</Button> : <Button ...>Approve</Button>`. `onOpen` only navigates (`port:src/web/assistant/ChatPanel.tsx:124`). `port:src/assistant/review.vibe:163-167,307` gives a destination to every card whose class has one in `destinationOf` (`port:spec/assistant/review.md:304-308`): reminders, notes, Calendar, Files, Photos, Camera, Browser, Maps, Settings. Families also name their own (`port:src/notes/operations.vibe:172-178`, `port:src/calendar/operations.vibe:138-161`).
- Only `OpenView`, `CommsAct` and `SettingsWrite` cards keep Approve. In Agent activity `onOpen` is not passed at all, so "Open" does nothing there (`port:src/web/assistant/AgentActivity.tsx:93-94`).
- The fixture `liveCard` has no destination, so the `.meta.tsx` play tests cannot see this (`port:src/web/assistant/fixtures.ts:11`). Service tests call `review.approve` directly.
- Impact: with "Ask before Alpha acts" on, a note save, Calendar change, reminder, Browser open, photo or Files action can only be declined from the chat.
- Smallest fix: `ActionCardView.tsx` shows Approve always and Open as a third control when `destination` is set; add a fixture card with a destination and a play test. The story in `spec/assistant/review.md:289-292` ("check ... before I approve") already says both.

### 2. CHANGED: against `vibestack-dp`, a reviewed proposal never joins its reply as a card

- Behaviour: a proposal the agent makes in a turn appears as a card with that turn's reply.
- Legacy: `legacy:apps/app/src/runtime/connection-ui.tsx:3403-3419` lists every pending review (`pendingReview`) and shows the ones not yet announced.
- Port: `port:src/assistant/review.vibe:519` lists only `proposal.requestMessageId === messageId`. `recoverCards()` runs only on conversation load and card expiry (`port:src/assistant/composer.vibe:154,170`).
- Upstream at `vibestack-dp`: `up:packages/agent/src/device-actions/proposal-review.vibe:97` omits `requestMessageId` when `terms.reviewed === true`; `up:spec/agent/deviceActions/index.md:376-392` ("A proposal carries the owner's message only for a live turn that asked for it directly"). At the port's pin `c84e5d68e37` the field was always present, which is what `port:test/assistant/fakes.vibe:32-35` still fakes.
- Impact once the pin advances: an ask-first proposal shows no card until the conversation is reopened.
- Smallest fix: `review.vibe` `directPass` also cards pending proposals with no `requestMessageId` that were not drawn before; rule in `spec/assistant/review.md` ("A card is listed only on the foreground ..."); add an unbound proposal to `test/assistant/assistant.test.vibe:70`.

### 3. MISSING: the turn never tells the agent the owner's direct-request preference

- Behaviour: with "Ask before Alpha acts" off, each turn carries `agentActionMode: "direct-request-v1"`.
- Legacy: `legacy:apps/app/src/runtime/connection-ui.tsx:3334-3335,3346`.
- Port: no occurrence of `agentActionMode` or `voiceUi` in `port:src` or `port:spec`. `port:src/assistant/composer.vibe:372` sends `{...context, ...viewFields, clientDevice}` only. The preference is used only client-side (`port:src/assistant/review.vibe:280-283,460`).
- Upstream: `up:packages/agent/src/device-actions/proposal/family.vibe:85-87` reads `voiceUi.agentActionMode`; `up:spec/agent/conversation/turnContext.md:204-218`.
- Impact: at `vibestack-dp` no proposal is ever bound to the message, so nothing runs directly (keypad, photo, Browser open, direct reads) whatever the setting. At the pin the client still runs direct, but the agent is not told.
- Smallest fix: `composer.vibe` adds `voiceUi: { agentActionMode, viewDelivery, uiClientId }` through `encodeTurnContext` when `asksBeforeActions()` is false; rule in `spec/assistant/review.md` under "A direct effect needs ...".

### 4. CHANGED (partly KNOWN): the Browser page is sent where upstream does not read it

- Behaviour (#1444): a turn sent with Browser in front carries the open page.
- Legacy: `legacy:apps/app/src/runtime/connection-ui.tsx:3314-3323,3345-3346` (`clientDevice.browserPage`).
- Port: `port:src/assistant/composer.vibe:372` sends `clientDevice: { browserPage }`; `port:spec/assistant/context.md:151-172`; `port:src/assistant/browser-page.vibe`; `port:src/browser/pageContext.vibe`; Settings switch `port:src/web/settings/PrivacyPages.tsx:71`.
- Upstream at `vibestack-dp`: `up:packages/agent/src/conversation/turns.vibe:99-110` and `turn-context.schema.vibe:337-344` read top-level `metadata.browserPage`, encoded by `encodeTurnContext({observation, browserPage}, peer)` and gated on `peer.optionalFields`, not on a separate `browserPage` status flag.
- KNOWN parts: "Fill the assistant's ports" (BrowserPages unfilled), "`AssistantHost.peer()` must set `browserPage`", and "there is no `clientDevice.browserPage`" in the open-items doc. The last bullet is out of date: the field exists upstream under a different path.
- Impact: even after the known wiring is done, the page never reaches the prompt.
- Smallest fix: `composer.vibe:351-352,372` passes `browserPage` into `encodeTurnContext` and drops `clientDevice`; fix the path in `spec/assistant/context.md:21,158`, `spec/browser/pageContext.md:4`, `src/assistant/ports.vibe:130`; `shell/assistantHost.vibe:92` sets `browserPage: sends`.

### 5. CHANGED: the phone's location is sent where upstream Maps does not read it

- Behaviour (#1418, #1441): "near me" searches around the position the message carried.
- Legacy: `clientDevice.context.location` (`legacy:apps/app/src/runtime/connection-ui.tsx:3317-3320,3346`).
- Port: `observation.location` only (`port:src/assistant/composer.vibe:349-351`).
- Upstream: the agent contract accepts `observation.location` (`up:packages/agent/src/conversation/turn-context.schema.vibe:42`), but Maps reads `metadata.clientDevice.context.location` (`up:packages/maps/src/client/location.vibe:44,57-60`, used at `up:packages/maps/src/plugin.vibe:105,419`). Nothing upstream copies one to the other.
- Impact: the location reaches the prompt text but a nearby Maps search finds no reported position and asks the phone instead.
- Smallest fix: upstream `messageLocation` reads `observation.location` (preferred, one line), or `composer.vibe` also sends `clientDevice.context`. Add the case to `test/assistant/journeys.test.vibe:268`.

### 6. MISSING: a turn names no open record except the Notes list, a Browser tab or a Maps selection

- Behaviour: the observation carries the selected record as an opaque id.
- Legacy: `legacy:apps/app/src/runtime/phone-context.ts:42-104` admits Calendar events and sources, reminders, notes, Files folders, own notifications, Settings section slugs, the SMS subscription, workflow runs and Maps objects; `legacy:test/context-selection.test.mjs`, `legacy:test/browser/context-selection.spec.ts`.
- Port: `port:src/shell/assistantHost.vibe:122-123` returns `observation: { view, revision, sensitive }` with no `selectedObject`. `port:src/assistant/composer.vibe:337-347` adds only `canonical-note-source`, `browser-tab` and `map-*`. `port:spec/assistant/context.md:5-6` mentions "the selected record" in prose, with no rule.
- Upstream still grounds on these kinds (`up:packages/notes/src/device-proposals.vibe:45-46`, `up:packages/agent/src/device-actions/proposal/families/surfaces.vibe:44,138`).
- Impact: "change this event", "share this note", "what is this photo" give the agent nothing to bind to. I did not check each area's own execution-time selection read, so the effect per family is UNVERIFIED.
- Smallest fix: a `selected()` member on `TurnSources` (`src/assistant/ports.vibe:110`) filled per area, plus a rule in `spec/assistant/context.md` under "Tell my agent what my screen shows".

### 7. MISSING: Notes folder names are not sent with the message

- Legacy: `legacy:apps/app/src/runtime/connection-ui.tsx:3341,3346` (`...notesFolders`), `legacy:apps/app/src/runtime/notes-folders.ts:25`.
- Port: no `notesFolders` in `port:src` or `port:spec`.
- Upstream reads it: `up:packages/notes/src/organize.vibe:19,111-112`.
- Impact: "move this note to Work" cannot resolve a folder by name.
- Smallest fix: `TurnSources.notesFolders()` filled from `NotesFolders`, added to metadata in `composer.vibe:372`; rule in `spec/notes/folders.md`.

### 8. MISSING: a quoted reply is display-only

- Legacy: `replyToMessageId` in metadata, checked against history first (`legacy:apps/app/src/runtime/connection-ui.tsx:3327-3328,3346`); `legacy:test/browser/message-reply-edit.spec.ts` (10 tests).
- Port: the quote lives only on the local row (`port:src/assistant/composer.vibe:357-359`); nothing is sent. `port:spec/assistant/conversation.md:147` models who may be quoted, not what the agent receives.
- Upstream `vibestack-dp` has no reply-to field in `turns.vibe` or `turn-controller.vibe`.
- Impact: the agent cannot tell which message "this" refers to.
- Smallest fix: upstream turn body field first, then `composer.vibe` sends it; rule in `spec/assistant/conversation.md`.

### 9. MISSING (#1453): closing every tab still says "Closed all tabs." and is bound to titles

Four parts of commit 2dcfd18ee, none in the port:

- Receipt counts what closed and says private tabs were left open: `legacy:apps/app/src/runtime/action-message-presentation.ts:49-58`. Port: `port:src/browser/operations.vibe:209` returns `"Closed all tabs."`.
- Card states how many private tabs stay open, and only-private says so instead of "No tabs are open to close.": `legacy:apps/app/src/prototype/browser-adapter.ts:338-339,781-790`. Port: `port:src/browser/operations.vibe:23,123-126`.
- The listing is bound to id, page address and private flag, not titles: `legacy:.../browser-adapter.ts:343-346`. Port: `listedOf` includes `title` and `listingCurrent` compares whole records (`port:spec/browser/session.md:770-779`), so a tab that only retitles itself refuses an approved close-all.
- A deferred presentation that did not run gets a correction notice: `legacy:.../action-message-presentation.ts:62-82` (`runBrowserPresentation`, `browserControlNotDone`). Port: `port:src/browser/operations.vibe:219-224` forks the presentation and reports nothing; no such copy exists.
- Impact: a receipt can claim a switch, close or history step that never happened.
- Smallest fix: `spec/browser/session.md` (listing key without title, a `closed` count on `Done`), `src/browser/operations.vibe` `summarize`/`present`, a notice row from `review.vibe` `presented`.

### 10. MISSING (#1453): a turn's own view steps do not wait for its reply and its own navigation

- Legacy: `holdTurnViewSteps`, `requestHoldsViews`, `followsTurnContext` (`legacy:apps/app/src/runtime/alpha-client.ts`, diff of 2dcfd18ee); `legacy:test/alpha-client-after-request-settles.test.mjs`, `legacy:test/browser/agent-keypad-direct.spec.ts`.
- Port: only the #1433 behaviour, a wait until the send is no longer typing (`port:src/assistant/call-facts.vibe:36-46`). The direct pass runs first (`port:src/assistant/composer.vibe:473`), then the prepared view (`:483`), and `views.deliver` requires `screen.contextKey === contextKey` of the screen the turn was sent from (`port:src/assistant/views.vibe:103-106,134`).
- Impact: a message that both opens the keypad and prepares a screen change drops the screen change. Legacy's bug was the reverse order; neither order is modelled.
- Smallest fix: a rule in `spec/assistant/views.md` for the order, and `composer.vibe` delivers the view before `directly`, counting the turn's own switch as current.

### 11. MISSING (#1453): the contact review card (telephony slice, reported here because the brief names #1453)

- Legacy: change words "Remove / Add / Keep / Rename from", the "Only the first N matching contacts are shown" note, exact-number twin lookup (`legacy:apps/app/src/prototype/telephony-review.ts`, `legacy:apps/app/src/runtime/telephony-executor.ts`, diff of 2dcfd18ee).
- Port: a name-based twin check only (`port:src/telephony/actions.vibe:286-289`); no match for the change words, the note or a one-past-the-limit read in `port:src/telephony`, `port:src/web/telephony` or `port:spec/telephony`.
- Smallest fix: `spec/telephony/actions.md` and `src/web/telephony/ReviewRows.tsx`. The telephony auditor should confirm.

### 12. UNVERIFIED (#1453): a voice conversation kept when its Messages draft step opens the thread

- Port carries a voice turn through `voice.followScreen` (`port:src/shell/assistantHost.vibe:137-146`), a different design from legacy's navigation hold. I did not read `src/voice/conversation.vibe` to confirm that a second context change on the claimed view is tolerated.

### 13. CHANGED: a message typed on a private screen is sent

- Legacy: refused with "Not sent. Agent observation is paused on this screen." and the text stays (`legacy:apps/app/src/runtime/alpha-client.ts:483`, `legacy:test/browser/all-view-context.production.spec.ts:57-71`).
- Port: sent with no observation; the test asserts `posted: 1` (`port:test/assistant/journeys.test.vibe:303-314`). `composer.vibe:298` ignores a refused `client.send` and carries on with `bound = false`.
- The spec contradicts itself: `port:spec/assistant/conversation.md:21,41` (`canSend` needs `not(c.sensitive)`) against `port:spec/assistant/context.md:126` ("A private screen sends the message with no observation").
- Impact: a prompt typed over Passwords now leaves the phone (without screen context).
- Smallest fix: owner decision, then one of the two rules goes; `composer.vibe` returns before `sends.send` when `!observed` if legacy wins.

### 14. MISSING: the open conversation is not restored after a restart

- Legacy: per-owner selection persisted (`legacy:apps/app/src/runtime/conversation-selection.ts:5-27`); `legacy:test/browser/conversation-selection-storage.spec.ts` (10 tests); "reconnecting restores the saved remote conversation" in `legacy:test/browser/chat-continuity.spec.ts`.
- Port: no persisted selection. On first sign-in `port:src/assistant/assistant.vibe:156-162` calls `composer.open(null, true)` because the transcript's conversation is still null.
- Impact: every app start is a new chat; the last one is two taps away in Agent activity.
- Smallest fix: a rule in `spec/assistant/conversation.md`, an owner-keyed stored id read in `assistant.vibe` `followShell`.

### 15. UNIMPLEMENTED: older messages cannot be loaded

- `Composer.older()` exists (`port:src/assistant/composer.vibe:545-552`) and has no caller in `port:src/web`. Legacy pages back to the first message (`legacy:apps/app/src/runtime/connection-ui.tsx:1867-1882`; "a restored conversation longer than the chat window scrolls up to its first message").
- Smallest fix: `Transcript.tsx` gets a top sentinel or "Earlier messages" control when `hasMore`.

### 16. MISSING: the transcript does not keep a reading position or follow the newest message

- Legacy: `legacy:test/browser/message-actions.spec.ts` ("transcript keeps the older reading anchor and follows only bottom or a new user turn"; "... survives a keyboard resize, Back from full and HOME then reopen").
- Port: `ChatPanel.tsx:117` is a bare `ScrollArea`; no scroll code in `port:src/web/assistant`.
- Smallest fix: rule in `spec/assistant/reply.md`, code in `ChatPanel.tsx`.

### 17. MISSING: message Copy, text selection and the message actions menu

- Legacy: 13 tests in `legacy:test/browser/message-actions.spec.ts` (exact clipboard bytes, copy denial, long-press, keyboard navigation, drag selection across messages).
- Port: Reply, Edit and Listen icon buttons only (`port:src/web/assistant/Transcript.tsx:85-88,102-107`); no clipboard use in `port:src/web/assistant` or `port:src/assistant`.
- Smallest fix: rule in `spec/assistant/conversation.md`, a Copy button in `Transcript.tsx`.

### 18. MISSING: links in chat messages are plain text

- Legacy: message text is split into link and plain parts, links tappable and highlighted (#1286, `legacy:apps/app/src/prototype/template.html`, commit fd9baa6b5).
- Port: `port:src/web/assistant/ReplyText.tsx:48` and `Transcript.tsx:81` render plain `<p>`.
- Smallest fix: rule in `spec/assistant/reply.md`, link parts in `reply-lines.vibe`.

### 19. UNIMPLEMENTED: stored system notices are shown in protocol wording

- `systemNoticeText` (`port:src/assistant/presentation.vibe:218-224`) has no caller; `historyRows` shows `message.text` raw (`port:src/assistant/transcript.vibe:116-117`). Legacy: `legacy:test/system-notice-collapse.test.mjs` (7 tests, product-neutral wording, "worded for whether the owner was waiting").
- Smallest fix: `transcript.vibe` `historyRows` maps recognised notice texts through `systemNoticeText`.

### 20. UNMODELED: shell code overrides or hard-codes what the generated model should decide

- `port:src/assistant/composer.vibe:298`: a refused conversation `send` does not stop the turn.
- `port:src/assistant/review.vibe:350` (`exact: true`), `:439` (`reserve exact: true`), `:462` (`review visible: true`): facts the custody model guards on are constants.
- Smallest fix: feed the real screen and reservation facts, or drop the fields from the model.

### 21. CHANGED (minor): empty chat and "agent chose not to reply"

- Legacy names the missing agent in an empty conversation (`legacy:test/action-message-presentation.test.mjs`, last test). Port always shows "Ask me anything." (`presentation.vibe:65`, `ChatPanel.tsx:120`).
- `copy.ignored` has no caller; an empty settled reply renders an empty row with its controls. UNVERIFIED whether upstream still returns an empty reply for an ignored turn.

### 22. KNOWN items confirmed in this slice

- Voice cue (#1450): spec and `cue.vibe` exist, but it never speaks because `StatusFrame` has no label, and `replyReady()` is a no-op before a cue ("Upstream agent/client" and "Assistant" bullets). `ackLimit` 120 against legacy 160 (owner bullet).
- `BrowserPages`, `MapsViews`, `BrowserViews`, `AdvertisedCapabilities` unfilled; no capability header ("Shell (integration)").
- Device headers, enrollment refusal and the "Chat only" reason ("Shell (integration)").
- `calendarAgendaSource` not sent ("Assistant").
- Shared-note read-reply lease: rule at `port:spec/assistant/approvals.md:174`, no upstream support ("Upstream agent/client").
- Stale reply keeps its text; #1128 Home pill; history counts; generic action name (owner bullet "Assistant behaviour choices").

### 23. Upstream pin (partly KNOWN)

- `port:upstream.lock.json` pins `c84e5d68e37`. At that commit `git grep` finds no `close-all`, no `browserPage` and no "sends an output cap only" rule anywhere in `spec` or `packages`. All three exist at `vibestack-dp`: `up:spec/browser/control.md:63-87`, `up:packages/agent/src/conversation/turn-context.schema.vibe:73`, `up:spec/agent/models/binding.md:201`.
- So #1443, #1444 and #1448 are only real once the pin moves, and gaps 2 to 5 arrive with the same move. The open-items doc asks only to move past `c8f273cec1b`.

## Vibestack usage

- No `.proof.dfy` anywhere under `port:spec` (`find spec -name '*.dfy'` is empty). Legacy proved `chat-overlay-motion-adapter.dfy` (sheet height and release detent), `context-selection.dfy` and `edit-receipt.dfy`. The dock height law is a Quint `law` in `spec/assistant/dock.md:180` only.
- No assistant driver in `port:test/drivers` (ten drivers, none `assistant__*`), and no test in `port:test/assistant` imports conformance cases; they call generated pure functions and services directly.
- Every `###` rule in `spec/assistant/*.md` has a Quint block with at least one `law`/`always`/`sometimes`/`step` name (awk scan, not a parse).
- No `.meta.tsx`: `AgentActivity`, `AssistantDock`, `AssistantScreen`, `ChatPanel`, `ChatSearchPanel`, `ContentQuestionReview` (`port:src/web/assistant`). Not in the open-items "No meta file" bullet.
- `scripts/legacy-retirement.json` maps these to `spec/assistant/index.md`, which has no such rule: `CopyReceipt.qnt`, `ReviewedCopies.qnt`, `NativeHostedResultNotices.qnt`, `CloudConnectionNotices.qnt`, `DrawerInteraction.qnt`, `NativeActionRecovery.qnt`, `CoreTurnControllers.qnt`, `NoticesAndCaches.qnt`, `ChatInput.qnt`. `VideoEditReview.qnt` and `NativeDeletionReviewAdmission.qnt` map to `review.md`, also wrong. `ReadReplyLease.qnt` maps to `reply.md`; the rule is in `approvals.md`. Video and photo edit do exist in `spec/camera/videoEdit.md` and `edit.md`.
- All 61 legacy root tests of this list are still in `port:test/`, and the ones I opened import modules the port removed (`test/network-location.test.mjs:9` loads `apps/app/src/runtime/...`; `test/agent-launch-token-budget.test.mjs:29-39` reads `vendor/eliza/packages/core/...`). `port:src/runtime` and `port:src/prototype` do not exist. The open-items doc lists only three such test groups.

## Confirmed OK

Spec rule and code were both read for these.

| Behaviour | Legacy | Spec rule (`port:spec/assistant/`) | Code (`port:src/`) |
| --- | --- | --- | --- |
| #1418 location only with setting, permission, non-private screen, declaring peer; never prompts; turn never waits | `runtime/phone-location.ts:49-110` | `context.md:31` | `assistant/location.vibe:38-133`, `composer.vibe:334` |
| #1441 network fallback: warm-up only, 15 min reuse, 1 h unchanged, 2 min back-off, shared with Maps | `runtime/network-location.ts:11-65` | `context.md:95` | `assistant/network-location.vibe`, `location.vibe:119-128`, `composer.vibe:123`, `maps/networkLocation.vibe`; `android/.../AlphaNetworkLocationPlugin.java` |
| Coordinates rounded to 1e-5, accuracy to meters | `phone-location.ts:29-36` | `context.md:16-19,58` | `location.vibe:27-33` |
| #1443 close-all: one itemized card, approved only from the latest listing, executor closes exactly the listed tabs | `ui/device-actions/client-coordinator.ts`, `prototype/browser-adapter.ts` | `review.md:267`; `spec/browser/session.md:757-835` | `assistant/review.vibe:333-344,383,549`, `browser/operations.vibe:179-218`, `browser/agent.vibe:257-284` |
| #1444 page read rules, Settings switch, get-text refusal wording | `runtime/browser-page-context.ts` | `context.md:151`; `spec/browser/pageContext.md` | `assistant/browser-page.vibe`, `browser/pageContext.vibe`, `web/settings/PrivacyPages.tsx:71`, `browser/agent.vibe:229-236` (wire path: gap 4) |
| #1448 no output cap | pin a3a19afd17 | upstream `up:spec/agent/models/binding.md:201`, `up:spec/core/models.md` | no cap setting in `alpha-vs/android` (grep) |
| #1450 cue held 300 ms, dropped for a ready reply, audible one bounded at 2.5 s | `runtime/local-agent-stream.ts` | `reply.md:111` | `assistant/cue.vibe` (never fed: gap 22) |
| Composer send holds text; refused send restores it ahead of newer typing | `test/browser/chat-continuity*.spec.ts` | `send.md:21,82`, `draft.md:90,111` | `composer.vibe:291-306,397-410` |
| Send that may have reached the agent stays, unconfirmed | same | `send.md:104` | `composer.vibe:241-244,431-438` |
| Stop: one cancel, one later check, notice wording | same | `stoppedReply.md:21,66` | `composer.vibe:203-229,417-428` |
| Restart mid-send offers review, never resends | same | `draft.md:149` | `ChatPanel.tsx:147`, `composer.vibe:278-281` |
| Edit forks the conversation, refused when the fork fails | `test/browser/message-reply-edit.spec.ts` | `conversation.md:147` | `composer.vibe:310-326`, `conversations.vibe:72-77` |
| Attachment waiting blocks a chat switch | `test/chat-tools-history.test.mjs` | `search.md:46`, `attachments.md:19` | `composer.vibe:527-532` |
| Failure text, live wait, plan card | `runtime/connection-ui.tsx:3374-3393` | `reply.md:140,171,195` | `composer.vibe:440-447`, `presentation.vibe:103-175` |
| Wrong number gets a notice and a reject | `client-coordinator.ts` | `review.md:209` | `review.vibe:535-542` |
| Browser opens directly only for a typed address; a page link keeps its card | #1420, #1444 | `review.md:235` | `review.vibe:456-465,536-537` |
| Decline, expiry, emergency hold | `test/browser/chat-decline.production.spec.ts` | `approvals.md:122,142` | `review.vibe:375-432`, `composer.vibe:161-171`, `ActionCardView.tsx` |
| Recovery listing once per key; unlisted cards become unavailable | `PendingActionRecovery.qnt` | `recovery.md:22,46` | `composer.vibe:175-194` |
| Workflow-bound proposal never carded, runs from its step review | `DeviceActionReview.qnt` | `review.md:344` | `review.vibe:496-509,527-530` |
| Prepared view opens once under a claim; view commands refused under ask-first | `runtime/alpha-client.ts` | `views.md:26,73` | `views.vibe:123-181` |
| Hosted provider disclosure; expiry clock text; unsynced receipt wording | `action-message-presentation.test.mjs` | `context.md:231`, `receipts.md:62` | `ChatPanel.tsx:139`, `presentation.vibe:188-215` |

## Not covered

Spec files exist for all of these, but I did not read their code against legacy:

- `spec/assistant/dock.md`, `detents.md` against `legacy:test/browser/full-chat-grabber.spec.ts` (20 tests), `quint-chat-dock*.test.mjs`, `ChatDock.qnt`.
- `attachments.md` and `src/assistant/attachments.vibe`, `files-bridge.vibe`, `image-encode.ts` against `chat-attachment-picker.spec.ts`, `dev-message-attachments.spec.ts`, `attachment-lifecycle.spec.ts`, `resident-attachment.test.mjs`, `ChatAttachments.qnt`, `ResidentAttachmentTest.java`.
- `search.md`, `emailCard.md` (and `journey-f-reviewed-send.spec.ts`, 14 tests), `firstSend.md`, `suggestion.md`, `withdrawal.md`, `decision.md`, `entry.md` (`NativeAssistantEntry.qnt`, `assistant-surface-close.spec.ts`), `noticeQuestion.md` (`OwnNoticeQuestion`, `HostedNoticeQuestion`, `ShadeNoticeQuestionAdmission`).
- `receipts.md` in depth: `quint-forward-receipts`, `turn-effect-state`, `NativeActionRecovery.qnt`, `alpha-client-consumed-approvals.test.mjs`, and the legacy history projection (`action-message-presentation.ts` cold-history and cross-turn collapse, about 15 tests).
- Mail attach to chat (`context-selection.spec.ts` "mail" group, including the two-minute refusal) in `src/inbox/reader.vibe:286`.
- Composer focus and keyboard (`composer-send-focus.spec.ts`, `explicit-send.spec.ts`, #1290, #1298), `ComposerBar.tsx`.
- The legacy pre-send "Phone offline" refusal (`connection-ui.tsx:3304-3308`).
- `google-workspace-return*.test.mjs` (18 tests), `workspace-return-fallback`, `redaction-connection-switch`, `local-conversation-cleanup`, `development-conversation-stream`, `error-notice`, `agent-context-audit` (13 tests): listed under assistant, not opened.
- Notice models that belong to other areas: `DeletionNoticeFence`, `NativeDeletionReviewAdmission`, `NativeHostedResultNotices`, `CloudConnectionNotices`, `HomeFailureNotice`, `DrawerInteraction`, `ReviewedCopies`, `CopyReceipt`, and their tests and Java fixtures.
- Android: `AlphaNetworkLocationPlugin.java` and `NetworkLocationQuery.java` were checked for presence only, not diffed against develop.
- `upstream eliza-vs/packages/assistant/**` (reminders, check-ins, follow-ups): not read; nothing in the legacy lists pointed there.
- #1453 parts in `voice-adapter.ts`, `sms-adapter.ts`, `phone-adapter.ts`, `contacts-adapter.ts` (gaps 11 and 12 are only spot checks).
- #1454 (review doc only) not checked.

## Acknowledgement wire after the repin (from the #1458 author, 2026-11-23)
On the repinned wire (vibestack-dp ≥ 1ff497fc4f0), simplify the no-frame tool-text fallback away. It is not a supported path: the agent always clears streamed text before tools and ships in the same release. When simplifying, keep these invariants:
1. One acknowledgement per turn, and it comes only from the `acknowledgment {text}` frame.
2. The frame stays the working label until text or the reply arrives. A tool label or status must not overwrite it.
3. Voice speaks the frame at once. A cue that is not yet audible is dropped only by `reply_ready` or by the end of the turn, never by the first streamed text.
4. No 300 ms hold.
Run apps/app/test/assistant/journeys.test.vibe and test/voice/acknowledgement.test.vibe. Report each result separately for: (a) the frame is taken once, kept out of the answer and shown as the working label; (b) the old no-frame fallback case (update or remove it to match the simplification, and say which); (c) no second acknowledgement whether the frame or the fallback comes first.
