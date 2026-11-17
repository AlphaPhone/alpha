# Kit

Rules that several areas keep, each as a component with no state of its
own: an area that reads, sends, reviews, undoes, drafts or asks permission
holds the component in its state and moves it only through these.

- [Read](./read.md): something read from outside, where only the newest answer counts
- [Attempt](./attempt.md): one effect outside, recorded first, sent once, with an honest outcome
- [Review](./review.md): what the owner confirms is what they were shown
- [Undo](./undo.md): a change held for a while before it takes effect
- [Draft](./draft.md): edits saved over the revision they were made on
- [Permission](./permission.md): an Android permission, asked for once
