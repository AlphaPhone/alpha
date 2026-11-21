# D-fix runtime h-m: review defects

## 1. [medium] `apps/app/src/runtime/inbox-attachment.ts`: `AttachmentRefusedError` re-export removed

Re-check: the defect is real at the committed HEAD. `git diff a247c0175 HEAD -- apps/app/src/runtime/inbox-attachment.ts`
shows that two re-exports were removed: `export * from .../plugin-files/src/browser/attachment.ts` and
`export { AttachmentRefusedError, attachmentRefused } from .../plugin-inbox/src/mailbox/failures.ts`. In the committed
tree, `test/mail-attachment-refusals.test.mjs:13` still destructures `AttachmentRefusedError` from this module, gets
`undefined`, and fails (3 pass / 3 fail). `bun run verify` runs that test through `test:only`, so PR CI would go red.
Production is not affected: `drafts-controller.ts` and `ui/mailbox/failures.ts` take `attachmentRefused` from
`@elizaos/plugin-inbox/mailbox/failures` directly.

The fix went into the test, not the module. The working tree already has it (uncommitted, made by the MERGE gate,
see `MERGE-gate.md`). Line 13 now reads:

    const {reviewMailAttachment} = await tsImport('../apps/app/src/runtime/inbox-attachment.ts', import.meta.url);
    const {AttachmentRefusedError} = await tsImport('../.eliza/client-features/plugins/plugin-inbox/src/mailbox/failures.ts', import.meta.url);

`inbox-attachment.ts` stays as simplified. I grepped every importer of `runtime/inbox-attachment` in `apps/app/src`,
`scripts`, `test` and `test/browser`, including the string-stub ports in `inbox-draft-copies`,
`selection-ask-readiness`, `inbox-operation-guards` and `test-inbox-multiple-drafts`. They use only
`reviewMailAttachment` and `type MailAttachment`, so no other consumer depended on the removed re-exports.

Verification: `bun scripts/run-tests.ts test/mail-attachment-refusals.test.mjs` gives 6 pass, 0 fail. No TypeScript
file was touched, so `tsc --noEmit` is not affected. The test edit still has to be committed for the branch to be
green.
