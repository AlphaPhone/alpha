# apps/app/src/runtime/inbox-operation.ts
- Lines: 72 | Role: Alpha's subclass of the upstream Inbox operation journal (defaults the attachment reviewer) plus the receipt-regression guard that refuses a `prepared` receipt after an `observed` outcome; re-exports a set of upstream journal/attachment helpers. | Verdict: SIMPLIFY
- Importers: 4 in src (`browser/mail-attachments.ts`, `prototype/inbox-cloud-adapter.ts`, `prototype/inbox-provider-controls.ts`, `runtime/cloud-protocol.ts`). Text/path pins: `LemmaScript-files.txt:19`, `specs/lemma/README.md:199`, `specs/quint/native/manifest.json:544`, `specs/quint/services/manifest.json:295,1128,1207`, `specs/quint/refinement/services/inbox.mjs:3,30`, `inbox-coordinator-ports.mjs:32`, `scripts/inbox-adapter-fixture.ts:17`, `scripts/test-gmail-mailbox.ts:4`, `scripts/test-inbox-attention-flow.ts:5`, `scripts/test-inbox-grant-withdrawal.ts:8`, `scripts/test-inbox-sent-cleanup.ts:9`, `test/inbox-operation-guards.test.mjs:19` (bundles it with a stubbed `inbox-attachment`), `test/native-secure-slots.test.mjs:102`, `test/support/feature-parity.mjs:535`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-27 | A7 / D4 | Re-exports `composerContent`, `composerKind`, `inboxOperationKey`, `reviewBinding`, `reviewBindingRefusal`, `ComposerEmail`, `InboxOperationRecord`, `ReviewBinding`, `attachmentBytes`, `checkOutgoingAttachments`, `outgoingAttachmentLimits`; none is imported from this path by src (grep). Only `reviewOpaqueAttachment` (`browser/mail-attachments.ts`, `prototype/inbox-cloud-adapter.ts`) and `OpaqueMailAttachment` (`cloud-protocol.ts`) are. The rest are used by `scripts/inbox-adapter-fixture.ts`, `scripts/test-inbox-*.ts`, `test/inbox-draft-copies.test.mjs`, `test/native-secure-slots.test.mjs`. | Keep `reviewOpaqueAttachment` and `type OpaqueMailAttachment` (or have those two callers import upstream); delete the other re-exports and point the scripts at the upstream modules. | Low; scripts/tests edit only. |
| 2 | 37-40 | D4 | `static receiptReads(read,store,owner){ return receiptReadGuard(read,store,owner); }` — pass-through to the exported function; one caller (`prototype/inbox-provider-controls.ts:15`); `test/inbox-operation-guards.test.mjs:62` asserts the two have equal arity (T1-style). | Caller imports `receiptReadGuard`; delete the static. | None. |
| 3 | 30 | A7 | `export type InboxOperationDependencies` — no external importer. | Unexport. | None. |
| 4 | 43, 48-57 | — | `regressedReceipt` (Lemma `//@ verify`) and `regressedReceiptRefusal` (user copy): exported for the Lemma extractor and the guard test. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SavedReceiptPhase` | type | 45 | upstream `InboxOperationRecord` | stays |
| `InboxOperationDependencies` | type | 30 | upstream `SharedDependencies` | stays (unexported) |
| `receiptReadGuard` / `regressedReceipt` | helper | 48-72 | — | stays |

## Proposed end state
~45 lines: the `InboxOperation` subclass (attachment default), `receiptReadGuard`, `regressedReceipt` (Lemma), `regressedReceiptRefusal`, and the two attachment re-exports product code uses. Static pass-through and test-only re-exports gone.

## Verification
LemmaScript, Quint inbox models (`services/manifest.json` entries, `refinement/services/inbox.mjs`), `scripts/test-inbox-*.ts` after repointing imports, Gmail reviewed-send Playwright journeys; Android `native/manifest.json:544` entry unchanged.
