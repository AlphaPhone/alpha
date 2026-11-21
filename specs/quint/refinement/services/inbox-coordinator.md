# Inbox coordinator refinement

`inbox-coordinator.mjs` executes the product Inbox adapter, provider controls,
local composer, durable operation and unsaved-draft controllers. The fixture
bundles those source modules with esbuild into a fresh JavaScript realm for each
scenario. Only external ports are substituted. Source observations are checked
against the imported `InboxCoordinator` model and its safety predicate at every
recorded checkpoint.

The runner captures the product module graph, both adapter files, package lock
and shared checker before source execution. The receipt also binds the model
and imported `InboxDelivery` bytes. Run it with

```sh
bun specs/quint/refinement/services/inbox-coordinator.mjs
bun test test/quint-inbox-coordinator.test.mjs
```

## Source and abstraction map

| Product entry point | Model projection |
| --- | --- |
| `installInboxCloudAdapter`, account refresh and normal compose/Drafts actions | Selected account, read grant loss and restoration, local draft recovery |
| `inboxProviderControls.bind`, `render().provider.confirm`, `withdrawn` | Capability read token, confirmation eligibility, admitted work and deferred withdrawal |
| `InboxOperation.prepare`, `confirm`, `refresh`, `discardUnsent` | Imported retained operation phase, exact review, pending CAS, receipt and restart |
| `inboxDrafts.begin`, `render`, `settleSent`, `bind` | Current, saved, retained and shelved copies, attachment binding, matching-source cleanup |
| `inboxUnsaved`, `AssistantDraftController`, native draft recovery | Actual retained record creation and removal through controlled storage |
| `reviewMailAttachment` | Actual byte hashing and attachment validation before model identity-class assignment |

The two imported `InboxDelivery` instances represent independent retained
account/grant slots. Their internal owner counters are local to each instance.
The coordinator selects the external identity and keeps the old slot after
selection changes. One provider request per identity bounds each trace.

`reserve`, `persistDispatch` and `reserveFailed` expose the awaited local CAS in
`InboxDelivery`. The existing `confirm` action remains available for callers
whose checkpoint starts after the durable commit. The coordinator separately
observes actual provider dispatch. Its public `phase` projection reports the
stored review while that CAS is pending.

Body and attachment values are equality classes. Zero means absent, one means
the original content, and two means the distinct edited content used by the
trace. Source draft IDs, request IDs, store namespaces, revisions and hashes
remain real generated values in the implementation. The fixture checks their
identity when deciding the corresponding model action. `resumeDraft` also
represents same-instance pending-draft restoration during account rebind. An
explicit UI action that only opens this restored composer is a stuttering step.

## Checked schedules

The composer's Send is one tap: it prepares the exact email, binds it in the
journal and dispatches it once. The driver records that tap as the model
sequence `prepare("send")`, `reviewed(true)`, `reserve`, `persisted`,
`dispatched`, and holds the provider prepare, the dispatching journal CAS or the
provider dispatch when a schedule needs a change to land in between. An unsent
review is no longer a resting state of the composer; it remains reachable as a
saved operation restored on bind, and through the review sheet's own controls.

- Fresh negative and unavailable capability readbacks refuse Send before any
  prepare. A delayed positive readback cannot replace a newer negative result or
  cross the captured account and binding epoch. A capability read that lands
  during prepare discards the prepared email without dispatch.
- Dispatch cannot move an old account's request into a new account, whether the
  account changes during prepare or while the dispatching CAS is held. A new
  Cloud owner cannot adopt an operation under a repeated Google connection ID.
- A failed dispatching CAS leaves the prepared email and copies intact. Tapping
  Send again reuses the same request identity. A failed old-account CAS leaves
  its review recoverable, and returning to that account reopens the review sheet.
- Withdrawal during prepare discards the undispatched send. Regrant cannot revive
  it. Read withdrawal through the full adapter preserves local text.
- Withdrawal during an admitted dispatch can leave an unknown dispatched request.
  The review sheet reopens; Send over the unresolved delivery never prepares or
  dispatches again. Regrant preserves its ID and checks its receipt without
  redispatch.
- An earlier unsent non-send operation (an archive review) blocks Send: the tap
  opens the review sheet and nothing is prepared or dispatched over it.
- A selected attachment arriving after account change is dropped by the
  product's own fence. Removing an attachment while Send prepares discards the
  prepared email; only the current bytes are dispatched afterwards.
- Confirmed matching sends remove exact local copies. Edited copies and older
  saved versions remain. Lost responses and restart preserve copies until a
  fresh matching receipt permits cleanup.

## Scope and remaining obligations

This is bounded orchestration evidence. Gmail replies, atomic encrypted-store
operations, native file selection and lifecycle callbacks are controlled ports.
It does not establish installed Keystore durability, provider authorization,
network idempotency, or actual Gmail delivery. The model does not impose
revocation on work that was already admitted.

The cleanup action summarizes multiple account-fenced persistence operations.
The source schedules check complete cleanup, changed copies, and unknown-outcome
restart. Interruption between each individual cleanup write, arbitrary shelf
collections, multiple source drafts, forwarding and provider-draft replacement
remain additional schedules. The existing operation and saved-draft fixtures
continue to cover their lower-level contracts.

Inbox row identity remains a separate UI obligation. Session/account grant
`readKey()` changes and repeated message, draft and attachment-part IDs need
renderer reconciliation schedules. HTML sanitization, remote images, background
notice delivery, message pagination and installed UI layout also remain outside
these projections. Their state allocation in the coverage ledger is not a claim
that this runner establishes their implementation refinement.

## Source validation

The 2026-11-17 one-tap Send run checks 20 schedules and 137 observed
checkpoints, including 32 generated scenario and rejected-action checks. The
2026-11-07 review-then-confirm run checked 18 schedules and 131 checkpoints. Input hashes are
captured before the driver executes. The 9 focused Inbox/Gmail tests, 26 existing
sent-cleanup tests, grant-withdrawal fixture and full Inbox cloud-flow fixture
also pass against the confirmation capability fix.

The current `InboxCoordinator` has 16 named scenarios. `InboxDelivery` retains
its existing API and adds one reservation scenario, for 8 in total. Model-gate
and bounded symbolic receipts are written under `test-results/quint-inbox/final`.
Earlier receipts under `before-callback-fence` describe superseded model bytes.

## Individual cleanup writes

`inbox-cleanup.mjs` adds nine source schedules using the actual retained-draft
controller, shelf and saved-copy CAS operations. Each write is held separately.
The controlled store can refuse a write before commit or commit it and lose the
reply. Reload uses the existing successful provider receipt and never dispatches
mail again. Its receipt ID is `InboxCleanup` and shares `InboxCoordinator`.

The model retains the complete-pass `cleanup` action for existing traces. New
`startCleanup`, `clearRetained`, `clearShelf` and `clearSaved` actions expose
individual persistence boundaries. `publishRetainedClear` separates durable
commit from callback completion. When the binding retires between them, the
actual `AssistantDraftController.consume` compensates its own known clear.
`restoreRetained` records that account-scoped compensation. A second actual
composer also saves while the first awaits saved-copy removal, and the old CAS
preserves the newer revision.

A source defect was reproduced at the shelf boundary. `settleSent` allowed a
rejected shelf CAS to escape its asynchronous observer after a successful send.
The local cleanup handler now retains remaining copies and reports an incomplete
cleanup. A later matching receipt retries it. Individual committed writes remain
committed.

These schedules use one active cleanup invocation and one exact shelved source
draft. Arbitrary shelf collections, simultaneous independent cleanups, forwarded
source parts and provider-draft editing remain additional obligations.

```sh
bun test test/quint-inbox-cleanup.test.mjs
```

With one-tap Send the nine cleanup schedules record 101 checkpoints. An emptied
Drafts shelf is now removed from storage, so the shelf cleanup write is a
deletion. The cleanup follow-up passes all 19 current model scenarios, 1,000 sampled runs
of 80 steps with seed 123, and Apalache 0.62.4 safety checking through four
transitions. Both source runners pass together, with 27 schedules and 241
observed checkpoints. The existing 26 cleanup tests and 2 saved/multiple-draft
tests also pass. Current receipts are under `test-results/quint-inbox-cleanup/final`.
