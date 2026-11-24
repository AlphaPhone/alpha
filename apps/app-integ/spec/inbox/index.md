# Inbox

Gmail in the launcher (PRD AP-04, AP-09), read and changed through Eliza Cloud's managed Google
routes for the account the owner chose. Provider content stays in the Inbox; Home learns only
counts. Every change to the mailbox, a draft at the provider or a sent email is reviewed first and
dispatched at most once from a durable record, and its outcome is read back rather than repeated.
Local drafts stay on the phone, with the account they were written from. The upstream package
`@elizaos/plugin-inbox` supplies the cache, journal and notice primitives the shell reuses; the
Cloud side of each route is managed Gmail in `vendor/eliza/spec/cloud/services/google/`.

| Area | Specifications |
| --- | --- |
| Accounts | [Gmail accounts, selection and incremental grants](./accounts.md) |
| Reading | [Mailbox list and paging](./mailbox.md), [message and conversation reader](./reader.md) |
| Writing | [Local drafts and the composer](./drafts.md), [attachments](./attachments.md), [agent suggestions](./suggestions.md) |
| Changing | [Reviewed operations and receipts](./operations.md), [selected messages](./selection.md) |
| Notices | [Background Gmail notices](./notices.md) |
| Failures | [What a failure means](./failures.md) |
