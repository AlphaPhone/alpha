# eliza-inbox: develop `plugin-inbox` + Gmail parts of `plugin-google-workspace` vs vibestack `packages/inbox`

Trees read: `eliza-develop` at 7a124190a1, `eliza-vs` at 769b4f00d (branch `vibestack-dp`), `alpha-vs` at 3d7ca9727,
`alpha-develop`. Read-only; nothing was built, run or generated. Paths below are relative to those trees:
`dev:` = `eliza-develop/`, `vs:` = `eliza-vs/`, `alpha-vs:` and `alpha-dev:` likewise.

## Summary

- Items checked: 54. OK 26, NOT_APPLICABLE 9, gaps 19 (2 high, 6 medium, 11 low).
- Gap classes: CHANGED 11, MISSING 4, UNIMPLEMENTED 1, UNMODELED 1, UNVERIFIED 2.
- Two gaps are already named in `wave3.md` item J (#39822, #39762).
- Verdict: **not at parity.** The mailbox library (paging, caches, grants, failures, read state, attachments, the
  reviewed-operation journal, hand-off review, background notices) is ported with a spec rule and code for each
  behaviour. The agent side is not: the email the agent drafts for the phone's composer never reaches the phone
  (eliza-inbox-01), the agent can no longer read a message body (eliza-inbox-02), and the client drops `Reply-To`
  so replies are addressed to `From` (eliza-inbox-03).
- What the phone actually used on develop, established from `dev:packages/scripts/alphaphone-imports.manifest.json:1606-1753`,
  `alpha-dev:scripts/native-cloud-runtime-config-check.ts:22-23` and
  `alpha-dev:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:625`:
  the renderer imported `plugin-inbox/src/mailbox/*` (client, journal, caches, grants, drafts and review controllers);
  the on-device agent loaded `plugin-inbox` (`dev:packages/agent/src/runtime/core-plugins.ts:34`) with the managed
  Gmail read broker and operation broker set, the send broker unset, and neither
  `ELIZA_MANAGED_GMAIL_MAILBOX_CHANGES_ENABLED` nor `ELIZA_NATIVE_GOOGLE_GMAIL_SEND_ENABLED` ever set. So on the phone
  the agent read Gmail (list, search, one message body), offered INBOX triage, and handed new email to the phone's
  composer (`gmail.local-compose.v1`); it did not send or change mail itself. `plugin-google-workspace` was not in the
  APK (`dev:packages/agent/src/runtime/plugin-collector.ts:939-940`).
- In Alpha's port the renderer uses only part of the upstream package: `managedGmailClient`, the caches and saved
  document, `mailReadAhead`, failure classification, `linkTextMismatch`, `sha256Hex`, and the hand-off review
  (`alpha-vs:apps/app/src/inbox/{gmail,saved,mailbox,reader}.vibe`, `html.ts`). It does not call upstream's
  `inboxOperation`, `mailReadStateGuard`, `createMailBackground`, grants helpers, `openProviderDraft` or the
  retained-draft codec; Alpha has its own in `apps/app/src/inbox/{operations,composer,previous,notices,accounts}.vibe`.
  Drift in those upstream modules therefore does not reach the phone today; it is recorded below with that impact.

## Gaps

### eliza-inbox-01 — CHANGED, high — The email the agent drafts never reaches the phone's composer card

- Behaviour: an owner request for a new email answers with an unsent draft that the phone shows as an editable card.
- develop: `dev:plugins/plugin-assistant/src/features/messaging/triage/actions/device-email-draft.ts:59-79` returns
  `values: { mode: "local-compose", targetId: "inbox", emailDraft: { version, requestMessageId, to, subject, body } }`
  and `data: { actionName: "MESSAGE" }`; the phone read `row.values.emailDraft`
  (`alpha-dev:apps/app/src/ui/mailbox/agent-email-draft.ts:52-100`). PR #39921.
- vibestack: `vs:packages/inbox/src/agent/compose.vibe:57-58` keeps the draft in `values.emailDraft` and returns
  `data: { actionName: "INBOX_COMPOSE_EMAIL" }`. The reply frame carries only `{ action, data }`:
  `vs:packages/agent/src/conversation/turns.vibe:284-289` (`turnActions` destructures `data` only),
  `vs:packages/agent/src/client/reply-frame.schema.vibe:2`. Alpha's port decodes `result.data` as
  `{ to?, subject?, body }` with `body` required: `alpha-vs:apps/app/src/assistant/transcript.vibe:96-111`,
  `alpha-vs:apps/app/src/assistant/payloads.schema.vibe:120`. `data` has no `body`, so no card is staged.
  The rule `vs:spec/inbox/handoff.md:50-58` says the answer carries "the draft for that composer and the identity of
  the request" but names no wire shape; `vs:packages/inbox/test/inbox.test.vibe:443-444` asserts `values.emailDraft`.
- Impact: "draft an email to ana@example.com saying …" replies "Here's the draft." and shows nothing to review or send.
- Smallest fix: put `to`, `subject`, `body` and `requestMessageId` in the action result's `data` (or carry `values`
  in `ActionResultFrame`), state the shape in `spec/inbox/handoff.md`, and test it through `turnActions`.

### eliza-inbox-02 — MISSING, high — The agent cannot read a message's body

- Behaviour: "what does the email from Ana say?" reads the selected message's text, paged and revision-bound.
- develop: `dev:plugins/plugin-inbox/src/inbox/managed-gmail-adapter.ts:430-521` (`readMessageImpl`: exact id from the
  current list, `expectedRevision` on continuation, a page of at most 64 KiB at `:473`),
  `dev:plugins/plugin-inbox/src/inbox/managed-gmail-read.ts:85-129` (exact message read through the read broker).
- vibestack: the plugin has two actions, `vs:packages/inbox/src/index.vibe:19`. `INBOX_READ` lists only: sender,
  subject, snippet, time, unread (`vs:packages/inbox/src/agent/read.vibe:117-133`); nothing in `agent/` calls
  `gmailRead`. `vs:spec/inbox/managedRead.md` has two rules, both about the bounded list.
- Impact: the agent answers from a snippet or says it cannot read the message. The owner-initiated hand-off from the
  reader (`reviewMailContext`) still works.
- Smallest fix: add a message read to the plugin (by an id from the current `INBOX_READ` result) over
  `client.gmailRead`, with a text bound and a rule for it.

### eliza-inbox-03 — CHANGED, medium — `Reply-To` is dropped, so replies are addressed to `From`

- develop: `dev:plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts:216` (`replyTo`), `types.ts:124`,
  used for the reply recipient at `drafts-controller.ts:937-943` and `:1563`.
- vibestack: `MailCardWire` has no `replyTo` (`vs:packages/inbox/src/client/wire.schema.vibe:20-23`), nor has
  `GmailMessage` (`vs:packages/inbox/src/mailbox/types.vibe:91-104`). Cloud does send it
  (`vs:packages/cloud/src/google-read.vibe:139`) and binds a reply's target to `Reply-To` when present
  (`vs:packages/cloud/src/services/google/mail-compose.vibe:214-215`).
  Alpha's port fills `replyTo: ""` (`alpha-vs:apps/app/src/inbox/gmail.vibe:120`, `saved.vibe:52`) and its composer
  prefers `replyTo` only when non-empty (`composer.vibe:245`).
- Impact: a reply to a list, support desk or no-reply sender goes to `From`. Whether Cloud then refuses the reply
  because the recipient differs from its bound target was not verified.
- Smallest fix: add `replyTo: NullOr(String)` to `MailCardWire`, `GmailMessage` and the saved `Message` schema.

### eliza-inbox-04 — CHANGED, medium — "To me" and named recipients are refused by the compose action

- develop: recipients pass through as given (`device-email-draft.ts:73`); the prompt tells the planner to pass
  `to:["self"]` for "to me"/"to myself" and to recover a retried draft from the chat
  (`dev:plugins/plugin-assistant/src/services/message/context-assembly.ts:319-323`). The phone resolved `self` to
  the selected account and left an unresolved name for the owner
  (`alpha-dev:apps/app/src/prototype/agent-email-card.ts:188`).
- vibestack: `vs:packages/inbox/src/agent/compose.vibe:20,29-32` keeps only strings matching an address pattern;
  with none left the action fails with "Say who the email is to and what it should say." (`:50`). The description
  (`:67`) asks for "explicit recipient addresses" and carries none of the develop guidance.
- Impact: "email myself the list" and "email Sam …" produce no draft. Alpha's port still expects a To of
  `self`/`me`/`myself` (`alpha-vs:apps/app/spec/assistant/emailCard.md:17`, `apps/app/src/assistant/ports.vibe:19`).
- Smallest fix: admit `self`/`me`/`myself`, pass other non-address entries through unresolved, and add the two
  guidance sentences to the description; add a rule.

### eliza-inbox-05 — MISSING, medium — INBOX triage, summary and its providers are gone

- develop: `dev:plugins/plugin-inbox/src/plugin.ts:79-101` registers INBOX with subactions list, search, summarize,
  triage, reply, snooze, archive, approve (`actions/inbox.ts:1124-1135`) and the providers INBOX_TRIAGE
  (`providers/inbox-triage.ts`) and CROSS_CHANNEL_CONTEXT (`providers/cross-channel-context.ts`), backed by the
  `app_inbox` schema and the triage classifier. PR #39692 (a reasoning preamble before the classifier's JSON array)
  belongs to this.
- vibestack: no counterpart. `vs:packages/inbox/src/index.vibe:16-21` offers INBOX_READ, INBOX_COMPOSE_EMAIL and the
  INBOX_ACCESS provider. Cloud scores mail (`vs:packages/cloud/src/google-read.vibe:94-112`), but `MailCardWire`
  drops `isImportant`, `likelyReplyNeeded`, `triageScore` and `triageReason`.
- Impact: "triage my inbox" / "what needs my attention" has no classification or persisted queue; the planner can
  only list. The phone UI never called the `/api/lifeops/inbox/*` routes (no reference in `alpha-dev:apps/app/src`).
- Smallest fix: decide. Either dispose (record it as deliberately absent) or pass Cloud's triage fields through
  `INBOX_READ` and add a rule.

### eliza-inbox-06 — UNIMPLEMENTED, medium — Three drafts rules have no code path in `packages/inbox`

- Rules: "Saved and retained content belongs to the exact From account" (`vs:spec/inbox/drafts.md:15-58`),
  "Retained edits coalesce under the owner and flush on departure" (`:60-84`), "A confirmed send cleans up only
  copies of the reviewed local draft" (`:321-375`). Their definitions `preferredCopy`, `localWriteAllowed`,
  `mayClearOldCopies`, `mayClearRetained`, `retainedWriteDue`, `decideSavedCleanup`, `decideShelfCleanup`,
  `cleanupAllowed` are imported by nothing under `vs:packages/inbox/src` or `test`.
- develop: `dev:plugins/plugin-inbox/src/mailbox/drafts-controller.ts` (2,199 lines: saved slot, shelf of 50, 8 MiB
  bound, retained edits, prefill for reply/reply-all/forward, attachment picker) and `review-controller.ts` (852
  lines: review, confirm, cleanup after a confirmed send). PR #39748 (fenced async confirmations,
  `drafts-controller.ts:154-183`, `:446`) changed the first; the ledger marks it skipped.
- vibestack: only `retained-draft.vibe` (codec), `provider-draft.vibe` (open a provider draft) and the journal.
  Alpha's port carries its own `composer.vibe`, `previous.vibe`, `operations.vibe`.
- Impact on the phone: none from upstream, because the port reimplemented this; the alpha auditor has to confirm
  #39748 and the shelf/retained behaviour there. Upstream states rules that nothing implements.
- Smallest fix: move the three rules to Alpha's app spec, or port a drafts controller upstream.

### eliza-inbox-07 — CHANGED, medium — Compose is offered on any device turn; the capability and owner-turn checks are gone

- develop: offered only when the phone negotiated `gmail.local-compose.v1`
  (`dev:plugins/plugin-assistant/src/services/device-actions/service.ts:1093-1099`), and only for the live owner
  turn: active, current, same message id/room/entity/text, request owner, fresh requested message id (`:1142-1167`).
  The result ends the turn (`device-email-draft.ts:65-66`).
- vibestack: `composerAvailable` and `validate` are `message.content.source === "device"`
  (`vs:packages/inbox/src/agent/compose.vibe:41,76`); `ownerTurn` is "the message id is a UUID" (`:40`), which is not
  what `vs:spec/inbox/handoff.md:57-58` ("a request not from the current owner turn hands nothing off") says. The
  capability vocabulary has no `gmail.local-compose.v1` (`vs:spec/agent/deviceActions/capabilities.md:60-66`); a
  header naming an unknown capability is refused whole (`:72-77`). No `turnComplete`/`continueChain`.
- Impact: a client that cannot show the card is still told "Here's the draft."; the role gate (OWNER) is the only
  owner check left.
- Smallest fix: add the capability to the agent vocabulary and gate the action on it; state what "owner turn" checks.

### eliza-inbox-08 — UNVERIFIED, medium — Conformance for four of five inbox machines drives the generated model, and nothing is locked

- `vs:packages/inbox/test/drivers/inbox__drafts.ts:19`, `inbox__managedRead.ts:19`, `inbox__readState.ts:19`,
  `inbox__backgroundNotices.ts:19` dispatch each event into a thin wrapper over the generated machine
  (`journalModel().step`, `managedReadSession().step`, …), not into `inboxOperation`, `managedInboxRead`,
  `mailReadStateGuard.set` or `noticeTapSession`. Only `inbox__reads.ts:33-47` drives an implementation
  (`mailboxFeed`). The implementations are covered by seven journeys in `inbox.test.vibe:188-448`.
- `vs:spec/lock.json` has entries for `spec/app/*` and `spec/index.md` only; no `spec/inbox/*` rule is accepted and
  the status of `spec/inbox/reads.proof.dfy` is not recorded. Every inbox rule does have a Quint block (35 of 35).
- Impact: the journal's one-dispatch property is proved of the model and exercised by one journey, not by conformance.
- Smallest fix: drive `inboxOperation`/`managedInboxRead`/`mailReadStateGuard` from the drivers; run `check` and
  commit the lock.

### eliza-inbox-09 — CHANGED, low — No routing for "show my sent mail" (#39866)

- develop: `dev:plugins/plugin-inbox/src/plugin.ts:27-40,63-70` routes a direct sent-mail read to a search with
  `in:sent`; the description says `limit=1` for the latest.
- vibestack: no routing rule registered by the plugin (core has `direct-action-routing.vibe`); the `query`
  parameter lists `"in:sent"` as an example (`vs:packages/inbox/src/agent/read.vibe:151`). No spec rule.
- Impact: depends on the planner choosing `in:sent`; "my latest sent email" may list the Inbox.
- Smallest fix: one sentence in the action description, or the routing rule.

### eliza-inbox-10 — CHANGED, low — Structured search filters and their verification are gone

- develop: `managed-gmail-adapter.ts:252-301` (`unreadOnly`, `since`), `:303-428` (sender address, labels, inclusive
  millisecond date range composed into one query, results re-filtered, and a refusal when the bounded window cannot
  prove the filter, `:420`).
- vibestack: one raw Gmail query from the planner and a required limit (`read.vibe:73-75,150-151`).
- Impact: date-bounded or sender-bounded questions depend on the planner writing Gmail syntax; nothing checks the
  result against the request.
- Smallest fix: describe `after:`/`before:`/`from:` in the parameter text; add a rule if verification is wanted.

### eliza-inbox-11 — CHANGED, low — The upstream journal accepts reviews develop refused

- develop `dev:plugins/plugin-inbox/src/mailbox/operation-journal.ts`: the receipt digest must equal the SHA-256 of
  the review (`:553-559`; same in `read-state.ts:54`); `kind`, `mode`, `replyMessageId`, `draftId`,
  `expectedDigest`, `messageId`, `expectedHistoryId` must be echoed for every kind (`:561-576`); a forward's
  `forwardSource` must name the same message and history (`:620-625`).
- vibestack `vs:packages/inbox/src/mailbox/operation-journal.vibe`: the digest only has to be well formed (`:416`);
  composer kinds check `to/cc/bcc/subject/bodyText` only (`:396-402`); `forwardMatches` never reads
  `forwardSource` (`:379-394`), although the rule says "exactly the requested original parts of the same message and
  history" (`vs:spec/inbox/outgoing.md:153-161`). `read-state.vibe:37-38` drops the digest check too.
- Impact on the phone: none today. Alpha's port checks all of this itself
  (`alpha-vs:apps/app/src/inbox/gmail.vibe:150-169,276`) and does not call `inboxOperation`.
- Smallest fix: restore the three checks upstream.

### eliza-inbox-12 — CHANGED, low — Links from HTML mail are no longer listed, and omitted links are never counted

- develop: the client validated Cloud's `links` (extracted from the HTML,
  `dev:packages/cloud/shared/src/lib/services/agent-google-connector/inbox-managed.ts:48`), kept 50 and reported how
  many were left out (`managed-gmail-client.ts:124-155,385`).
- vibestack: links are the plain-text `https` URLs of `bodyText` (`vs:packages/inbox/src/client/index.vibe:79`);
  `linkifyMailText` stops at 50 (`mailbox/links.vibe:56`), so `omittedLinks` at `client/index.vibe:88` cannot be
  set. Cloud's spec says a read answers "its links" (`vs:spec/cloud/services/google/mailRead.md:139`) but
  `mail-read.vibe` returns none.
- Impact: when the HTML body is omitted (over 512 KiB) the link list misses anchor links. When HTML is shown,
  Alpha's port collects inline links itself (`alpha-vs:apps/app/src/inbox/html.ts`).
- Smallest fix: return and validate Cloud's link list again, or delete the dead `omittedLinks` branch and say so.

### eliza-inbox-13 — CHANGED, low — INBOX_READ gives the planner Gmail's HTML-escaped snippet

- develop: the agent host decoded entities in snippet and subject
  (`dev:packages/app/src/runtime/managed-google-agent/managed-google-agent-host.ts:801-803`); the renderer had
  `decodeMailPreview` (`dev:plugins/plugin-inbox/src/mailbox/preview.ts`).
- vibestack: `snippet` is passed as Cloud sends it (`read.vibe:129-132`); `packages/inbox` has no preview decoder
  (Alpha's port has its own in `apps/app/src/inbox/text.ts`).
- Impact: `&#39;`, `&amp;` in what the agent quotes.
- Smallest fix: decode the snippet in `messageOf` or in the action result.

### eliza-inbox-14 — CHANGED, low — Account capabilities are derived, not read

- develop: Cloud's flags and attachment policy were validated and passed through
  (`managed-gmail-client.ts:392-468`: `maximumOutgoing` 1–20 default 1, `maximumBytes` ≤ 25 MiB, `searchTrash`,
  `threads` from the server).
- vibestack: derived from `kinds` and `attachmentPolicy.{mimeTypes,maxBytes}`; `maximumOutgoing` is always 10,
  `threads` and `searchTrash` always true, `maxBytes` is not range-checked
  (`vs:packages/inbox/src/client/index.vibe:108-132`). The clause "fewer when the account's policy says so; an older
  server that allows one names that" (`vs:spec/inbox/outgoing.md:19-20`) has no input that can make it true.
- Impact: none against vibestack Cloud (`vs:packages/cloud/src/services/google/mail-read.vibe:308`); against a Cloud
  that still answers develop's shape the decode fails. No rule covers the derivation.
- Smallest fix: a rule for the derivation; bound `maxBytes`.

### eliza-inbox-15 — CHANGED, low — Wire fields and calls the develop client had

- `hasAttachments` on a listed message (`managed-gmail-client.ts:204-225`, `types.ts:130`): dropped.
- `gmailDraft` (metadata and digest only, `:710-730`): removed.
- `opaque=1` on the opaque attachment read with `data.opaque === true` required (`:557-567`) and `content=1` on the
  draft read (`:636`): not sent or checked (`vs:packages/inbox/src/client/index.vibe:217-223,234-243`).
- `mailboxHistoryId` and `supportsSpamTrash` were optional ("older Cloud servers omit it", `:275-331`) and are now
  required (`wire.schema.vibe:27`, `client/index.vibe:174`); `identity` is required on a connection (`:7-14`).
- Impact: none against vibestack Cloud; a mixed deployment (new client, older Cloud) fails every search as
  `invalid-response`. Alpha's port does not read `hasAttachments`.
- Smallest fix: none needed if the Cloud is cut over with the client; otherwise make the three fields optional.

### eliza-inbox-16 — MISSING, low, listed in wave 3 (J) — #39822 `from:` with a sender of several words

- develop: `dev:plugins/plugin-google-workspace/src/lifeops-message-adapter.ts:176-187` (`fromToken` quotes a
  multi-word sender).
- vibestack: no sender-token builder; the planner writes the query (`read.vibe:151`, example `from:ana@example.com`).
- Impact on the phone: the develop fix was in a plugin the APK did not bundle; the equivalent risk now is the
  planner writing `from:Alex Chen`.
- Smallest fix: say in the `query` description that a sender of several words is quoted.

### eliza-inbox-17 — MISSING, low, listed in wave 3 (J) — #39762 send to a contact's stored email

- develop: `dev:plugins/plugin-google-workspace/src/gmail-message-connector.ts:213-217` (the CONTACT email on
  entity metadata counts as a named address).
- vibestack: no recipient resolution in `packages/inbox`; see eliza-inbox-04.
- Impact on the phone: the connector was not in the APK; on vibestack a named contact produces no draft at all.
- Smallest fix: with eliza-inbox-04, or dispose.

### eliza-inbox-18 — UNMODELED, low — Client answer checks and constants have code but no rule

- `vs:packages/inbox/src/client/index.vibe`: Cloud paths (`:24-25`), 45 s dispatch timeout (`:26`), 50 links and
  512 KiB HTML (`:27-28`), page token ≤ 4,096 and never repeated (`:134-141`), page ≤ `maxResults` (`:174`), thread
  page ≤ 25 / total ≤ 2,000 / offset arithmetic / pinned history (`:197-200`), drafts ≤ 50 (`:228`), recipients ≤ 50
  (`:237`), receipt `succeeded` iff a provider result (`:97`), attachment hash and size (`:213,221`).
  Also `MAILBOX_FOLDER_QUERY` (`mailbox/mailbox-list.vibe:15-18`), the Home summary and `InboxAttention`
  (`:302-396`), and the INBOX_ACCESS provider texts (`agent/access.vibe:10-24`).
- develop had the same checks in code with `test/mailbox/managed-gmail-client.test.ts`; vibestack has no test of the
  client's refusals.
- Smallest fix: one "client answers" rule file and a journey that feeds malformed answers.

### eliza-inbox-19 — UNVERIFIED, low — The reauthorization refusal code has a new name and place

- develop classified `data.code === "reauth_required"` (`dev:plugins/plugin-inbox/src/mailbox/failures.ts:166-170`).
- vibestack classifies `reason === "google_reauth_required"` (`vs:packages/inbox/src/mailbox/failures.vibe:33-37`),
  read from `body.error` by the agent transport (`agent/cloud.vibe:7-9`) and from `error.code` by Alpha's
  (`alpha-vs:apps/app/src/inbox/gmail.vibe`, transport). `reauth_required` survives only as a receipt
  `rejectionCode` (`vs:packages/cloud/src/services/google/mail-operations.vibe:116`).
- Impact: with a Cloud that still answers `reauth_required`, the code is unknown and the status decides (403/404
  still mean revoked; 409 on a read too). Not checked against Alpha's deployed Cloud.
- Smallest fix: confirm the code Alpha's Cloud returns; accept both names.

## Contract mismatches with Alpha's port

1. `INBOX_COMPOSE_EMAIL` result: Alpha reads `actionResults[].data` as `{ to?, subject?, body }`
   (`alpha-vs:apps/app/src/assistant/transcript.vibe:96-111`); upstream puts the draft in `values.emailDraft` and the
   frame carries `data` only (`vs:packages/inbox/src/agent/compose.vibe:57-58`,
   `vs:packages/agent/src/conversation/turns.vibe:284-289`). No card. (eliza-inbox-01)
2. To of `self`/`me`/`myself`: expected by Alpha (`alpha-vs:apps/app/spec/assistant/emailCard.md:17`), dropped by
   upstream's address filter (`compose.vibe:20,29-32`). (eliza-inbox-04)
3. `gmail.local-compose.v1`: Alpha advertises it "exactly when the agent offered it"
   (`alpha-vs:apps/app/spec/inbox/operations.md:262-273`); upstream's capability vocabulary does not contain it and
   refuses a header that names it (`vs:spec/agent/deviceActions/capabilities.md:60-77`). It is never offered.
   (eliza-inbox-07)
4. `replyTo`: Alpha's `MailBody` has it and the composer uses it (`alpha-vs:apps/app/src/inbox/composer.vibe:245`);
   upstream's `GmailMessage` does not, so the port hardcodes `""` (`gmail.vibe:120`). (eliza-inbox-03)
5. Refusal code: upstream maps `google_reauth_required`; Alpha's transport forwards `error.code` as the reason. The
   code Alpha's Cloud returns was not checked. (eliza-inbox-19)
6. Every name Alpha imports from `@elizaos/plugin-inbox/mailbox` and `/client` exists with the used shape in
   `eliza-vs`: `managedGmailClient`, `ManagedGmailTransport`, `mailCaches`, `mailReadKey`, `readSavedMailbox`,
   `saveMailbox`, `clearMailbox`, `savedMailboxName`, `mailSaveAllowed`, `MailStoreFailed`, `mailReadAhead`,
   `MailProtocolFailed`, `MailUnreachable`, `AttachmentRefused`, `classifyGmailFailure`, `attachmentReadFailure`,
   `linkTextMismatch`, `sha256Hex`, `reviewMailContext`, `validateMailContext` and the types. The eleven client
   methods Alpha calls (`gmail.vibe:231-285`) exist with matching parameters. Alpha pins eliza `c84e5d68`, not
   `769b4f00d`; the two were not diffed.

## Confirmed OK

| Behaviour | Rule | Code |
| --- | --- | --- |
| Paging: one message once, repeated cursor ends, shifted mailbox marked, stale page dropped | `reads.md` "Pages keep their first read's identity…" | `mailbox/mailbox-list.vibe:52-105` |
| Caches keyed by session, credential, account; dropped on switch or revocation | `reads.md` "Cached reads are keyed…" | `mailbox-list.vibe:118-127` |
| Restore/save fenced by epoch; 30 d list, 5 min body skip, 1 min account list | `reads.md` "A restore or save is fenced…" | `mailbox-list.vibe:190-213,321-344` |
| Saved document: one owner, ≤ 24 entries, 4 MiB, CAS ≤ 3 attempts | `reads.md` "The saved document belongs to one owner…" | `mailbox-list.vibe:282-300,356-382` |
| Cache bounds: 8 lists, ≤ 100 messages, drafts not kept, 16 bodies / 4 MiB | `reads.md` "The caches are bounded…" | `mailbox-list.vibe:162-226` |
| Read-ahead: one at a time, 30 s, 8 lists, taken once | `display.md` "A page is read ahead once…" | `mailbox/read-ahead.vibe:13-70` |
| Link safety: http(s), ≤ 2,048, no credentials, text ≤ 200, mismatch flag | `display.md` "Only an absolute web link…" | `mailbox/links.vibe:9-69` |
| Read state: one in flight, unconfirmed or failed automatic change not repeated | `readState.md` | `mailbox/read-state.vibe:31-88` |
| Consent: read first, modify as one consent, reconnect keeps held | `grants.md` rule 1 | `mailbox/grants.vibe:72-80` |
| Change needs its capability and the server's; else upgrade | `grants.md` rule 2 | `grants.vibe:82-110` |
| Cached mail and unsent reviews follow the grant | `grants.md` rule 3 | `grants.vibe:112-137`, `operation-journal.vibe:201-210` |
| Failure classification order and status table | `failures.md` rule 1 | `mailbox/failures.vibe:50-63` |
| Offline/unavailable change never says nothing changed | `failures.md` rule 2 | `failures.vibe:65-75` |
| Disconnect asked once, then read back | `failures.md` rule 3 | `failures.vibe:97-103` |
| Outgoing attachments: ≤ 10 files, distinct names, ≤ 5 MiB incl. forwarded | `outgoing.md` rule 1 | `mailbox/attachments.vibe:62-83` |
| Opaque attachment: name, canonical base64, 7 MiB / 5 MiB, hashed not opened | `outgoing.md` rule 2 | `attachments.vibe:85-109` |
| Retained copy: owner, known fields, subject 4,096, body 64,000, lists 20 | `outgoing.md` rule 3 | `mailbox/retained-draft.vibe:41-70` |
| Review binding: bound / edited / other / absent | `outgoing.md` rule 4 | `operation-journal.vibe:139-155,495-507` |
| Send keeps the owner turn's request id (#39921) | `outgoing.md` rule 5 | `operation-journal.vibe:459-463` |
| One durable reservation, one dispatch, permit lost on restart (develop's `sendLease`) | `drafts.md` "A provider request is bound…" | `operation-journal.vibe:314-336,495-517` |
| Recovery by receipt only; stale prepared reply ignored; abandon after warning | `drafts.md` "Recovery reads…" | `operation-journal.vibe:353-361,519-546` |
| Unsent review may be cancelled; attempted one may not | `drafts.md` "The owner may cancel…" | `operation-journal.vibe:548-554` |
| Provider reference adopted after exact readback; opening another draft shelves the saved one | `drafts.md` last two rules | `operation-journal.vibe:556-571`, `mailbox/provider-draft.vibe:37-49` |
| Review proposal ≤ 7.5 MiB | `drafts.md:33,51` | `operation-journal.vibe:458` |
| Hand-off: exact revision and destination, ≤ 48,000 bytes, 2 min; insert whole ≤ 64,000 or blocked | `handoff.md` rules 1 and 3 | `mailbox/mail-context.vibe:36-73` |
| Background notices bridge; tap needs full identity; ask rechecks the excerpt. Managed list read: bounded, one call, current owner only | `backgroundNotices.md`, `managedRead.md` | `mailbox/background-notices.vibe:76-132`, `agent/read.vibe:58-86` |

Not applicable (9): #39983 (develop Quint harness only); #39701 (chat-connector fetcher, no such connectors on the
phone or in vibestack); #39842's inbox part and #39737 (view declaration fields, vibestack plugins declare no views);
agent mailbox changes through the operation broker (`managed-gmail-manage.ts`, flag never set by Alpha); agent
provider send (`managed-gmail-send.ts`, send broker unset on the phone); owner-facing wording helpers and
`MailFolderPicker` (already Alpha-owned copies on develop, `alpha-dev:apps/app/src/ui/README.md:73-82`);
`plugin-google-workspace` Gmail connector, drafts and send as a whole (not in the APK); `InboxMigrationService`,
`app_inbox` schema and the `/api/lifeops/inbox/*` routes (never called by the phone).

## Not covered

- develop `packages/app/src/runtime/managed-google-agent/*` (the phone's loopback Google host) against vibestack's
  cloud link: only the Gmail list mapping and the account selection were skimmed. Which account `INBOX_READ` reads
  when several Google accounts are connected (`gmailStatus()` without a grant) was not established.
- develop `plugin-assistant` MESSAGE/triage draft pipeline beyond `device-email-draft.ts` and the compose guidance.
- `plugin-google-workspace/src/gmail.ts` internals (drafts, send); only the #39762 and #39822 diffs were read.
- develop `plugin-inbox/src/inbox/*` back-end in depth (`aggregate.ts`, `email-curation.ts`, `unsubscribe-service.ts`,
  `priority-scoring.ts`, `reflection.ts`, `repository.ts`, `service.ts`) and the React views.
- Cloud Gmail routes on any side beyond spot checks of the card, capability and refusal shapes; Alpha's deployed Cloud.
- Alpha's own `apps/app/src/inbox/{composer,operations,previous,notices,accounts}.vibe` and the native `AlphaGmail`
  plugin (alpha slice).
- Whether Cloud refuses a reply addressed to `From` when the message has `Reply-To` (eliza-inbox-03).
- The body of the seven journeys in `inbox.test.vibe` line by line; no test, Quint or Dafny run was made.
- The difference between Alpha's pinned eliza commit `c84e5d68` and the audited `769b4f00d`.

## Skeptic verdicts

Checked 2026-11-22 against `eliza-vs` 769b4f00d, all seven `vibecut/w3-*` checkouts (none changes `packages/inbox` or
`spec/inbox`; `diff -rq` is empty for both in every checkout), `alpha-vs` and `alpha-develop`. Read-only.
Tally: confirmed 15, not_applicable_to_phone 3, refuted 1. Two stated impacts are wrong and are corrected below (03, 15).

- eliza-inbox-01 — confirmed. `vs:packages/agent/src/conversation/message-service.vibe:233` keeps a step's own `data` plus `actionName`; `turns.vibe:284-289` forwards `{action, data}` only; `client/reply-frame.schema.vibe:2` has no `values`. `compose.vibe:57-58` puts the draft in `values`. `alpha-vs:apps/app/src/assistant/transcript.vibe:96-111` needs `data.body` (`payloads.schema.vibe:120`). Same code in every w3 checkout. Develop shape real: `device-email-draft.ts:59-79`, read at `alpha-dev:apps/app/src/ui/mailbox/agent-email-draft.ts:52-100`.
- eliza-inbox-02 — confirmed. The only callers of `gmailRead` outside Cloud are `vs:packages/inbox/src/client/index.vibe:180` and its test; no agent action in `packages/{inbox,agent,assistant,workflow}` or any w3 checkout reads a body. Develop `managed-gmail-adapter.ts:430-521` is real and was live on the phone (read broker set, `alpha-dev:scripts/native-cloud-runtime-config-check.ts:22`).
- eliza-inbox-03 — confirmed, impact worse than stated. No `replyTo` anywhere in `vs:packages/inbox` or `spec/inbox`. The open question is answered: Cloud binds a reply's target to `Reply-To` (`vs:packages/cloud/src/services/google/mail-compose.vibe:214-219`) and refuses with InvalidRequest when `to` lacks it (`:334`); Alpha's port always sends an explicit `to` (`alpha-vs:apps/app/src/inbox/gmail.vibe:89`) built from `From` (`composer.vibe:245`, `gmail.vibe:120`). So a reply to a message whose Reply-To differs from From is refused at review, not misaddressed.
- eliza-inbox-04 — confirmed. `compose.vibe:20,29-32,50` drops every non-address entry; no "self" handling in `packages/inbox` or `packages/agent/src`. Develop guidance real at `context-assembly.ts:319-323`; legacy phone resolved self at `alpha-dev:apps/app/src/prototype/agent-email-card.ts:188`; port still expects it (`alpha-vs:apps/app/spec/assistant/emailCard.md:17`).
- eliza-inbox-05 — confirmed. No triage action, provider or rule in `vs:packages/{inbox,agent,assistant,workflow}`, `vs:spec/inbox` or any w3 checkout; "triage" appears only in Cloud's scoring and the grants module. Develop registration real at `plugin.ts:79-101`, `actions/inbox.ts:1124-1135`. Needs the owner's decision, not a port by default.
- eliza-inbox-06 — confirmed (upstream only). None of the eight definitions is referenced by any `.vibe`/`.ts` file under `vs:packages` or any w3 checkout; they exist only at `vs:spec/inbox/drafts.md:38-83,349-373`. Phone: the port has its own rules (`alpha-vs:apps/app/spec/inbox/drafts.md:16,58,359,432`, `operations.md:363`) and does not import upstream's draft modules. #39748 equivalence in the port was not verified here (`composer.vibe:60` takes a `confirmed` flag rather than a fenced prompt).
- eliza-inbox-07 — confirmed. `gmail.local-compose.v1` is in no vocabulary (`vs:spec/agent/deviceActions/capabilities.md:50-66`; same in every w3 checkout, where `:89` lists a `gmail.*` name as a refused example). `compose.vibe:40-41,76` are as described; no `turnComplete`/`continueChain` though core supports both (`vs:packages/core/src/runtime/planner-types.vibe:195,201`). Develop real at `service.ts:1093-1099,1142-1167`, `device-email-draft.ts:65-66`.
- eliza-inbox-08 — confirmed. Four drivers call only `.step` on `journalModel`, `managedReadSession`, `mailReadStateGuard`, `noticeTapSession` (`vs:packages/inbox/test/drivers/*.ts:19`). The implementations step those same objects internally (`read.vibe` `managedInboxRead`, `operation-journal.vibe:246`, `read-state.vibe:65,77`) but no driver enters through them. `vs:spec/lock.json` holds `spec/app/echo.md` only and `unproved: {}`; this is repository-wide, not inbox-specific.
- eliza-inbox-09 — confirmed. Core has the mechanism (`vs:packages/core/src/runtime/direct-action-routing.vibe`, used by maps and notes) but the inbox plugin registers no rule (`index.vibe:16-21`); `in:sent` is only a query example (`read.vibe:151`). Develop rule real at `plugin.ts:27-40,63-70`.
- eliza-inbox-10 — confirmed. `read.vibe:73-75` sends the planner's raw query; no re-filter or refusal. Develop real at `managed-gmail-adapter.ts:252-301,396-424`.
- eliza-inbox-11 — not_applicable_to_phone. The three upstream weakenings are real (`operation-journal.vibe:379-402,416` against `dev:operation-journal.ts:553-576,620-625`), but the port imports only `managedGmailClient`, `mailReadAhead`, `reviewMailContext`, `validateMailContext`, `linkTextMismatch` and saved-document helpers from upstream, never `inboxOperation`, and makes all three checks itself: digest hash at `alpha-vs:apps/app/src/inbox/gmail.vibe:274-275`, field echo incl. kind/mode/replyMessageId at `:149-153`, forward source at `:162-165`.
- eliza-inbox-12 — confirmed. `linkifyMailText` breaks at 50 (`vs:packages/inbox/src/mailbox/links.vibe:56`) so `client/index.vibe:88` is dead; links come from `bodyText` only (`:79`); Cloud's read returns no link list (no `links` in `packages/cloud/src/services/google/mail-read.vibe` or `google-read.vibe`) though `spec/cloud/services/google/mailRead.md:135-137` says it does.
- eliza-inbox-13 — confirmed. Cloud passes Gmail's snippet through raw (`vs:packages/cloud/src/google-read.vibe:139`); `read.vibe:129-132` returns it undecoded; no decoder in `packages/inbox`. Develop decoded at `managed-google-agent-host.ts:801-803`. Reaches the model through `data.messages` only (the text line has no snippet).
- eliza-inbox-14 — confirmed. `client/index.vibe:108-132` as described; vibestack Cloud answers `{mimeTypes, maxBytes}` (`vs:packages/cloud/src/services/google/mail-read.vibe:308`). No impact once Cloud and client cut over together (`alpha-vs:cloud` builds from `@elizaos/cloud`).
- eliza-inbox-15 — confirmed, impact understated. `hasAttachments` is gone from the wire, from `GmailMessage` and from vibestack Cloud (no match in `vs:packages/cloud/src`). Legacy phone showed a paperclip and "has attachments" label from it (`alpha-dev:apps/app/src/prototype/inbox-cloud-adapter.ts:1305-1307`); the port still draws one (`alpha-vs:apps/app/src/web/inbox/MailList.tsx:109`) but `gmail.vibe:112` and `saved.vibe:37` hardcode `attached: false`. The digest-only `gmailDraft` is covered by `gmailDraftContent` (`client/index.vibe:234-243`).
- eliza-inbox-16 — not_applicable_to_phone. The develop fix is in `plugin-google-workspace`, which the APK never bundled (`dev:packages/agent/src/runtime/plugin-collector.ts:939-940`). Not present in `eliza-vs` or any w3 checkout despite wave3.md item J. Residual planner risk belongs with eliza-inbox-10.
- eliza-inbox-17 — not_applicable_to_phone. Same plugin, same reason (`dev:plugins/plugin-google-workspace/src/gmail-message-connector.ts:213-217`). Not in any w3 checkout. Named recipients are eliza-inbox-04.
- eliza-inbox-18 — confirmed. No rule in `vs:spec/inbox` names the client's answer checks or constants (`client/index.vibe:24-28,134-141,174,221,237`), and `packages/inbox/test/inbox.test.vibe` feeds no malformed answer to the client. Formal coverage only; behaviour matches develop.
- eliza-inbox-19 — refuted for the vibestack stack. Rule `vs:spec/inbox/failures.md:15-35` (ReauthCode decides over status), code `packages/inbox/src/mailbox/failures.vibe:33-37`, and vibestack Cloud emits exactly `google_reauth_required` (`packages/cloud/src/client/errors.vibe:27-29` wire naming; `spec/cloud/services/google/connection.md:306`, `calendar.md:270`; `packages/cloud/test/cloud.test.vibe:1875`). Alpha's Cloud is built from the same package (`alpha-vs:cloud/src/worker.vibe:2`). Residual only if a vibestack phone meets the develop Cloud (`dev:packages/cloud/api/v1/eliza/google/gmail/inbox-v1/route.ts:46`, `code: reauth_required`, 409): a read is still revoked, a change is called stale (`failures.md:35`). The deployed Cloud was not queried.
