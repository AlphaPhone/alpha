# apps/app/src/runtime/inbox-attachment.ts
- Lines: 9 | Role: re-exports upstream `plugin-files` attachment helpers and wraps `reviewMailAttachment` with upstream's `refusingAttachmentReviewer` so refusals are typed. | Verdict: SIMPLIFY
- Importers: 14 in src (`browser/incoming-simulation.ts`, `browser/mail-attachments.ts`, `browser/simulated-inbox.ts`, `browser/simulated-messages.ts`, `browser/workflow-receipts.ts`, `prototype/camera-adapter.ts`, `prototype/file-email-review.ts`, `prototype/inbox-cloud-adapter.ts`, `prototype/inbox-drafts.ts`, `prototype/inbox-provider-controls.ts`, `prototype/note-source-adapter.ts`, `prototype/selection-adapter.ts`, `runtime/cloud-protocol.ts`, `runtime/inbox-operation.ts`). All import only `reviewMailAttachment` and/or `type MailAttachment`. Text/path pins: `scripts/inbox-adapter-fixture.ts:18`, `scripts/test-inbox-grant-withdrawal.ts:12`, `scripts/test-inbox-sent-cleanup.ts:10`, `specs/quint/application/manifest.json:531`, `specs/quint/services/manifest.json:298,1130,2350`, `specs/quint/refinement/application/boundaries.mjs:16`, `specs/quint/refinement/services/inbox.mjs:30`, `inbox-coordinator-ports.mjs:33`, `test/browser/dev-workflow-receipts.spec.ts:33`, `inbox-save-attachment.spec.ts:5`, `journey-f-reviewed-send.spec.ts:41`, module-stub keys `'inbox-attachment'` in `test/inbox-draft-copies.test.mjs:26`, `test/inbox-operation-guards.test.mjs:17-20`, `scripts/test-inbox-multiple-drafts.ts:20`, `test/support/feature-parity.mjs:532`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | A7 | `export { AttachmentRefusedError, attachmentRefused } from '…/plugin-inbox/src/mailbox/failures.ts'` — no importer in apps/scripts/specs (grep: only this line; the test stubs in `inbox-operation-guards.test.mjs:17-18` re-declare their own). | Delete the line. | None. |
| 2 | 3 | D4 | `export * from '…/plugin-files/src/browser/attachment.ts'` forwards every upstream name; consumers use only `type MailAttachment` (and the wrapped `reviewMailAttachment`, which shadows the star export). | Replace with `export type {MailAttachment} from '…'`. | Low (type only). |
| 3 | 1-9 | D13 | Two `../../../../.eliza/…` deep imports. | Use the `@eliza/*` alias when added. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `reviewMailAttachment` | const (wrapped fn) | 9 | upstream `reviewMailAttachment` (unwrapped) | stays — the one product decision (typed refusal) |

## Proposed end state
4 lines: one `export type {MailAttachment}` and `export const reviewMailAttachment = refusingAttachmentReviewer(reviewUpstreamAttachment)`. Path kept (14 importers + many test/spec pins); no behaviour change.

## Verification
Quint inbox models listed above; Playwright `inbox-save-attachment.spec.ts`, `journey-f-reviewed-send.spec.ts`, `dev-workflow-receipts.spec.ts`; `scripts/test-inbox-*.ts`.
