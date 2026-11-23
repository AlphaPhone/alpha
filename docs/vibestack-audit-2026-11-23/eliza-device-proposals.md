# eliza-device-proposals: PROPOSE_DEVICE_ACTION, develop 7a124190a1 vs vibestack-dp 769b4f00d

Trees are under `/home/shaw/.cache/vibeaudit/`: `eliza-develop`, `eliza-vs`, `alpha-vs`, `alpha-develop`.
Develop paths are relative to `eliza-develop/plugins/plugin-assistant/src/services/device-actions/` unless they start with `packages/` or `plugins/`.
Vibestack paths are relative to `eliza-vs/`. Nothing was built or run; every finding is from reading both sides.

## Summary

- Verdict: **not at parity.** The port is broad (67 of develop's 75 wire types, every route, the request machine, telephony and Browser grounding, read completion, workflow offers), and every rule has Quint. Three gaps stop device actions on the phone outright or leave them in the wrong state, and six more remove something the owner used.
- Counts: 31 OK, 5 not applicable, 17 gaps (3 high, 7 medium, 7 low). 2 of the 17 are already in `wave3.md` (A, G).
- PRs since 2026-11-13 touching the slice: 27 first-parent merges. All but the keypad/contact-show/contact-read parts of #39882 and #39930, the draft form of #39842/#39920, and the core legend of #40186 have a counterpart.
- Highest risk, in order: the not-dispatched receipt code (gap 01), device headers on the native socket (02, wave 3 G), one-time enrollment (03).

## Gaps

### eliza-device-proposals-01 (high, CHANGED): a "never dispatched" receipt no longer settles the request
- Develop: the phone reports `code: "DEVICE_NOT_DISPATCHED"` (`client-coordinator.ts:4021`, `:2691`), and the agent settles it as done with no effect (`service.ts:3851-3855`, `:4129-4134`).
- Vibestack: the server still expects `DEVICE_NOT_DISPATCHED` (`packages/agent/src/device-actions/operations.schema.vibe:96`, `codeOf` just below it). The upstream client constant is `NOT_DISPATCHED = "not_dispatched"` (`packages/agent/src/client/device-execution.vibe:86`, sent at `:291`). The upstream test hides the difference by translating it in its own adapter (`packages/agent/test/device-execution.test.vibe:80`).
- Alpha's port sends the client constant unchanged: `alpha-vs/apps/app/src/assistant/review.vibe` `wireReceipt` passes `code` through, and Calendar, Clock, Maps and Notes executors all refuse with `NOT_DISPATCHED`.
- Impact: every attempt the phone refuses before dispatch (screen not allowed, record not current, attempt retired before the call) is read as an ordinary failure. For telephony and Clock the receipt is refused with 409 (a failed receipt without a typed result is only admitted with the not-dispatched code), so the request stays `executing` and the phone re-uploads it on every sync. For reads, edits and base operations it becomes `reconciliation_required`, so the owner is asked to confirm something that never ran. A workflow step waiting on it ends `DEVICE_STEP_UNKNOWN`.
- Smallest fix: make the client constant the wire code (export `notDispatchedCode` as `NOT_DISPATCHED`) and delete the translation in the test adapter. Alternatively map it in Alpha's `wireReceipt`.

### eliza-device-proposals-02 (high, CHANGED, wave 3 G): device headers never reach the agent over the Android private socket
- Develop: every request carries `X-Eliza-Device-Id`, `X-Eliza-Device-Key` and `X-Eliza-Device-Capabilities` over HTTP (`packages/agent/src/api/device-action-routes.ts:61-99`).
- Vibestack: `packages/os/android/agent-service/src/main/java/ai/eliza/os/agent/AgentSocketClient.java:160-164` builds only `authorization` and `content-type`; `TurnTransport` has no header argument (`packages/agent/src/client/turn-controller.vibe:42-45`). The agent needs the id and key (`packages/agent/src/device-actions/enrollment.vibe:65-68`) and the capability header (`packages/agent/src/device-actions/proposal/turn.vibe:60-62`).
- Impact: on the phone's native channel, registration answers 401, no turn is a device turn, and `PROPOSE_DEVICE_ACTION` is never offered.
- Fix: as wave 3 G says, header support in `TurnTransport` and `AgentChannel`.

### eliza-device-proposals-03 (high, CHANGED): an agent store enrolls one device key, for one owner, once
- Develop: one row per (agent, subject user, installation id); a new install picks a new installation id and enrolls again (`service.ts:2136-2170`).
- Vibestack: the installation id is the agent id; a second key, another owner or any registration after a revoke is refused for good (`spec/agent/deviceActions/index.md:31-39`, `canRegisterDevice` at `:60`, `:66`; `packages/agent/src/device-actions/enrollment.vibe:67`, `:96-97`). The test asserts 409 for another key and for both keys after a revoke (`packages/agent/test/device-enrollment.test.vibe:60-62`, `:80-84`).
- Impact: if an agent store outlives its first key or owner (a Cloud-hosted agent after a reinstall or a new phone, a cleared secure slot, or a launch whose account user id appears after the first enrollment), registration answers `registration_refused`. Alpha's port then falls back to chat only (`alpha-vs/apps/app/src/account/enrollment.vibe:193-198`) with no way back. I did not establish how long the phone's stores live relative to each other, so the reach of this is unverified; the rule itself is confirmed.
- Smallest fix: let an owner-authenticated registration with a new key replace the enrollment (retiring open offers, as revoke does), and let a revoked store enroll again.

### eliza-device-proposals-04 (medium, MISSING): keypad, show-contact and read-open-contact are gone, and an emergency request no longer opens the keypad
- Develop: `phone_keypad`, `contact_show`, `contact_read_selected` with `phone.keypad.v1`, `contacts.show.v1`, `contacts.read.v1` (`packages/contracts/src/telephony-actions.ts:479-590`, `:834-875`; `action.ts:1042`, `:1086`, `:1345`; keypad routing `tools.ts:957-980`). An emergency request opens the keypad (`telephony-target-grounding.ts:110-112`). `contact_read_selected` is also a completable read (`packages/contracts/src/native-notes-query.ts:232-246`).
- Vibestack: none of the three is in the vocabulary (`spec/agent/deviceActions/operations.md:27-40`), and the spec says so on purpose (`spec/agent/deviceActions/telephony.md`, "There is no keypad operation… no contact is shown or read"). An emergency request is a text refusal (`packages/agent/src/device-actions/proposal/families/telephony.vibe:55`).
- Alpha still carries the executors and advertises the capabilities, which the agent never offers (`alpha-vs/apps/app/src/telephony/actions.schema.vibe:7-11`, `actions.vibe:327`, `:381-392`).
- Impact: "open the keypad", "show Sam in my contacts" and "what's this contact's email" no longer work from chat; "call an ambulance" gets a sentence in place of the keypad.
- Fix: add the three operations, capabilities and forms to the telephony family, or remove Alpha's dead executors and accept the change.

### eliza-device-proposals-05 (medium, CHANGED): a Messages draft is no longer distinguishable from a reviewed send
- Develop: `sms_compose` has a `target` form (contact or exact number) with `draft: true` and `replyThreadId`, under `sms.compose.v2` (`packages/contracts/src/telephony-actions.ts:598-690`, `:701-712`). An addressed draft request becomes `{target, body, draft: true}` and is refused on a phone without v2 (`service.ts:2718-2777`). A draft result cannot report a send (#39842).
- Vibestack: one form `{query, body}` (`packages/agent/src/device-actions/operation-schemas/telephony.vibe:146`; form at `proposal/families/telephony.vibe:76`); an addressed draft becomes `sms_compose` with `query` set to the name or the number's dial form (`addressedDraft` in the same file); the thread id is dropped by design.
- Alpha's executor reads `query` as a contact search, then sends after the owner picks a number, and only drafts when that thread is already open (`alpha-vs/apps/app/src/telephony/actions.vibe:249-273`, `numbersOf` at `:185`).
- Impact: "draft a text to Sam saying…" ends as a send card unless Sam's thread is open; a draft or text to a typed number that is not a contact answers `not-found`; "draft a reply to them" loses its thread.
- Fix: restore the `target`/`draft`/`replyThreadId` form and `sms.compose.v2`, or state in the spec that `sms_compose` never sends and change Alpha's executor to match.

### eliza-device-proposals-06 (medium, MISSING): a photo can no longer name its camera
- Develop: `lens: front|back` under `camera.capture-lens.v1`; the camera the owner named is the one that shoots (`camera-contract.ts:5-46`, `service.ts:2921-2936`, `action.ts:1669-1683`). Legacy Alpha advertised it (`alpha-develop/apps/app/src/runtime/phone-context.ts`, `selectDeviceCapabilities`).
- Vibestack: `camera_capture_photo` has no fields (`packages/agent/src/device-actions/operation-schemas/device.schema.vibe:20`; `spec/agent/deviceActions/surfaces.md`, "The capture names no lens").
- Impact: "take a selfie" shoots with whichever camera is showing.
- Fix: add the lens field and capability, or switch the camera on the phone from the owner's words.

### eliza-device-proposals-07 (medium, CHANGED): a contact update can only replace whole fields
- Develop: `add` and `remove` single values under `contacts.write.v2` (`packages/contracts/src/telephony-actions.ts:277-295`, `:416-425`).
- Vibestack: `set` only (`packages/agent/src/device-actions/operation-schemas/telephony.vibe:125-128`; form at `proposal/families/telephony.vibe:91-97`).
- Impact: "remove the old number from Sam" cannot be expressed, since the agent never sees the other values. "Add this number" reaches the phone as a whole-field `set`, and Alpha's port asks the owner to pick add or replace (`alpha-vs/apps/app/src/telephony/actions.vibe:298-301`).
- Fix: add `add`/`remove` and `contacts.write.v2`.

### eliza-device-proposals-08 (medium, UNIMPLEMENTED): a chat proposal that times out is never recorded as expired
- Develop: listing flips lapsed pending and unclaimed approved rows to `expired` (`plugins/plugin-assistant/src/services/approval/store.ts:1525-1545`); a re-proposal and a late claim do the same (`service.ts:3070-3078`, `:3716-3721`).
- Vibestack: the rule exists ("An open offer past its deadline expires", `spec/agent/deviceActions/index.md:140-159`), but the only callers of `expire` are the agenda and workflow retire paths (`packages/agent/src/device-actions/store.vibe:283-288`, `agenda.vibe:60`, `workflow-offer.vibe:76`, `:110`).
- Impact: (1) `GET /api/client-devices/proposals` returns every lapsed chat offer for ever, because it selects all unsettled rows (`store.vibe:411-420`); a lapsed approval is listed as `approved` (`proposal-review.vibe:122`). (2) The later-turn note reads settled rows only (`proposal/receipts.vibe:93`), so the model never learns that a request timed out, although the rule "what ended without running" promises it. The test covers a decline only (`packages/agent/test/device-proposals.test.vibe:158`). Related to wave 3 A (#40186) but not named there.
- Fix: expire lapsed open offers when they are listed or read for the note.

### eliza-device-proposals-09 (medium, CHANGED): the capabilities route no longer proves the runtime's Cloud owner
- Develop: answers `externalIdentity` and refuses with 503 unless the gateway verified it (`packages/agent/src/api/device-action-routes.ts:133-152`).
- Vibestack: answers `{protocol, agentId, identityId, deviceActions}` to any caller, with no `externalIdentity` (`packages/agent/src/device-actions/enrollment.vibe:150`, `:158-159`).
- Alpha's `HostedTransport.verify()` requires `externalIdentity.subject`, `.organizationId` and `.issuer` in Cloud mode (`alpha-vs/android/app/src/main/java/ai/alphacompute/alphaphone/HostedTransport.java:38`).
- Impact: Cloud-mode hosted delivery fails its owner check on every call.
- Fix: serve the verified external identity, or drop the check in Alpha with a replacement proof of ownership.

### eliza-device-proposals-10 (medium, MISSING): Phone, Messages and Contacts are not device views
- Develop: 15 views, three of them profile-only behind `views.telephony.v1` (`contract.ts:124-160`; `service.ts:2986-2992`).
- Vibestack: 12 views (`packages/agent/src/device-actions/capabilities.vibe:12-15`; `spec/agent/deviceActions/capabilities.md`, `DeviceView`).
- Alpha wants the three on the image and advertises `views.telephony.v1` (`alpha-vs/apps/app/spec/account/enrollment.md:116-117`, `telephony/actions.vibe:327`).
- Impact: the view profile can never enable them and `open_view` cannot name them. Navigation to them depends entirely on views the launch declares for `VIEWS`, which I did not check.
- Fix: add the three views and the capability, or confirm the `VIEWS` path covers them.

### eliza-device-proposals-11 (low, CHANGED, wave 3 A): the history legend does not explain a "never ran" reason
- Develop #40186: `packages/core/src/runtime/historical-receipt-wire.ts:253-254`.
- Vibestack: the device side is done (`packages/agent/src/device-actions/proposal/receipts.vibe:27`), the core legend is the old sentence (`packages/core/src/runtime/historical-receipt-wire.vibe:166`).

### eliza-device-proposals-12 (low, CHANGED): a confirmed review carries no evidence
- Develop: `{digest, attemptId, resolution: {confirmed, outcome, operationId?, result?}}`; an applied review must name the native operation and its typed result is validated and stored (`service.ts:4142-4523`).
- Vibestack: `{digest, attemptId, review}` (`packages/agent/src/device-actions/proposal-review.vibe:21`), which is what Alpha's port sends. An applied review stores no operation id and no result, so a read confirmed this way has nothing to answer from.

### eliza-device-proposals-13 (low, CHANGED): read-completion answers differ
- Develop: the reply may carry `continuation {kind, proposalId, digest}` (`packages/contracts/src/native-notes-query.ts:185-216`); cancel answers `{cancelled: true}`; the stored reply is `client_chat`, `agentVoiced`, with `deviceReadCompletion` metadata (`packages/agent/src/api/device-action-routes.ts:290`, `:386-397`).
- Vibestack: no `continuation` (the follow-up is offered after delivery and found by listing), cancel answers `{completion}`, the reply is stored with `source: "device"` and no metadata (`packages/agent/src/device-actions/read-completion.vibe:164-176`, `:250`).

### eliza-device-proposals-14 (low, CHANGED): registration no longer answers `userTextFormatVersion: 1`
- Develop `service.ts:2146`, `:2169`. Vibestack `packages/agent/src/device-actions/enrollment.vibe:98`. Alpha reads it into `userTextFormat` (`alpha-vs/apps/app/src/account/enrollment.vibe:273`) but nothing else in the port uses it.

### eliza-device-proposals-15 (low, CHANGED): a workflow step is checked against what the device registered, not what it advertises, and is not rechecked against its run
- Develop: decide and claim recheck that the run is still active and the device protocol suffices (`service.ts:3190-3235`, `:3663-3677`).
- Vibestack: the offer validates against the registered capabilities, which default to the whole vocabulary because Alpha registers without a list (`packages/agent/src/device-actions/enrollment.vibe:93`, `workflow-offer.vibe:86-90`); the offer is retired when the waiting step ends, which does not happen across a process restart, so a cancelled run's step stays decidable until its ten-minute deadline.

### eliza-device-proposals-16 (low, UNVERIFIED): whole-message routing and the narrow device tools have no counterpart
- Develop: routing rules that take "take a picture", "open example.com", "call…/text…" and "open the keypad" away from the first-stage judgment, and about 35 single-operation tools (`tools.ts:385`, `:751-980`).
- Vibestack: one tool narrowed per turn (`packages/agent/src/device-actions/proposal/action.vibe:209-222`). There is no first stage to misroute, but whether the model picks the tool over `VIEWS` for these phrasings can only be shown by running it.

### eliza-device-proposals-17 (low, UNVERIFIED): no device-action spec is in the accept lock
- `spec/lock.json` holds only the toolkit's sample entries (`spec/app/*.md`, `spec/index.md`); nothing under `spec/agent/deviceActions` or `spec/browser`. One Dafny lemma exists for the slice (`spec/agent/deviceActions/capabilities.proof.dfy`). The only conformance driver is `packages/agent/test/drivers/agent__deviceActions__execution.ts`; the request machine is used through the generated `step`, which is sound by construction, but `gen/` is not in the tree so I could not read it.

## Contract mismatches with Alpha's port

1. Receipt code: Alpha sends `not_dispatched`, the agent settles only `DEVICE_NOT_DISPATCHED` (gap 01).
2. `GET /api/client-devices/capabilities` has no `externalIdentity`; `HostedTransport.java:38` requires it (gap 09).
3. `sms_compose.query`: upstream may put a number's dial form in it; Alpha's executor only searches contacts with it and sends rather than drafts (gap 05).
4. Alpha advertises `phone.keypad.v1`, `contacts.show.v1`, `contacts.read.v1`, `views.telephony.v1` and `sms.reply-selected.v1`; none is in the agent's vocabulary, so they are filtered out and the matching executors never run (gaps 04, 10).
5. Alpha never calls `read-completion` or `cancel-read-completion` and never reads `readReplyOrigin` (no match in `alpha-vs/apps/app/src` or `android/app/src/main`; legacy Alpha did, in `alpha-develop/apps/app/src/ui/device-actions/client-coordinator.ts`). The routes exist upstream; an approved read will not answer the original request until the port calls them. This is Alpha's side.
6. Registration answers no `userTextFormatVersion` (gap 14).
7. Device headers on the native channel (gap 02, wave 3 G).

Everything else the port uses matches: all 23 names it imports from `@elizaos/agent/client` and the six from `@elizaos/agent/operations` and `/device-actions` are exported; register, context, view-profile, proposals, decision `{digest, decision}`, claim answer `{digest, proposal.execution.attemptId}`, receipt and reconciliation `{digest, attemptId, review}` have the shapes `review.vibe` and `enrollment.vibe` expect.

## Confirmed OK

| Behaviour | Develop | Vibestack rule and code |
|---|---|---|
| Routes register, revoke, context, view-profile | `packages/agent/src/api/device-action-routes.ts:199-247` | `spec/agent/deviceActions/index.md:18-23`; `enrollment.vibe:154-161` |
| Proposal list, newest first, 50 settled, `readReplyOrigin` only while open | `service.ts:3497-3579`, routes `:248-272` | `index.md:246-254`; `proposal-review.vibe:224-245`, `store.vibe:411-420` |
| Decide only with the exact digest before the deadline; a lapsed unclaimed approval can still be declined | `service.ts:3680-3706` | `index.md:124-138`; `store.vibe:310-322` |
| Claim commits dispatch once and answers the attempt id | `service.ts:3707-3750` | `index.md:161-185`; `store.vibe:340-352`, `proposal-review.vibe:201-209` |
| Receipt: applied needs an operation id; evidence must agree; SMS and contact SMS name the claim key; same receipt again accepted, a different one refused | `service.ts:3751-4140` | `spec/agent/deviceActions/operations.md:325-381`, `:426-461`; `operations.schema.vibe:124-135`, `store.vibe:354-374` |
| Cancelled or denied SMS, dismissed contact SMS, unplaced reply draft settle as nothing ran | `service.ts:4110-4134` | `operations.md:440-448`; `operation-schemas/telephony.vibe:69-75`, `:156-163`, `:235` |
| Digest over id, subject, payload and expiry | `service.ts:1299-1306` | `index.md:124-127`; `proposal/offer.vibe:68` |
| Ten-minute offers | `service.ts:3153-3154` | `index.md:346`; `proposal/offer.vibe:27` |
| Capability header: closed vocabulary, CR/LF refused, duplicates and both reminder versions refused, checked on every request | routes `:75-92` | `spec/agent/deviceActions/capabilities.md:72-107`; `capabilities.vibe:6-10` |
| 67 of 75 wire types, strict keys, each in one family | `contract.ts:322-607` | `operations.md:19-96`; `operation-schemas/*.vibe`, `proposal/registry.vibe:25-34` |
| A number is the owner's own, written or spoken (#39930, #39850, #39956) | `telephony-target-grounding.ts`, `spoken-phone-number.ts` | `spec/agent/deviceActions/telephony.md` rule 1; `proposal/telephony/grounding.vibe`, `dial-number.vibe:22-23`, `spoken-number.vibe` |
| A contact name is whole words outside the body (#39941, #39930) | same | `telephony.md` rule 2; `proposal/telephony/names.vibe` |
| Whole-message call/text commands hand through the owner's recipient; "back", "again" dropped (#39940, #39882) | `telephony-request.ts` | `telephony.md` rule 3; `proposal/telephony/request.vibe:13`, `:145` |
| Contact changes save only numbers the owner wrote; refusals say nothing was saved (#39990) | `telephony-target-grounding.ts` | `telephony.md` rules 5 and 6; `grounding.vibe:262-284` |
| Addressed draft recipient and its clause end; "and send it" keeps the send (#39967, #39990) | `service.ts:2718-2734` | `telephony.md`, "An addressed draft request…"; `families/telephony.vibe` `addressedDraft` |
| Latest-sender read forms, fixed reply, draft to "them" only from the read just delivered (#39883, #39920) | `service.ts:2697-2711`, `:2749-2768` | `telephony.md` last two rules, `operations.md:383-405`; `families/telephony.vibe` `senderRead`, `previousSender` |
| Browser destination is the owner's typed address or an exact link of the page the message carried; a page link is always reviewed; a refused host opens nothing (#40193) | `service.ts:2871-2904` | `spec/browser/requestGrounding.md:55-80`; `packages/browser/src/proposal.vibe:97-112`, `grounding.vibe:448-452` |
| Browser refusal wording (#40106), close-all refused not narrowed (#40059), new-tab placement, spoken hostnames (#39919, #39932), search words as typed | `action.ts:2003-2010`, `service.ts:2479-2507`, `:2542-2552` | `spec/browser/control.md`; `packages/browser/src/proposal.vibe:29-49`, `:126-148` |
| `requestMessageId` only on a live direct-request turn, as asked, or for a step on the open thread or voicemail | `service.ts:2995-3018` | `index.md:377-414`; `proposal/offer.vibe:33-35`, `proposal-review.vibe:94-102` |
| A repeat returns the same request; a held refusal retrieves the kept record (#39930) | `service.ts:3044-3069` | `index.md:416-446`; `proposal/action.vibe:166-195` |
| A grounding refusal offers nothing and is "not started" | `action.ts:1984-2022` | `index.md:448-462`; `proposal/action.vibe:45-50` |
| Ended proposals say rejected or expired and never ran, device side (#40186) | `effect-receipts.ts:262-278` | `index.md:483-526`; `proposal/receipts.vibe:27`, `:48-73` |
| Workflow device offers, listed, decided, claimed, receipted and reviewed like any request (#40215) | `service.ts:3256-3460` | `index.md:99-122`; `workflow-offer.vibe:83-120`, `proposal-review.vibe:70-79` |
| Operation written as a JSON string; each operation of a compound request is its own proposal (#40090) | `plugins/plugin-assistant/src/runtime/planner-loop.ts` | `index.md:333-348`; `packages/core/src/actions/validate-tool-args.vibe:380-405`; no pause after a proposal in `packages/agent/src/conversation/planning.vibe` |
| Photos open item, library search/inspect/select/review, saved photo's library id (#39949, #39944) | `photos-view-contract.ts`, `photo-library-contract.ts` | `operations.md:193-217`, `:407-424`; `proposal/families/surfaces.vibe:59-99`, `photos-view.vibe` |
| Files by path or shown position; `notes.record.v1`; strict `create_note` (#39944) | `files-browser-contract.ts:205-290` | `operations.md:98-119`; `operation-schemas/device.schema.vibe:62-97`, `:123` |
| A photo runs without its card only for a whole-message photo command (#39990) | `camera-request.ts`, `service.ts:2914-2938` | `spec/agent/deviceActions/surfaces.md`, photo rule; `proposal/surfaces/camera-request.ts` |
| Maps read names exactly the selected place or route | `service.ts:3115-3137` | `surfaces.md`, Maps rule; `families/surfaces.vibe` `mapsGrounding` |
| `open_view` bound to the profile revision, rechecked at decide and claim | `service.ts:2295-2311` | `capabilities.md`, last two rules; `proposal-review.vibe:145-148` |
| Read completion: retained hint, ten and thirty minute deadline, one inference, cancel | routes `:273-469`, `service.ts:1288-1298` | `index.md:256-317`; `read-completion.vibe:58-62`, `:189-213` |
| Later-turn note of at most six outcomes | `conversation-receipts.ts:70-72` | `index.md:483-503`; `proposal/receipts.vibe:91-110` |
| Standalone agenda read for the displayed Calendar day | `service.ts:4527-4676` | `index.md:140-147`, `operations.md:219-232`; `agenda.vibe:22-62` |
| Clock handoff v1 and v2 forms, zone grounded in the observation | `clock-contract.ts:342-371` | `capabilities.md`, "A newer operation…"; `packages/assistant/src/device-proposals.vibe:138-141`, `:238-239` |
| Calendar, reminder, notes and files families register their own types | `action.ts` schemas | `index.md:363-375`; `packages/{calendar,assistant,notes,files}/src/**/device-proposals.vibe` |
| Android action journal and deferred deletion sources | `plugins/plugin-native-action-journal/android` | `spec/os/android/deferredDeletion.md`; `packages/os/android/action-journal` (five of eight files identical) |
| Owner-only tool, offered only on the enrolled device's turn | `action.ts:1816-1820` | `index.md:326-361`; `proposal/action.vibe:197-207`, `proposal/turn.vibe:52-55` |

Not applicable (5): `clock_alarm` and `clock.alarms.v1` (Alpha never advertised it, by policy); `gmail.request-policy.v1` and `gmail.local-compose.v1` (the inbox package hands a draft to any device turn without negotiation); `contacts.lookup.v1` (legacy Alpha never offered it); the tool's `operationKey` and `reason` parameters (identity now comes from the message and operation); the proposal's `reason`, `channel` and `updatedAt` fields (Alpha's port reads none of them).

## Not covered

- Grounding inside `packages/calendar`, `packages/notes`, `packages/files`, `packages/assistant` (reminders, Clock) and the Browser controls beyond the open and page-link path: I checked registration, types and that forms exist, not each rule.
- Field bounds and result shapes of each operation: spot-checked Files, telephony, Browser and the base operations only.
- Develop's `client-coordinator.ts` (4,087 lines) against `DeviceExecution` and `execution.md`: only the claim, receipt and review seams.
- Device-local helpers (`reminder-journal.ts`, `clock-handoff-history.ts`, `clock-review-executor.ts`), which now belong to Alpha's app.
- The per-family read continuations in `prepareReadReply` (Notes and Calendar update and delete after a read).
- `POST /api/client-devices/maps-navigation`, the Gmail device consent and draft routing, and the workflow package's step-scope and spec-digest checks.
- The 135 changed lines in the two Android deferred-deletion classes.
- Equivalence of the model-facing guidance text.
- Anything that needs a build or a run: no tests, no generation, and `gen/` is absent, so the generated machine was not read.
- How long the phone's agent store, device key and owner identity live relative to each other, which decides how often gap 03 bites.
