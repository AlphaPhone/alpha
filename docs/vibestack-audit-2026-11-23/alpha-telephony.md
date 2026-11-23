# Alpha Phone parity audit: telephony

Slice: Phone, Messages, Contacts, voicemail, ongoing-call bar, agentic comms stage, drafts and reviewed
SMS/MMS send, approved call/text/contact actions, emergency-call gate, dialer/SMS roles, Home cards.
Read-only code audit. Nothing was built or run; every finding is from reading both trees.
Paths are relative to `/home/shaw/.cache/vibeaudit/` (`alpha-develop` = legacy, `alpha-vs` = port,
`eliza-vs` = upstream vibestack).

## Summary

| Class | Count |
| --- | --- |
| OK | 34 |
| UNIMPLEMENTED | 10 |
| CHANGED | 10 |
| MISSING | 2 |
| UNMODELED | 2 |
| KNOWN | 6 |
| RETIRED | 0 |
| UNVERIFIED | 4 |

Verdict: **not at parity.** The renderer models (10 spec files, 85 rules, each with a Quint block and
properties) are thorough and the Android telephony classes are byte-identical to legacy apart from the
new Undo window. The safety gates fail closed. But the slice does not work end to end and three
safety-relevant behaviours regressed:

- No text can be sent. The renderer calls the native `sendSms`/`sendMms` directly, and the unchanged
  native code admits a send only through the composer port or an approved-card journal claim, neither of
  which the port uses (gap 1).
- "Draft a text" would send it and report "not sent" once gap 1 is fixed (gap 2).
- A name-lookup review is never ended by lock, hide or a view change, so a stale chooser can still call
  or text later (gap 3).
- Every approval card in every area is blocked whenever the call state is unreadable (gap 4).
- Several receipts state the wrong outcome (gaps 5, 6).

Much of AP-16 exists only as model: End in card/strip/voice, the full sheet, briefings, Screen it,
dictation, SIM choice, card facts (gaps 8, 12 to 18, 23).

## Gaps

Most severe first.

### 1. UNIMPLEMENTED: owner Send and approved Alpha texts are refused by the native side
- Behaviour: one owner tap on Send sends the SMS/MMS; an approved `sms_send`/`sms_compose` card sends once.
- Legacy: owner sends go through the origin-checked composer port on a trusted tap,
  `alpha-develop/apps/app/src/prototype/sms-adapter.ts:271-290` (`composerClient`, `window.alphaMessagesComposer`)
  and `:768-774` (`isTrusted`, `sendControl`). Card sends pass the approved card's identity,
  `alpha-develop/apps/app/src/runtime/aosp-telephony.ts:45-48` (`journalIdentity`),
  `alpha-develop/apps/app/src/prototype/agent-adapter.ts:1140,1187-1188`.
- Native (same file in both trees): `alpha-vs/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyBase.java:905-941`
  rejects `sendSms` with `not-approved` unless `AlphaApprovedSms.claim` passes (`AlphaApprovedSms.java:41-44`
  throws on a null identity); `:1064-1067` `sendMms` always rejects ("Send pictures and group messages
  from the Messages composer"). The composer path is `AlphaTelephonyPlugin.java:43-60` (`sendComposed`).
- Port: `alpha-vs/apps/app/src/telephony/drafts.vibe:148-150` and `actions.vibe:240-247` call
  `c.messages.sendSms/sendMms`, which is `plugin.sendSms({operationId, recipients, body, subscriptionId})`
  (`eliza-vs/packages/os/src/bridges/messages.vibe:269,283`): no `journalIdentity`, no composer port.
  `alphaMessagesComposer` appears nowhere under `alpha-vs/apps/app/src`.
- Impact: on the image every owner SMS, every MMS and every approved Alpha text ends "refused" or
  "unavailable"; nothing is sent. Fails closed.
- Fix: add a composer-port sender to `src/telephony/bridges.vibe` and use it in `drafts.vibe send` (owner
  tap only); pass `{scope, proposalId}` from `TelephonyCalls.of(call)` into the card send in
  `actions.vibe sendText`. State both in `spec/telephony/drafts.md` ("Send only what I reviewed, once").
  Open-items only says "`AlphaTelephonyBase` is still Alpha's fork", not that sends are refused.

### 2. CHANGED: "Draft a text" sends the text and the receipt says it was not sent
- Behaviour: a draft request puts the text in the conversation's field and never sends.
- Legacy: `alpha-develop/apps/app/src/runtime/telephony-executor.ts:198-208` (`draftOnly` never reaches the
  send); receipts distinguish drafted/submitted/sent/delivered, `ui/telephony/telephony-receipt-text.ts:60-81`.
- Upstream contract: every addressed draft request becomes `sms_compose {query, body}` and "the draft is
  the owner's to edit and send", `eliza-vs/spec/agent/deviceActions/telephony.md:230-248`. The `draft` flag
  and `sms.compose.v2` no longer exist.
- Port: `alpha-vs/apps/app/src/telephony/actions.vibe:249-273` drafts only when that conversation is
  already open; otherwise, after the candidate pick, it calls `sendText`. The card is titled "Draft a text"
  (`operations.vibe:435`) and any applied result reads "Draft added to the conversation, not sent."
  (`operations.vibe:443,512`). A number in `query` is looked up as a contact name and ends "not found" (`:252-254`).
- Impact: masked by gap 1 today. Once sends work, "draft a text to Sam" sends an SMS after one pick and
  tells the owner it was not sent.
- Fix: in `actions.vibe compose`, open the recipient's conversation with Alpha's draft
  (`drafts.placeAlphaDraft` + `present` to `messages`), never `sendText`; add the rule to
  `spec/telephony/actions.md` ("A read, a keypad, a filtered list or a draft settles without any effect").

### 3. UNIMPLEMENTED: a name-lookup review is not ended by lock, hide or a changed view
- Behaviour: "Not now, locking, hiding Alpha, or another view replacing the one the review ran under
  chooses nothing" (`alpha-vs/apps/app/spec/telephony/actions.md`, "The owner's Not now…").
- Legacy: `ports.current()` fences and the review's AbortSignal, `alpha-develop/apps/app/src/runtime/telephony-executor.ts:165,186,193,203`;
  `prototype/image-telephony.ts:27-32`; tests "a review that is no longer current stops before anything
  happens", "a sensitive or hidden screen cannot review a dial".
- Port: `TelephonyActions.dismiss()` (`actions.vibe:410-414`) has no caller. `choose()` (`:152-158`) waits
  on the machine with no timeout. `<ReviewRows />` renders in the chat whenever a run is `Choosing`
  (`src/web/assistant/ChatPanel.tsx:133`); only its "Not now" button dismisses (`ReviewRows.tsx:27`).
- Impact: the chooser survives a lock, a background or a move to another app, and a later tap still
  calls, texts or writes (after the guard). While it is stuck, every later telephony action is dropped
  as `AlreadyRan` (`operations.vibe:558`).
- Fix: the shell calls `TelephonyActions.dismiss()` on Foreground hidden/locked and on a Navigation
  subject change; add a bounded wait in `choose()`.

### 4. CHANGED: every approval card is blocked while the call state is unreadable
- Behaviour: only a live call that may be an emergency call holds proposals; "with no call or no readable
  state the shell keeps working" (`alpha-vs/apps/app/spec/telephony/common.md`, emergency gate rule).
- Legacy: display gate is `deviceEmergencyLive()`, false with no source, `alpha-develop/apps/app/src/runtime/comms-bar.ts:185-198`,
  `proposalCanAct` `:145-151`; only side effects fail closed, `runtime/call-state.ts:143-157`.
- Port: `alpha-vs/apps/app/src/shell/assistantHost.vibe:135` `emergency() = !calls.allowed()`.
  `allowed()` is the fail-closed effect guard: false without the plugin or with `inCall` unknown
  (`src/telephony/call-bar.vibe:163-169`). `src/assistant/review.vibe:377` returns before approving any
  card, of any area, when it is true.
- Impact: in the browser build, on the launcher APK without phone-state access, and on the image before
  that grant, tapping Approve on any card (calendar, notes, reminders, telephony) silently does nothing.
- Fix: `emergency()` reads `emergencyLive(latest reading)` from the call bar machine; keep `allowed()` for
  effects only.

### 5. CHANGED: an approved contact deletion is reported as failed while it is staged to delete
- Legacy: "Contact deleted.", `alpha-develop/apps/app/src/ui/telephony/telephony-receipt-text.ts:38-45`.
- Port: `contacts.remove` answers `{status: "queued"}` on success (`eliza-vs/packages/os/src/bridges/contacts.vibe:245-247,338-340`).
  `alpha-vs/apps/app/src/telephony/actions.vibe:314-320` passes that status through; `SETTLED_OF_STATUS`
  (`:124-129`) has no `queued`, so it settles `NotDone`: "It did not go through." (`operations.vibe:451`).
  The result `contact-write: queued` is also outside the agent's result schema.
- Impact: owner and agent are told the delete failed; the contact is deleted when the Undo window expires.
- Fix: map `queued` to `deleted`/`Applied` in `actions.vibe contactWrite`.

### 6. CHANGED: receipts are one sentence per outcome class, and several are wrong for their action
- Legacy: per-kind, per-status text, `alpha-develop/apps/app/src/ui/telephony/telephony-receipt-text.ts:17-202`;
  guard words `prototype/image-telephony.ts:17`; tests `test/telephony-receipt-text.test.mjs`.
- Port: `alpha-vs/apps/app/src/telephony/operations.vibe:441-454,511-520`.
  - `sms_send` "submitted" reads "Message sent." (legacy "Message handed to Android."); delivered is not distinguished.
  - `sms_latest_sender` with no incoming text reads "No matching contact was found."
  - An emergency-guard refusal and an ungrounded number both read "Nothing was done."; the spec promises
    the guard's own words and `EMERGENCY_REFUSAL` (`actions.vibe:23`) is unused.
- Impact: "never that a text was delivered when it does not know" is weakened; the owner cannot tell an
  emergency refusal from a wrong-number refusal.
- Fix: key `sentenceOf` on the result status, not only `Settled`; add the sentences to `spec/telephony/actions.md`.

### 7. CHANGED: a number target is re-judged at execution, stricter than legacy and from memory only
- Legacy: "A message that writes no number … is not judged here and keeps its ordinary card",
  `alpha-develop/apps/app/src/ui/device-actions/client-coordinator.ts:3626-3690`; contact changes judged by
  every number they save (`:3567-3585`). `test/call-number-guard.test.mjs`.
- Port: `alpha-vs/apps/app/src/telephony/actions.vibe:62-67,335-343` refuses a number target unless the
  owner's text contains it. The text comes from an in-memory map (`src/assistant/review.vibe:256,369,520`),
  empty after a restart or for a recovered proposal. This contradicts `spec/assistant/review.md`
  `lawNoWrittenNumberContradictsNothing`. `operations.vibe:489-494`: a `contact_update` is not judged by
  its numbers, and a `contact_create` passes if any one number is grounded.
- Impact: an approved Call or Text card for a number ends "Nothing was done." after a restart, for a
  spoken number, or for a number the agent took from context. A contact change can save a number the
  owner did not write (upstream agent grounding, `eliza-vs/packages/agent/src/device-actions/proposal/telephony/grounding.vibe`, still covers it).
- Fix: use the assistant's `contradicts` verdict instead of `grounded()`; judge `set.phoneNumbers` with `every`.

### 8. UNIMPLEMENTED: the End button beside the bar does nothing; End in card, strip and voice panel have no UI
- Legacy rule: `endPlacement`, `alpha-develop/apps/app/src/runtime/comms-bar.ts:200-214` (AC-18).
- Port: `CommsBar` draws End for `EndBesideBar` (`alpha-vs/apps/app/src/web/telephony/CommsBar.tsx:100-104`)
  but no screen passes `onEnd` (`PhoneScreen.tsx:127-141`, `MessagesScreen.tsx:204-220`, `ContactsScreen.tsx`).
  `EndInCard`, `EndInStrip`, `EndOnVoicePanel` have no consumer; `heightChanged` and `voiceChanged` are never sent.
- Impact: during a live call a red End button on Phone, Messages and Contacts is dead. The top call bar's
  End (`CallBar.tsx:34`) and the native call screen still work, so End stays reachable.
- Fix: pass `onEnd` from each screen to `CallWatch.end(shownCall(bar.calls).id)`.

### 9. UNIMPLEMENTED: a draft slot left "Sending" by process death stays locked
- Legacy: `alpha-develop/apps/app/src/runtime/native-sms-drafts.ts`; tests in `test/image-sms.test.mjs`
  ("durable native drafts survive remount and settle a late receipt"), `test/browser/aosp-telephony-views.spec.ts`
  ("a missing composer reply releases Send and a retry retains its operation identity").
- Port: the drafts machine is stored on every change (`alpha-vs/apps/app/src/telephony/layer.vibe:43-48`).
  `readBack` returns at once for a `Sending` slot (`drafts.vibe:100-102`), `send` only reads back
  `Unconfirmed` (`:133-136`), and `sendStarted`, `ownerTyped` and `cleared` all refuse `Sending`
  (`spec/telephony/drafts.md`). Nothing moves a restored `Sending` slot. The spec sentence "A late journal
  receipt settles the slot the same way" has no code for this case.
- Impact: after a crash mid-send that conversation's composer cannot type, send or clear. Confidence
  medium: the generated `decodeState` was not inspected.
- Fix: on load, turn `Sending` into `Unconfirmed` (a Device `sendAnswered … ReceiptLost`) in `draftsKept`,
  as `commsKept` sends `restored`; add the rule to `drafts.md`.

### 10. MISSING: legacy Messages drafts are not carried over
- Legacy: secure slots `sms-draft:v1:<thread|new>`, `alpha-develop/apps/app/src/runtime/native-sms-drafts.ts:19-22`.
- Port: nothing reads `sms-draft:v1`; drafts live under `telephony/drafts` in the owner-keyed KeyValueStore
  (`alpha-vs/apps/app/src/telephony/owner.vibe:28`). Not in the open-items list (it names only inbox,
  notes and `alpha-proposal:v1`).
- Impact: unsent texts are lost at the cutover, and a send whose outcome was unknown loses its operation
  ID, so sending again can duplicate it.
- Fix: adopt the legacy slots once in `owner.vibe`/`layer.vibe draftsKept`, or record an owner decision.

### 11. CHANGED: Alpha can no longer open the keypad, filter Contacts or read the open contact
- Legacy: `phone_keypad`, `contact_show`, `contact_read_selected` (#1330, #1433); `test/telephony-agent-flow.test.mjs`
  ("the dialer keypad is advertised only on the image…"), `test/telephony-executor.test.mjs`.
- Upstream: "There is no keypad operation", `eliza-vs/spec/agent/deviceActions/telephony.md:32-33`; no
  `contact_show` or `contact_read_selected` in `eliza-vs/packages/agent`.
- Port: the phone-side executors exist (`alpha-vs/apps/app/src/telephony/actions.vibe:381-392`,
  `actions.schema.vibe`) but no agent proposes them.
- Impact: "open the dialer with 415…" becomes a `phone_dial` card that opens Android's dial screen. A
  Contacts bar sentence goes to Alpha and no filter comes back (AC-22 for Contacts).
- Fix: add the three operations upstream, or filter Contacts locally in `list-ask.vibe` as Phone and Messages do.

### 12. UNIMPLEMENTED: the briefing (AC-25)
- Legacy: `alpha-develop/apps/app/src/prototype/comms-alpha.ts:46-58`, `prototype/phone-adapter.ts:254`.
- Port: `CommsStage.briefing()` (`alpha-vs/apps/app/src/telephony/comms.vibe:86-97`) and `callsBriefing`
  (`src/web/telephony/present.ts:97`) have no caller.
- Fix: the assistant calls `briefing()` when the chat opens on a comms subject and adds the line.

### 13. UNIMPLEMENTED: call and text cards do not show the name, SIM, parts or carrier note
- Legacy: `alpha-develop/apps/app/src/ui/telephony/sms-card-facts.ts`; native `contactForNumber`,
  `alpha-develop/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyPlugin.java:90-103`
  (removed in the port); `test/call-state-native.test.mjs` "AC-20: PhoneLookup names a contact on the card".
- Port: helpers `callCardText`, `smsSendFacts`, `smsPartEstimate` exist with no caller
  (`alpha-vs/apps/app/src/web/telephony/present.ts:223-270`). The card is `TITLES` plus the raw number or
  query (`operations.vibe:434-439,498-508`).
- Impact: a Call card for a number shows digits only; a text card does not say it sends at once, from
  which SIM, or as how many texts.
- Fix: `operationPorts.describe` uses the helpers, with `displayNames` for the number.

### 14. UNIMPLEMENTED: the comms stage does not follow the real chat sheet
- Port: `height` changes only from telephony's own controls (`alpha-vs/apps/app/src/web/telephony/useComms.ts:36-40`,
  `src/telephony/back.vibe:50`, `list-ask.vibe:87`). `heightChanged` and `voiceChanged` have no sender.
  The stage is stored, so a restart restores "open" whatever the sheet shows.
- Impact: the bar can read "Ask Alpha" with the chat closed, and the full-sheet strip (AC-04) is never
  reached. How the shell closes the sheet was not traced (UNVERIFIED part).
- Fix: mirror the assistant's sheet height into `CommsMachine` from the shell.

### 15. KNOWN: bar approvals and bar questions bypass the assistant
- Open-items, "Areas consuming assistant changes → Telephony". Confirmed: `useComms.approve` has no caller;
  `askAlpha` routes by navigation (`alpha-vs/apps/app/src/telephony/list-ask.vibe:83-100`).

### 16. UNIMPLEMENTED: dictation in the bar and hold-Alpha-to-talk (AC-12)
- Legacy: `alpha-develop/apps/app/src/prototype/comms-alpha.ts:136`, `prototype/chat-overlay-motion-adapter.ts:1068`.
- Port: no screen passes `onDictate`, so the mic is disabled (`alpha-vs/apps/app/src/web/telephony/CommsBar.tsx:96`);
  the Alpha button has only a click (`:56`), though `spec/telephony/comms.md` says holding starts a voice turn.

### 17. MISSING: "Sent to <name>" quiet note after a send (AC-15)
- Legacy: `alpha-develop/apps/app/src/prototype/sms-adapter.ts:759`. Port: no counterpart.

### 18. UNIMPLEMENTED: SIM choice and the system-messaging handoff
- Port: `simChosen` has no UI sender; `DraftSends.handoff` (`alpha-vs/apps/app/src/telephony/drafts.vibe:175-183`)
  has no caller; incomplete rows say "Use the system messaging app" with no action (`ThreadList.tsx:48`).
- Legacy tests: `test/aosp-telephony.test.mjs` "SMS review: recipients, body and SIM selection",
  `test/browser/aosp-telephony-views.spec.ts` "Messages can open a system review without SMS permissions…".
- Impact: a two-SIM phone with no default SMS SIM ends "sim-required" with no way to choose.

### 19. CHANGED: contact actions lost three checks
- New-contact twin by number under another name: legacy looks each number up,
  `alpha-develop/apps/app/src/runtime/telephony-executor.ts:286-297`; port searches the name only,
  `alpha-vs/apps/app/src/telephony/actions.vibe:286-288`. The spec rule says "name or number".
- "More matches than listed" flag (`flagMore`, legacy `:193,318`): port ignores `page.next` (`actions.vibe:186,200`).
- Missing write access: legacy asks for it (`test/image-telephony.test.mjs`); port answers unavailable (`actions.vibe:277-278`).

### 20. CHANGED: an approved text is not watched after "submitted"
- Legacy: `SMS_SETTLE`, `alpha-develop/apps/app/src/prototype/image-telephony.ts:58-80` (applies to card sends).
- Port: the watch exists only for owner sends (`alpha-vs/apps/app/src/telephony/drafts.vibe:157-162`);
  `actions.vibe:268-272,353-355` report the first answer.

### 21. CHANGED: no telephony action runs without a card
- Legacy: with review-first off, a latest-sender read, a draft to a written number and a bound reply draft
  ran directly, `alpha-develop/test/telephony-agent-flow.test.mjs:186-208` (#1411).
- Port: `classOf` makes every telephony action `CommsAct` except a bare keypad and `contact_show`
  (`alpha-vs/apps/app/src/telephony/operations.vibe:457-460`). Stricter; the owner sees more cards.

### 22. UNMODELED: Alpha's native send admission
- Legacy: `alpha-develop/specs/quint/native/NativeSmsDispatch.qnt` (395 lines) with
  `specs/quint/refinement/native/sms-dispatch.mjs`, `SmsDispatchTraces.java`.
- Port: `AlphaApprovedSms`, `AlphaMessagesComposerPort` and `composerGuard` are kept in Android with no
  spec rule; upstream `spec/os/android/messages.md` models a different admission (native confirmation).
  The legacy files remain in the tree, "mapped" to `spec/telephony/index.md`, which has no rules.

### 23. UNIMPLEMENTED: ring, "Screen it" and the in-app call card are model only
- Port: `ScreenProposal` can never be proposed (`alpha-vs/apps/app/src/assistant/review.vibe:327` passes
  ring `""`); no incoming card, Answer or Decline in the stage.
- Legacy had these only in the test-mocks simulated phone (`alpha-develop/apps/app/src/prototype/model.js:298,400`);
  on the image the bar spec was `end:null, incoming:null` (`prototype/phone-adapter.ts:253`). No owner-visible
  loss on the image. The simulated Phone/Messages/Contacts (dev-incoming-call, dev-contacts,
  dev-messages-lifecycle, dev-voicemail-audio specs) is not ported; see the open-items "mock mode" owner bullet.

### 24. KNOWN (five more bullets confirmed as stated in open-items)
- `mms_send` settles unavailable with no card (`actions.vibe:357`).
- `alpha-proposal:v1` is in the KeyValueStore, not migrated (`comms.vibe:57`).
- No capability header until the shell fills `AdvertisedCapabilities`: until then no telephony action is offered at all.
- Held values and the tests for `ownerKept`/`follow` are missing.
- PhoneScreen, MessagesScreen, ContactsScreen, CallBar, UndoNotice, ReviewRows, PhoneInfoPanel have no `.meta.tsx`.

### 25. CHANGED (benign): deletes wait in an Undo window
- Message, voicemail and contact deletes are staged with Undo instead of applied at once
  (`alpha-vs/apps/app/src/telephony/undo.vibe`, `AlphaTelephonyBase.java:584-640`). Confirmation is unchanged.

### 26. UNMODELED / Vibestack usage
- Tests: 53 story tests in `alpha-vs/apps/app/test/telephony` against about 370 legacy titles. Conformance
  drivers exist only for `telephony__comms` and `telephony__drafts` (`test/drivers`). All 64 legacy tests
  are still in the tree marked "mapped" but import removed modules (`apps/app/src/runtime`, `prototype`),
  so they cannot run.
- Shell logic that decides what a model should: `grounded()` (`actions.vibe:62-67`, duplicates the
  assistant's `contradicts`), `SETTLED_OF_STATUS` (`:124-129`), `composerIdle` (`messages.vibe:79-85`),
  the `CALLS_WITH`/`TEXTS_ABOUT` regexes (`list-ask.vibe:13-15`).
- `effectKind` lists `RemoveVoicemail` and `ComposeText` as effects, but the shell never guards a
  voicemail delete (`actions.vibe:371-374`); same as legacy, model and shell disagree.
- No `.proof.dfy` in `alpha-vs/apps/app`; legacy had no telephony Lemma/Dafny proof, so none is owed.

### 27. UNVERIFIED
- Selected reads bound to the selection they were asked on (legacy `client-coordinator.ts:1488-1500`,
  test "recovery cannot attach a selected telephony proposal to another item or session"): the port passes
  `exact: true` unconditionally (`alpha-vs/apps/app/src/assistant/review.vibe:351`). Assistant slice.
- #1397, the agent recording a refused wrong-number proposal: assistant slice.
- #1414, share offering Messages only for sendable pictures: `src/telephony/share.vibe` exists with a test title; not read.
- Home Messages card titles use raw addresses (`attention.vibe:32`); whether legacy showed names there was not checked.

## AC-01 to AC-32

| AC | Class | Note |
| --- | --- | --- |
| AC-01 | OK / UNVERIFIED | One `data-alpha-composer` per telephony screen (`CommsBar.tsx:76`); whether the assistant's own composer also shows was not traced. |
| AC-02 | UNVERIFIED | No stage layout in the telephony screens; shell geometry slice. |
| AC-03 | OK | Thread header back, avatar, name, call (`MessagesScreen.tsx:76-87`). Call card is the native activity. |
| AC-04 | UNIMPLEMENTED | Full height and strip never reached (gap 14). |
| AC-05 | UNVERIFIED | Shell motion. Model: `stepTheSheetHoldsItsHeightWhenTheStageChanges`. |
| AC-06 | OK | `comms.md` `backStep`; `back.vibe:45-65`. |
| AC-07 | UNVERIFIED | Shell. |
| AC-08 | OK | `leftSlot`; `CommsBar.tsx:55-69`; header search in Messages. |
| AC-09 | OK | "Ask Alpha" with outline (`CommsBar.tsx:89`); sheet header context not traced. |
| AC-10 | OK | `drafts.md` requests; `useComms.ts:42`; stored per owner. |
| AC-11 | OK | `max-h-[min(168px,28dvh)]` (`CommsBar.tsx:89`). |
| AC-12 | UNIMPLEMENTED | Gap 16. |
| AC-13 | UNVERIFIED | `DraftBubble` shows the whole draft; the fit is the shell's. |
| AC-14 | OK | `drafts.md` `alphaDrafted`; `drafts.vibe:189-194`; `DraftBubble.tsx`. |
| AC-15 | OK / MISSING | Same send path (`MessagesScreen.tsx:181`); "Sent to" note missing (gap 17). |
| AC-16 | OK | `adopted` + `closeChat` (`MessagesScreen.tsx:182-185`). |
| AC-17 | OK | Native call screen unchanged. |
| AC-18 | UNIMPLEMENTED | Gap 8; top bar End works. |
| AC-19 | OK | `comms.md` `proposed`/`canProposalApproved`; effect guard. See gap 4 for over-blocking. |
| AC-20 | OK / UNIMPLEMENTED | No dial before approval and pick; card lacks the name (gap 13). |
| AC-21 | UNIMPLEMENTED | Gap 23. |
| AC-22 | OK / CHANGED | Phone and Messages filter locally (`list-ask.vibe`); Contacts via Alpha unreachable (gap 11). |
| AC-23 | OK | No chip row. |
| AC-24 | OK | No suggestion code in telephony. |
| AC-25 | UNIMPLEMENTED | Gap 12. |
| AC-26 | OK | `comms.md` proposals; `review.vibe:387-395`. |
| AC-27 | OK | Plain Alpha button. |
| AC-28 | UNVERIFIED | Contrast audit not run. |
| AC-29 | OK | Labels "Open Alpha", "Back to texting …", "Back to the call", draft label. |
| AC-30 | OK | Restored proposal never approvable (`layer.vibe:54-64`); see gaps 9 and 14. |
| AC-31 | OK | Only provider rows and owner sends are shown. |
| AC-32 | OK | `fixtures.ts` imported only by `.meta.tsx`; bundle audit not run. |

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Apps only on the registered image | `test/aosp-telephony.test.mjs` | common.md "The apps exist only on the Alpha image…" | `bridges.vibe:91-113` |
| Providers read only in front, unlocked | `test/image-sms.test.mjs` | common.md "A provider is read only…" | `front.vibe:5-36` |
| Call bar phases, 1500 ms ended hold, no taps | `runtime/ongoing-call.ts:90-113` | callBar.md (8 rules) | `call-bar.vibe`, `CallBarView.tsx` |
| Stale refresh never replaces a newer reading (#1369) | `test/ongoing-call-bar-state.test.mjs` | callBar.md "A reading older than the latest…" | `call-bar.vibe:81-89` |
| Calling until active, clock from connect time (#1366) | same | callBar.md "The bar says Calling…" | gen `barWords`, `CallBarView.tsx:26` |
| End asked once, Decline while ringing | `test/browser/ongoing-call-bar.spec.ts` | callBar.md "Return and End…" | `call-bar.vibe:156-162` |
| Effect guard fails closed on a fresh reading | `runtime/call-state.ts:143-157` | common.md `effectAllowed` | `call-bar.vibe:163-169`, `actions.vibe:161-165` |
| A payload claiming a live emergency is never lifted | `runtime/call-state.ts:26-34` | common.md `emergencyLive` | `call-bar.vibe:50-55` |
| Call, dial, send and contact write each behind the guard | `prototype/image-telephony.ts:35-56` | actions.md "An effect dispatches only after…" | `actions.vibe:222,267,316,352` |
| A name is never called unseen, even for one match | `telephony-executor.ts:150-166` | actions.md "A name is looked up…" | `actions.vibe:215-220`, `ReviewRows.tsx` |
| Once per operation ID, never retried | `test/telephony-agent-flow.test.mjs` | actions.md "An action starts once…" | `actions.vibe:341-342` |
| Lost call reply is unconfirmed | `prototype/place-owner-call.ts` | common.md `callOutcome` | `phone.vibe:36-44`, `actions.vibe:230` |
| Unconfirmed text read back by operation ID only | `test/sms-agent-flow.test.mjs` | actions.md "An unconfirmed text is settled only…" | `actions.vibe:397-409` |
| Restored proposal shown, never approved | `prototype/comms-alpha.ts:66-75` | comms.md "A proposal restored…" | `layer.vibe:54-64`, `RestoredProposal.tsx` |
| One open proposal; a replaced one never acts | `runtime/comms-bar.ts:145-151` | comms.md "A new proposal replaces…" | `comms.vibe:98-108`, `review.vibe:387-395` |
| No acting proposal over an emergency call | same | comms.md `canProposalApproved` | gen comms machine |
| Owner call: Telecom, dial screen as fallback | `prototype/place-owner-call.ts` | common.md "A call is reported started only…" | `phone.vibe:36-44` |
| Keypad and Recents never dial alone; prefill waits | `test/contacts-adapter.test.mjs` | phone.md "A number handed to Phone…" | `phone.vibe:92-100`, `ContactsScreen.tsx:75` |
| Recents: 50, access asked only from Allow | `specs/quint/application/PhoneRecents.qnt` | phone.md "Only the latest read publishes…" | `phone.vibe:75-82` |
| Voicemail tab only with a ready carrier | `specs/quint/native/Voicemail.qnt` | voicemail.md, phone.md | `voicemail.vibe:82-99` |
| Transcript on this phone or not at all | `runtime/voicemail-transcription.ts` | voicemail.md "A transcript is made…" | `voicemail.vibe:101-112`, `voice/voicemail.vibe` |
| No playback during a call; confirmed delete; Alpha's delete asks the same | `Voicemail.qnt` `NoPlaybackDuringCall` | voicemail.md | `voicemail.vibe:126-131,176-191` |
| Messages reads by epoch; mark read through the newest shown with the SMS role | `test/image-sms.test.mjs` | messages.md | `messages.vibe:130-145` |
| Incomplete rows carry no content | `test/sms-incomplete-rows.test.mjs` | messages.md domain rule | `messages.vibe:64-76` |
| Notice opens only its thread, composer idle | `test/browser/aosp-telephony-views.spec.ts` | messages.md "Only a complete listed conversation opens…" | `messages.vibe:168-197` |
| Header Call in a one-person thread (#1361) | same | messages.md "Call in a one-person conversation's header…" | `messages.vibe:243-247` |
| Copy/Delete, exact row, uncertain blocks another | `docs/agentic-comms.md` Verification | messages.md "Delete passes the exact listed row…" | `messages.vibe:270-279` |
| Delivered only on a confirmed report; MMS never (#1278) | sms-adapter | messages.md "A sent text reads Delivered only…" | `messages.vibe:71-76` |
| Credential-free links open in Browser on tap (#1293) | `docs/agentic-comms.md` | messages.md intro | `present.ts:198-219`, `MessagesScreen.tsx:170` |
| Alpha's draft: one slot, one Undo, Edit, Don't send, never sends | `runtime/message-draft.ts` | drafts.md (3 rules) | `drafts.vibe:189-194`, `DraftBubble.tsx` |
| Send binds an operation; unknown keeps it; Send again reads back | `specs/quint/services/SmsSend.qnt` | drafts.md "Only the owner's Send binds…" | `drafts.vibe:131-165` (renderer only; see gap 1) |
| Pictures: five, JPEG/PNG/GIF, 1 MB | `runtime/native-sms-drafts.ts` | drafts.md "A slot holds at most five…" | `drafts.vibe:195-207` |
| Contacts: epoch, 200 cap, version-named save, stale, write gate, system editor | `test/contacts-adapter.test.mjs` | contacts.md (9 rules) | `contacts.vibe` |
| Alpha contact write refreshes the list and holds writes when unknown (#1326) | `prototype/contacts-changes.ts` | contacts.md "A write holds the gate…" | `actions.vibe:319`, `contacts.vibe:190-193` |
| List filter local; a question leaves the bar only when taken (#1268, #1314) | `test/comms-messages-bar.test.mjs` | common.md (2 rules) | `list-ask.vibe:106-146` |
| View change waits for the reply (#1433) | `test/telephony-agent-flow.test.mjs` | actions.md "A view change that shows the outcome…" | `operations.vibe:550-553,592-597` |
| Home cards: read sources only, grouped missed calls | `test/telephony-presenters.test.mjs` | attention.md | `attention.vibe`, `HomeCardsView.tsx` |
| Android telephony classes | 44 files | upstream `spec/os/android` | identical except `AlphaTelephonyBase`, `AlphaTelephonyPlugin`, `AlphaContactsPlugin` (Undo window; `contactForNumber`, `searchContacts` removed) |

## Not covered

- `alpha-vs/apps/app/src/telephony/{share,phone-info,routes,undo,back}.vibe` beyond the lines cited;
  `ContactsScreen.tsx`, `PhoneInfoView.tsx`, `UndoNotice*.tsx`, `Keypad.tsx`, `RecentsList.tsx`, `ThreadList.tsx` read only by grep.
- The generated machines (`gen/telephony__*`): not present in the tree; `decodeState` behaviour assumed from the Quint.
- Legacy `prototype/sms-adapter.ts` (74 KB) and `phone-adapter.ts` beyond the cited lines; legacy
  `specs/quint/native/MessageThreads.qnt`, `services/PhoneSession.qnt`, `application/PhoneRecents.qnt`
  invariants were listed by name, not compared line by line.
- AOSP image scripts and tests for roles and owner telephony (`test/aosp-owner-telephony`, `aosp-telephony-roles`,
  `aosp-telephony-setup`, `scripts/**` role overlays): file presence only; whether the port's scripts still
  satisfy them was not checked.
- Upstream `eliza-vs/spec/os/android/{phone,messages,contacts,voicemail}.md` against the Alpha fork
  `AlphaTelephonyBase.java`, method by method (only method names and the send admission were compared).
- Voice during calls (`test/voice-call-pause.test.mjs`, 14 titles): only `call-bar.vibe:105-114` was read.
- Shell items of AP-16: AC-02, AC-04, AC-05, AC-07, AC-13, AC-28 (stage layout, sheet fit, motion, contrast).
- Assistant-side telephony behaviour: card recovery and session binding, the mismatch notice and agent
  rejection (#1397), selected-read context binding, `eval-phone-actions`.
- Launcher update deferral during calls and `phone-location` (other slices).
