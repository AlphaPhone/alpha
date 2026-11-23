# Alpha Phone parity audit: inbox

Slice: Gmail accounts, threads, reader, drafts, attachments, reviewed send, operations journal,
suggestions, share-to-email-draft (#1414), resident Gmail mailbox helper.
Legacy `alpha-develop` dd63c6bc, port `alpha-vs` 3d7ca972, upstream `eliza-vs` / `eliza-develop`.
Read-only, code-only: nothing was generated, built or run. Paths are relative to the tree named.
`L:` = `alpha-develop`, `P:` = `alpha-vs`, `U:` = `eliza-vs`, `UL:` = `eliza-develop`.

## Summary

| Class | Count |
| --- | --- |
| OK | 30 |
| CHANGED | 9 |
| UNIMPLEMENTED | 7 |
| UNMODELED | 2 |
| MISSING | 4 |
| KNOWN | 7 |
| RETIRED | 0 |
| UNVERIFIED (inside items above) | 3 |

Verdict: **not at parity.** The core send path is sound when everything works: the proposal is
recorded before review, the dispatch is recorded before the request, a lost answer is resolved by a
receipt read and never by a second dispatch, and the previous version's drafts are adopted from the
right slot names. But the durable-state edges, which matter most here, have gaps. A send in flight
across the update can go out twice (known, and worse than the open-items bullet says). The journal
and drafts silently fall back to memory when the secure store misbehaves, because Android refuses
the `~held` keys. All accounts' drafts and all operations now share one 8 MiB slot each, and an
operation record stores its attachments twice, so a send with roughly 3 MiB of attachments cannot be
journaled. Beyond storage: replies ignore Reply-To, a settled receipt blocks the next archive, a
composer edited during preparation is sent stale, the app-update flush is not wired, saved mail and
the remembered account are never restored on a cold start, and three fixes from the last three weeks
(#1412, the cached-Inbox fixes of 11-09/11-12, the expired-key read-state fix) are regressed. The
slice has no conformance drivers and no proofs.

## Gaps

Most severe first.

### 1. KNOWN (understated): a send in flight across the update can be sent twice
- Behaviour: an operation recorded as dispatching or outcome-unknown before the update must block a
  re-send and be resolved by its receipt after it.
- Legacy: journal slot `inbox-operation:v1:<sha256>` (`L:android/app/src/main/java/ai/alphacompute/alphaphone/Slots.java:35`,
  `L:apps/app/src/runtime/inbox-local-store.ts:9`); restore and receipt guard
  `L:apps/app/src/runtime/inbox-operation.ts:36-75`, `L:apps/app/src/ui/mailbox/review-controller.ts:628-648`.
- Port: `P:apps/app/src/inbox/previous.vibe` adopts only the three draft slots; nothing reads
  `inbox-operation:v1:*`. Open-items line 33 ("old inbox operation records ... move or drop?").
- What the bullet does not say:
  - the draft of that send *is* adopted, onto the shelf as an ordinary draft (`previous.vibe:142-153`),
    not marked `earlier`, so the owner finds it in Drafts and one tap sends it under a new request id;
  - chat-reviewed emails changed their request-id derivation (legacy uuidv5 over
    `[messageId, grant, from, proposal]`, `L:apps/app/src/ui/mailbox/agent-email-draft.ts:11-37`; port
    SHA-256 over `["assistant-email", requestId, grant, to, subject, body]`,
    `P:apps/app/src/inbox/text.ts:93-100`, `P:apps/app/src/inbox/handoffs.vibe:33`), so Cloud's
    request-id idempotency does not catch a retry from the chat card either;
  - the legacy slot is never cleared.
- Impact: a duplicate email to a real recipient.
- Smallest fix: rule in `spec/inbox/operations.md` ("an operation the previous version recorded is
  kept as its account's operation until its receipt settles"); in `previous.vibe`, adopt
  `inbox-operation:v1:<key>` before the drafts and seed the journal with a Dispatching/Observed record
  under the legacy request id, so `MailOperations.refresh` reads the receipt and `sent` cleans up the
  adopted draft.

### 2. KNOWN (unmet) + UNMODELED: drafts and the journal fall back to memory, and sends go un-journaled
- Behaviour: a stored value that does not read back is held for review and never written over; a
  send is always recorded durably before it is dispatched.
- Port:
  - `storedOrHeld` returns the in-memory `fresh` machine when the store cannot be read, or when the
    held copy cannot be written (`P:apps/app/src/platform/device-storage.vibe:95-110`);
  - the held key is `alpha/device/inbox/drafts~held` (`device-storage.vibe:32-34`), slot
    `device:alpha/device/inbox/drafts~held` (`P:apps/app/src/inbox/store.vibe:27`);
  - Android admits only `device:alpha/device/inbox/[a-z/-]{1,64}`
    (`P:android/app/src/main/java/ai/alphacompute/alphaphone/RendererCredentialSlots.java:56`), matched
    whole (`U:packages/os/android/secure-store/src/main/java/ai/eliza/plugins/securestore/nativeonly/SecureSlotPolicy.java:87`).
    `~` is not in the class, so every hold is refused.
- Consequence: after any stored value fails `decodeState` (a later schema change, a damaged slot), or
  after one failed secure-store read at start, the Inbox runs on memory for the session, and in the
  decode case for every session after, since the bad value is never cleared. Drafts written are lost
  at exit, and `confirm` dispatches with no durable record (`P:apps/app/src/inbox/operations.vibe:146-158`).
  No UI says so (open-items line 89).
- Legacy: storage failure blocked the composer with its own status ("Storage unavailable", "Saved
  drafts need recovery": `L:apps/app/src/prototype/inbox-unsaved.ts:12-19`,
  `L:apps/app/src/ui/mailbox/drafts-controller.ts:890-893`) and offered a reviewed reset (test
  `L:test/browser/inbox-unsaved-recovery.spec.ts` "damaged recovery copy can reset ...").
- Open-items lines 89 and 98 list the two halves as to-dos; neither names this outcome.
- Smallest fix: admit `~held` in the Android pattern (`[a-z/~-]`); add a rule to
  `spec/inbox/operations.md` that nothing is dispatched while the journal is not durable, and make
  `operations.vibe` refuse `confirm` when the journal machine is the in-memory fallback.

### 3. CHANGED: one 8 MiB slot for everything, attachments stored twice, and a refused write is silent
- Behaviour: each account's saved draft, shelf, recovery copy and operation had its own 8 MiB slot.
- Legacy: `inbox-drafts:v1:<owner>`, `inbox-drafts:v1:shelf:<sha>`, `inbox-drafts:v1:unsaved:<sha>`,
  `inbox-operation:v1:<sha>`, 8 MiB each (`L:apps/app/src/runtime/inbox-local-store.ts:20-22`,
  `L:.../RendererCredentialSlots.java:26`); status copy on refusal `L:apps/app/src/prototype/inbox-unsaved.ts:12-19`.
- Port:
  - all accounts' drafts are one value under `device:alpha/device/inbox/drafts`, all operations one
    value under `.../operations` (`P:apps/app/src/inbox/store.vibe:8-11`), 8 MiB each
    (`RendererCredentialSlots.java:56`);
  - every event reads, decodes and rewrites the whole value (`U:vibestack/gen/vibe.ts:140-183`),
    including each coalesced keystroke write;
  - the model bounds one draft (`draftBytesLimit`, `spec/inbox/drafts.md:39,88-92`) and one shelf
    (`shelfBytes`), not the stored value;
  - an operation record holds the attachments in `proposal.mail.files` and again inside
    `composer.content = canonicalJson(draft.fields)` (`P:apps/app/src/inbox/operations.vibe:29-31,223-225`).
    Base64 of the 5 MiB policy limit is 6.7 MiB, so a send with more than about 2.9 MiB of attachments
    exceeds 8 MiB although `proposalLimit` (7.5 MiB) admits it;
  - a refused store write makes `send` die (`vibe.ts:170-172`); the shells only `catch () => undefined`
    (`composer.vibe:114-116`, `operations.vibe:75-77`). No sentence reaches the owner.
- UNVERIFIED: whether VibeLang's `catch` also catches a died `send`. If not, the forked binding loops
  (`composer.vibe:200-209`, `operations.vibe:177-198`) end on the first refused write.
- Impact: larger attachments cannot be sent on the phone; two accounts with attachment drafts stop
  saving; typing rewrites megabytes per pause.
- Smallest fix: `spec/inbox/operations.md`: drop the file bytes from `ComposerRef.content` (bind a
  digest); `store.vibe`: key drafts and operations per account (`keys.savedMail` already shows the
  shape) or raise the native limit to match the model; surface a refusal in `ComposerView.tsx`.

### 4. UNIMPLEMENTED: replies ignore Reply-To
- Behaviour: a reply goes to the message's Reply-To, else its sender.
- Legacy: `L:apps/app/src/ui/mailbox/drafts-controller.ts:1143-1149,1813`
  (`reply.replyTo || reply.fromEmail`); wire field parsed at `UL:plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts:216`.
- Port: rule `spec/inbox/drafts.md:213-219`, model field `spec/inbox/reader.md:26`; the shell sets
  `replyTo: ""` always (`P:apps/app/src/inbox/gmail.vibe:120`, `saved.vibe:52`), and
  `U:packages/inbox/src` has no `replyTo` anywhere. `composer.vibe:245` therefore always uses the sender.
- Impact: replies to lists, ticket systems and no-reply senders go to the wrong address.
- Smallest fix: add `replyTo` to upstream `GmailReadResult`/`wire.schema.vibe`, then fill it in
  `gmail.vibe` `body()`.

### 5. CHANGED: a settled receipt blocks the next mailbox change
- Behaviour: after a confirmed send or change, the next archive, Trash, star, swipe or batch starts
  at once.
- Legacy: a settled record is cleared before the next one
  (`L:apps/app/src/ui/mailbox/review-controller.ts:553-566,693-708`).
- Port: `canPrepare` needs `not(hasRecord)` (`spec/inbox/operations.md:135-137`); only `sendDraft`
  replaces a settled record (`operations.vibe:219-220`). `prepare` for a label change answers
  `"Refused"` (`operations.vibe:138-143`), which the screen words as "This account has not allowed
  this change" (`P:apps/app/src/web/inbox/messages.ts:89`). A succeeded send is never cleared by
  itself, and its "Mail review / receipt" button is hidden (`InboxScreen.tsx:159`). The batch path
  clears between items but not before the first (`selection.vibe:91-95`).
- Impact: after one sent email or one archive, every further change is refused until the owner
  closes the old receipt.
- Smallest fix: `spec/inbox/operations.md`: let `prepare` replace a clearable settled record
  (`clearable(r)` and Observed); nothing in the shell changes.

### 6. CHANGED: an email edited while Gmail reviews it is sent as it was
- Behaviour: Send never dispatches a composer that changed during preparation.
- Legacy: `L:apps/app/src/ui/mailbox/review-controller.ts:602-606` ("Email changed before sending.
  Check it and tap Send again."); test `L:test/inbox-operation-guards.test.mjs:277`.
- Port: `sendDraft` computes `shown` before `prepare` and passes the same value to `confirm`
  (`operations.vibe:206-230`), so `canConfirm`'s `shown == r.composer` always holds. The fields stay
  editable while busy (`ComposerView.tsx:111-114`; only the buttons are disabled).
- Impact: the email leaves without the last words typed; the draft stays open with them.
- Smallest fix: in `operations.vibe` `sendDraft`, read the open draft again after `prepare` and pass
  its `composerRef` to `confirm` (or call `discardStale`, which has no caller today).

### 7. UNIMPLEMENTED: the waiting edit is not written before an app update
- Behaviour: preparing an update writes the waiting edit, verifies it, and refuses while Inbox work
  is open.
- Legacy: `L:apps/app/src/prototype/inbox-cloud-adapter.ts:459-464` (`flushInboxForAppUpdate`, refuses
  with an open composer, review, selection or attachment), `inbox-drafts.ts:25-31`,
  `inbox-unsaved.ts:51-58` (flush plus readback), wired at `L:apps/app/src/main.tsx:396-397`; commit
  4b823be31.
- Port: rule text `spec/inbox/drafts.md:434-437`, `spec/settings/updates.md:163-168`. `keepDrafts`
  only blurs the focused field (`P:apps/app/src/shell/activity.vibe:45-48`); nothing calls
  `MailComposer.flush`, and the composer writes 300 ms to 1.5 s after typing (`composer.vibe:254-264`).
- Impact: up to 1.5 s of typing lost at activation; an update can activate under an open review.
- Smallest fix: `activity.vibe` `keepDrafts` calls a keeper port that Inbox fills with
  `MailComposer.flush` and answers false on a refusal.

### 8. CHANGED: a chat email edited after an undispatched prepare stays unsent (regresses #1412)
- Legacy: an unsent review under another request id is prepared again
  (`L:apps/app/src/ui/mailbox/review-controller.ts:571-584`); tests
  `L:test/inbox-operation-guards.test.mjs` "a chat draft Send prepares again over its unsent review ..."
  and "... after an undispatched prepare is sent once under the ID its content names".
- Port: `busy` is true for any record whose receipt is not succeeded or rejected, including a
  Preparing/Reviewing one (`P:apps/app/src/inbox/handoffs.vibe:38-39`), so the edited version answers
  `Unsent` until the owner cancels the old review inside Inbox. The composer path has `ReplaceUnsent`
  (`spec/inbox/operations.md:220`); the chat path does not use `sendStep`.
- Smallest fix: `handoffs.vibe`: decide with `sendStep` and clear an unsent composer-kind record first.

### 9. UNIMPLEMENTED: saved accounts, saved mail and the remembered account are never restored
- Behaviour: a cold start shows the saved account and list read-only at once, and opens on the
  account chosen last.
- Legacy: commits ef25ebebe, 23d33c65d (11-09), 4c5c5e327, ea4d5722f (11-12); tests
  `L:test/browser/gmail-mvp-scope.spec.ts` "re-opening Inbox reuses its verified cached list",
  `L:test/browser/home-inbox.spec.ts` "opening Inbox shows saved mail while ..."; account choice
  `L:apps/app/src/runtime/gmail-account-selection.ts:7`.
- Port: rules `spec/inbox/accounts.md` "Saved accounts show at once ...", `spec/inbox/mailbox.md` "A
  saved list shows only before the first read". `InboxAccounts.restoreSaved` has no caller
  (`P:apps/app/src/inbox/accounts.vibe:141-146`), and it is the only caller of `saved.restore`, so the
  saved document is written (`saved.vibe:128-137`) and never read. `hint` is therefore empty at every
  start and `accountsRead` selects the first readable account.
- Impact: "Loading Inbox…" on every cold start; with two accounts, the Inbox, its drafts view and the
  background watch jump back to the first account after each restart.
- Smallest fix: call `restoreSaved()` from the accounts layer when a session with an owner is first
  seen (before `refresh`).

### 10. UNIMPLEMENTED: capabilities are read once per binding
- Port: `gmail.capabilities` runs only when the selected key changes (`operations.vibe:181-191`); a
  failed read sends `capabilitiesFailed` and is not retried; a consent upgrade that keeps the grant
  id does not read again, so `caps.send` stays false (`InboxScreen.tsx:118`).
- Legacy: grant changes re-derive access on each account read
  (`L:apps/app/src/prototype/inbox-cloud-adapter.ts:684-690`, `gmailGrantChange`).
- UNVERIFIED: whether Cloud issues a new grant id on an incremental consent (then the key changes
  and this half does not occur). The no-retry half stands either way.
- Smallest fix: `operations.vibe`: read capabilities again on every `Checked` account read whose
  capabilities differ, and on Retry.

### 11. CHANGED: saved mail moved from the encrypted slot to WebView localStorage
- Legacy: `connected-read-cache:v1:<sha256>` secure slot (`L:apps/app/src/runtime/service-read-cache-store.ts:16-18`).
- Port: `inbox-mailbox:v1:<sha256>` through the platform KeyValueStore
  (`saved.vibe:77-97`), which is `localStorage` (`P:apps/app/src/platform/storage.vibe:12`,
  `layers.vibe:23`). `keys.savedMail` (`store.vibe:11`) is unused. The legacy slot is never read or
  cleared, so old mail stays in the old store.
- Impact: up to 8 lists and 16 bodies at rest unencrypted; stale legacy mail never removed.
- Smallest fix: give `saved` the `mailStore` layer (and a slot pattern), and clear the legacy slot once.

### 12. MISSING (KNOWN only as "no model"): the agent's Gmail body reads and mailbox changes
- Legacy: `L:scripts/gmail-agent-read-host.ts` over `UL:packages/app/src/runtime/managed-google-agent/*`
  (2,698 lines): exact body reads capped at 32,000 characters, agent archive/Trash/mark read/unread
  under a durable turn id with one dispatch (`gmail-agent-mailbox-host.ts:14-54`), two-account
  refusal; 36 tests in `L:test/gmail-agent-read-host.test.mjs`; `GmailAgentMailboxRecovery.qnt`.
- Port: `P:android/agent/policy.json:8` admits `INBOX_READ` and `INBOX_COMPOSE_EMAIL` only;
  `U:packages/inbox/src/agent/read.vibe:75` is a bounded search (no body read), and no agent change
  action exists upstream. Open-items line 25 says only that the helper "has no model".
- UNVERIFIED: whether the legacy phone build exposed the change actions to the on-device agent.
- Smallest fix: owner decision; if kept, upstream `spec/inbox/managedRead.md` gains a body read and a
  reviewed change, mirrored in `packages/inbox/src/agent/`.

### 13. CHANGED: Home shows a count only, and reads nothing
- Legacy: unread subject and sender rows (`L:apps/app/src/prototype/home-overview-cards.ts:60-71`) from
  one header read before Inbox opens (`L:apps/app/src/prototype/inbox-cloud-adapter.ts:285-295`); 15
  tests in `L:test/browser/home-inbox.spec.ts`.
- Port: count button only (`P:apps/app/src/web/inbox/index.tsx:33-44`); "Home never reads mail"
  (`P:apps/app/spec/shell/overview.md:109-113`). With gap 9, Home has no count until Inbox was opened
  in this process. Deliberate in the spec; not in the open-items doc.

### 14. CHANGED: To suggestions no longer come from Contacts
- Legacy: `L:apps/app/src/prototype/inbox-cloud-adapter.ts:452-458` (`openContacts`, `allowContacts`,
  `readRecipients`); test `L:test/browser/dev-inbox.spec.ts` "a selected contact remains a valid local recipient".
- Port: recent mail addresses only (`spec/inbox/drafts.md:266-271`, `composer.vibe:85-96`). Stated in
  the spec; not in the open-items doc.

### 15. UNIMPLEMENTED: a refused edit is dropped without a word
- Port: `conflict` is set and never read (`composer.vibe:111,132`); the rule says the composer
  reloads (`spec/inbox/drafts.md:112-113`). An edit refused for size, bounds or revision is lost; the
  screen keeps showing the text.
- Legacy: review before replacing (`L:test/browser/inbox-unsaved-recovery.spec.ts` "competing windows
  require review ..."), status copy `inbox-unsaved.ts:12-19`.
- Smallest fix: expose `conflict` from `MailComposer` and show `composerRefusal.changed` in `ComposerView.tsx`.

### 16. CHANGED: previous drafts are not adopted on the Alpha Cloud deployment
- Port: `previousEnvironments` maps only `ElizaCloud/*` (`previous.vibe:20,28-35`); test "An account
  outside Eliza Cloud has no previous drafts" pins it.
- Legacy: cutover builds key drafts under the same `"production"` environment
  (`L:apps/app/src/runtime/cloud-protocol.ts:31`, `L:scripts/cloud-deployment-policy.ts:57-61`).
- Impact: drafts written on a legacy Alpha Cloud (cutover) build are invisible after the port; they
  stay in their slots. Low if no such build is in owners' hands.
- Smallest fix: map `AlphaCloud/Production` to `production` when the legacy build was a cutover build.

### 17. CHANGED: adoption edge cases
- A recovery copy replaces a same-id saved draft even when the saved one is newer
  (`previous.vibe:137-141`, first slot wins); legacy compared `baseRevision`
  (`L:apps/app/src/ui/mailbox/drafts-controller.ts:895-900`, test "restored edits cannot replace a newer
  explicitly saved draft").
- Drafts that do not fit the single shelf budget stay in their legacy slots with no notice
  (`previous.vibe:147-149`); safe, but the owner never sees them.

### 18. UNIMPLEMENTED: journal notices and `discardStale`
- `discardStale` has no caller (`operations.vibe:254-257`); `journal.notice` (ReviewChanged,
  ReviewDiscarded, AccessWithdrawn) is never shown (`InboxScreen.tsx` reads none); `AnswerRefused`
  has no transition (`spec/inbox/operations.md:114`).
- Legacy sentence for a regressed receipt: `L:apps/app/src/runtime/inbox-operation.ts:36`. The guard
  itself is implemented (`canAnswered`, `spec/inbox/operations.md:286-293`); only the wording is gone.

### 19. UNIMPLEMENTED: an expired sign-in during a read-state change is swallowed
- Legacy: commit 218a1ddfd (`L:apps/app/src/prototype/inbox-cloud-adapter.ts`, explicit change shows the
  sign-in message).
- Port: `setRead` catches everything and records `readUnconfirmed` (`reader.vibe:119-131`); no
  `accounts.refresh()`.

### 20. UNMODELED: mark read/unread bypasses the journal
- `reader.vibe:116-131` prepares and dispatches directly under a fresh id, with no record, while
  `spec/inbox/operations.md:3-7` says every change is one journaled operation. Low stakes; the model
  and the shell disagree.

### 21. KNOWN items confirmed
- Suggestions unwired (open-items line 24): `MailSuggestions` has no UI consumer; `SuggestionReview`
  is mounted nowhere.
- `inbox-drafts:v1:chat:<sha256>` not adopted by Inbox (line 35).
- Hardware Back and the open search field (line 58).
- Mock mode / development mailbox (`L:apps/app/src/browser/simulated-inbox.ts`) has no runtime (line 10).
- Digest retention models stay with Workflows (line 91).

### 22. Vibestack usage
- MISSING: no `.proof.dfy` under `P:apps/app/spec/inbox/`. Legacy proofs:
  `L:specs/lemma/apps/app/src/runtime/inbox-operation.dfy` (regressed receipt),
  `inbox-edit-coalescer.dfy` (five `ensures`; the Quint laws at `spec/inbox/drafts.md:447-452` cover
  four over small value sets, and "full delay when it fits" is absent), `gmail-mailbox.dfy` (newest
  bodies that fit; `U:spec/inbox/reads.proof.dfy` proves list uniqueness, not the size bound).
- MISSING: no conformance driver for any `inbox__*` module (`P:apps/app/test/drivers/` has 10, none
  for inbox). 33 tests in `P:apps/app/test/inbox/` stand for about 300 legacy titles and nine legacy
  refinement suites (`quint-inbox-*`, `quint-email-suggestion-review`, `quint-native-gmail-background`).
- MISSING: `P:scripts/legacy-retirement.json` marks all 152 inbox legacy files "mapped"; 38 point to
  `apps/app/spec/inbox/digest.md` and 3 to `apps/app/spec/inbox/agentDrafts.md`, which do not exist,
  and 98 point to `index.md`, which has no rules.
- UNMODELED: the shell decides what the model already decides: `sendFeedback`
  (`spec/inbox/operations.md:403-411`) and `writeDue` (`drafts.md:453`) are used nowhere;
  `operations.vibe:88-97`, `messages.ts:95-101` and `composer.vibe:123-143` re-implement them, and
  `InboxScreen.tsx:212` re-derives `canConfirm`.
- One Quint block has no invariant, law, step or witness: "Deleting drafts removes exactly the
  versions the owner selected" (`spec/inbox/drafts.md:190-206`).
- `InboxScreen.tsx` has no `.meta.tsx` (the six leaf components do).
- The legacy inbox tests and Quint models are still in the port tree and target removed code.

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| One operation per account, recorded before review | `ui/mailbox/review-controller.ts` | operations.md "A proposal is recorded ..." | `inbox/operations.vibe:138-144` |
| Dispatch recorded before the request leaves | upstream operation-journal | operations.md "Confirming records the dispatch ..." | `operations.vibe:146-158` |
| Lost dispatch answer: receipt read, never a second dispatch | `test/inbox-operation-guards.test.mjs` | operations.md "An answer is adopted only ..." | `operations.vibe:160-175,189-190` |
| Prepared answer after an outcome is refused | `runtime/inbox-operation.ts:44-51` | operations.md `canAnswered` | `operations.vibe:166-175` |
| Review must echo the proposal, files and digest | upstream journal | operations.md "Gmail's review must match ..." | `inbox/gmail.vibe:149-168,272-279` |
| Second tap continues the same send; sent content never sent again | #1340 | operations.md `sendStep` | `operations.vibe:206-222` |
| Unresolved operation blocks every send | review-controller.ts:632-648 | operations.md `lawAnUnresolvedOperationBlocksEverySend` | `operations.vibe:217` |
| Cleanup removes only the exact sent copy, marks other versions earlier | drafts-controller.ts:765-800 | drafts.md "A confirmed send removes only ..." | `operations.vibe:110-113` |
| Restored confirmed send held until confirmed again | InboxCleanup.qnt | operations.md "Local cleanup waits ..." | `operations.vibe:170,189-190` |
| Sent announced once | #1365 | operations.md `announce` | `operations.vibe:114` |
| Previous saved draft, shelf and recovery copy adopted; slots cleared only when all kept | drafts-controller.ts:464,630; inbox-unsaved.ts:35-36 | drafts.md "A draft the previous version kept ..." | `inbox/previous.vibe:98-176` (names, binding and record shapes match) |
| Legacy slots still readable natively | `AlphaConnectionPlugin` | platform/storage.md | `android/.../AlphaConnectionPlugin.java:151-170`, `RendererCredentialSlots.java:43` |
| Drafts stay with their account; only a new email moves | f41b55ec3 | drafts.md "Only a new email moves ..." | `composer.vibe:314-327` |
| Shelf of 50, Back sets aside, refused when full | #1334 | drafts.md "Back sets the draft aside ..." | `composer.vibe:280-294` |
| Replying again reopens the Back-saved reply | #1340 | drafts.md `threadReply` | `composer.vibe:226-234` |
| Coalesced edits, flushed on hide, leave and account change | `runtime/inbox-edit-coalescer.ts` | drafts.md "Edits are coalesced ..." | `composer.vibe:182-209,254-264` |
| Reply all without own address, each once | drafts-controller.ts:1143-1160 | drafts.md `replyRecipients` | `composer.vibe:245-252` |
| Forward keeps originals only with capability, revision and size | drafts-controller.ts | drafts.md `forwardKeepsOriginals` | `composer.vibe:237-243` |
| Incomplete address blocks Send | `test/agent-email-draft.test.mjs` | drafts.md `pendingTo` | `composer.vibe:344` |
| Attachment type, bytes and digest checked, policy applied | `test/mail-attachment-refusals.test.mjs` | attachments.md | `composer.vibe:160-174`, `inbox/files.ts` |
| Files share starts a new draft, read twice, account-bound (#1414) | `prototype/file-email-review.ts` | attachments.md "A shared file always starts ..." | `composer.vibe:354-365`, `inbox/shareTarget.vibe`, `files/share.vibe:67-92` |
| Chat-reviewed email: one operation per reviewed version | `ui/mailbox/agent-email-draft.ts` | operations.md "A chat-reviewed email ..." | `inbox/handoffs.vibe:24-51` (see gap 8) |
| `gmail.local-compose.v1` advertised only when offered | agent-email-draft.ts | operations.md `inboxAdvertised` | `handoffs.vibe:96-98` |
| Swipe left archives at the revision read now | `test/browser/gmail-mvp-scope.spec.ts` | operations.md `swipeArchives` | `operations.vibe:258-262` |
| Undo, continue Gmail draft, delete Gmail draft | review-controller.ts | operations.md "A confirmed result offers ..." | `operations.vibe:263-292` |
| Gmail draft edited here only if plain, unthreaded, no attachments | `test/browser/inbox-folders-drafts.spec.ts` | drafts.md `editableHere` | `composer.vibe:328-338` |
| Auto mark-read once, never again after an unconfirmed outcome | gmail-mvp-scope.spec.ts | reader.md "An automatic change ..." | `reader.vibe:112-135` |
| Attachment opened or saved only as reviewed bytes, in the active review | 5c3c942a8 | reader.md, attachments.md | `reader.vibe:196-240` |
| Link opens only over HTTPS, in this opening, after review | `test/inbox-link-review-lifetime.test.mjs` | reader.md "A mail link opens only ..." | `reader.vibe:247-262` |
| Batch selection: one by one, stop at the first doubtful result | #1343 | selection.md | `inbox/selection.vibe:71-99` |

Also identical or matching: the native Gmail classes (`GmailBackground`, `GmailDeliveryWorker`,
`GmailNoticePoster`, `AlphaGmailPlugin`, `HostedInbox`, `AlphaMailFileProvider`, `AlphaMailPdfActivity`
differ by 0 lines from legacy; `AlphaMailAttachmentsPlugin` by 1), the `AlphaGmail` methods the
shell calls (`notices.vibe:59-202`), sender images (`text.ts:46-57` equals
`L:runtime/mail-sender-image.ts`), and Load images defaulting to on (`spec/settings/preferences.md:26`).

## Not covered

- Port code not read line by line: `src/inbox/mailbox.vibe`, `notices.vibe`, `suggestions.vibe`,
  `html.ts`, `files.ts`, `back.vibe`, `wire.schema.vibe`; UI behaviour and layout of `MailList.tsx`,
  `MessageView.tsx`, `DraftsList.tsx`, `NoticeAskSheet.tsx` against the legacy layout specs
  (`inbox-attachment-layout`, `inbox-compose-layout`, `inbox-message-layout`, `mail-controls`,
  `mail-images`, `mail-preview`, `inbox-hostile-attachment`, `inbox-save-attachment`).
- Spec files read as prose only (Quint not checked rule by rule): `accounts.md`, `mailbox.md`,
  `reader.md`, `attachments.md`, `selection.md`, `suggestions.md`, `notices.md`, `failures.md`.
- All digest items in the lists: every `digest-*`/`dev-digest-*`/`hosted-digest-*` test,
  `HostedDigest*.qnt`, `RendererDigestQueue.qnt`, `RendererHostedInbox.qnt`, `NativeHostedInbox.qnt`,
  `NativeDigestConsent.qnt`, `DevelopmentDigestPending.qnt`, `hosted-digests.dfy`, `journey-d-digests`.
- Listed files that belong to other areas: `assistant-draft-*` specs, `assistant-empty-draft`,
  `DraftDispatch.qnt`, `agent-email-card.production.spec.ts` (assistant); `message-draft.test.mjs`
  (telephony); `workflow-draft-reopen.test.mjs` (workflows); `PasswordEntryDraft.qnt`,
  `NativeVoiceDraft.qnt`; the Calendar half of `gmail-agent-read-host.test.mjs`.
- `FirstSendDraftMigration.qnt` (an older legacy-to-legacy migration) and whether phones that skipped
  it hold a slot shape `previous.schema.vibe` does not read.
- The browser build's legacy storage (`BrowserJsonDomainDocument` envelope) against
  `previous.vibe`'s browser branch.
- Native: the one-line `AlphaMailAttachmentsPlugin` diff, the androidTest suites
  (`InboxDraftInstrumentedTest`, `MailAttachmentInstrumentedTest`, `LargeInboxAttachmentInstrumentedTest`),
  `NativeGmailBackground.qnt` and its JVM traces against the unchanged classes.
- Upstream `U:packages/inbox` against `UL:plugins/plugin-inbox` beyond `replyTo`, the agent actions
  and the unused operation journal; Cloud's managed Gmail routes.
- Settings-side Gmail flows in `gmail-mvp-scope.spec.ts` and `gmail-grant-recovery.spec.ts`
  (disconnect, reconnect, read-back), and `journey-f-email-notifications.spec.ts` end to end.
- Sign-out: whether the saved-mail document and the drafts are forgotten as legacy did.
- Anything that needs execution: generated names, VibeLang `catch` on a died `send`, real slot sizes.
