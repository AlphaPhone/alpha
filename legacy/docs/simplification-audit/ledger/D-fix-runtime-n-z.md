# D-fix runtime n-z: review defects

## 1. [medium] `runtime/voice-selection.ts`: VoiceTurnReview replay still injected the deleted review policy

Re-check: confirmed. `voice-turn-review.mjs` set `f.box.voiceSendPolicy = () => 'review'`, but `voice-adapter.ts` now
hard-codes `'auto-send'` (D8). As a result `test/quint-voice-turn-review.test.mjs` failed at `assistant-model-traces.mjs:196`.

Fix: the model was reworked rather than retired. Another agent working in the same tree was already rewriting these
files when I reached them, so I did not edit them myself. I checked that its rework does what the finding asked:
- `specs/quint/application/VoiceTurnReview.qnt`: the transcript-review half is gone. A transcript goes straight to
  `thinking` (auto-send). The reviewRequired, stale-reply, failed-reply and owner-input-pause behaviour stays, with
  its 4 scenarios and `ReviewRequiredClosesWitness`.
- manifest row: the review symbols and the review/text/outcome mapping are removed.
- `specs/quint/refinement/application/voice-turn-review.mjs`: there is no `voiceSendPolicy` injection, no review tap,
  no edit/sendReviewed/discard driver methods and no `turnAborted` truncation.
- `test/quint-voice-turn-review.test.mjs`: the trace count and action list are updated.

`specs/quint/refinement/native/batch-capture-completion.mjs` (the deleted "Holds a finished transcript" anchor) is
being repaired by that same agent. I did not touch it.

Verification: `bun scripts/run-tests.ts test/quint-voice-turn-review.test.mjs` gives 1 pass, 0 fail.
`bun scripts/check-quint.ts check --models=VoiceTurnReview` passes (scenarios, simulation, witness).

## 2. [medium] `specs/quint/refinement/application/contracts.mjs`: notesLifecycle used the deleted NotesStore/trash API

Re-check: confirmed. `notesLifecycle` built a `NotesStore` and called `emptyNotesTrash`, `addNotesTrashEntry`,
`restoreNotesTrashEntry`, `planNotesTrash` and `NOTES_TRASH_RETENTION_MS`. All of these were deleted together with
the legacy Notes engine (D1, C1).

Fix: retired, as formal-plan.md §2.2 prescribes. It is a model of deleted code, and its canonical half duplicates
`CanonicalNotes{Controller,Draft,Feedback,Mutation,View}`. The changes:
- deleted `specs/quint/application/NotesLifecycle.qnt`;
- removed its row from `specs/quint/application/manifest.json` (the file still parses as JSON);
- removed the `NotesLifecycle` table row and the "Notes lifecycle modes" section from
  `specs/quint/application/README.md`;
- deleted `export async function notesLifecycle` from `contracts.mjs`, plus its `deferred` and `tick` imports, which
  nothing used any more;
- removed it from the import and from the campaign list in `test/quint-application-refinement.test.mjs`.

The VoiceTurnReview half of this finding is the same defect as finding 1.

Item 3, the `filesAndSharing` failure, was not caused by this branch. `specs/quint/refinement/application/boundaries.mjs`
(last changed in a9b2864bc, 17 Nov) injected `reviewSharedAttachment` and `attachmentRefusalText`. Since 32d06d431
(18 Nov, already on develop), `prototype/file-email-review.ts` has called `reviewMailAttachment` and
`rethrowAttachmentRefusal` instead. In the vm those names were undefined, so the review threw and the checkbox stayed
disabled. Fix, in the harness only: it now injects `reviewMailAttachment` (still recording `lastReview`) and
`rethrowAttachmentRefusal`. The product is unchanged.

One case in the same file still fails, and it is out of scope here: `durableStore`
(`specs/quint/refinement/application/storage.mjs:44`). It expects `Older browser data changed` from
`BrowserDomainDocument.readRaw()`, which is the legacy-envelope race that was removed together with the legacy browser
envelopes. Fixing it means trimming the DurableStore model's `legacyWrite` half and the harness's `legacy` race. This
ledger does not touch that.

Verification: `bun scripts/run-tests.ts test/quint-application-refinement.test.mjs` now gives 18 pass, 1 fail, and the
one failure is `durableStore`. With notesLifecycle removed but before the boundaries fix it was 17 pass, 2 fail.

## 3. [low] `runtime/telephony-executor.ts`: duplicate `OpenThread` contract

Re-check: confirmed. `prototype/sms-adapter.ts:18` still exported a copy that matched field for field, and nothing
imported it.

Fix: in `apps/app/src/prototype/sms-adapter.ts`, the local `export type OpenThread=...` is replaced by
`import type {OpenThread} from '../runtime/telephony-executor';`. `telephony-executor.ts:34` is now the only
definition. The import is type-only and erased at build, so it adds no runtime cycle. Verification:
`test/sms-incomplete-rows`, `comms-messages-bar` and `image-sms` give 22 pass, 0 fail.

## 4. [low] `runtime/notes-view.ts`: `KIND_LABEL` exported with no caller

Re-check: confirmed. It is used only at notes-view.ts:30 and :34.

Fix: `export const KIND_LABEL` is module-private `const KIND_LABEL` again, as it was on develop.
`notes-organize-presentation.ts` is left as it is.

## Checks
- `npx tsc --noEmit -p .`: no errors.
- `bun run quint:check`: exit 0. Every model passed (471 reused from cache, 966 run), and the manifest no longer has
  NotesLifecycle.
- I did not run the whole `bun run quint:tests` suite. I ran its affected files: quint-voice-turn-review passes, and
  quint-application-refinement passes except for the `durableStore` case, which is out of scope as described above.
