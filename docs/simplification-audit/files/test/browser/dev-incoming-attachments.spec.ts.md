# test/browser/dev-incoming-attachments.spec.ts
- Lines: 25 (10 tests, one per line) | Kind: Playwright `chromium`, dev build with `tools=1`; UI on the developer "Incoming email" editor plus CDP navigation tracing | Verdict: **MERGE** into `journeys/workflows.spec.ts` (1 case) and `journeys/inbox.spec.ts` (1 step)
- Covers: an incoming email with an attachment triggers an email workflow that saves the attachment to Files and adds the amount to Wallet; the Incoming email editor's multi-file selection, invalid replacement, limits, failed delivery retry, Home during a held read, late reads, removal of a pending replacement and compact dark layout; a delivered attachment opens from Inbox. Duplicates: none for the trigger; attachment viewer is also covered by `dev-inbox.spec.ts:4-8`. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | B5, T9 | Every test opens a CDP session and records navigation, Vite and HMR events "to retain navigation causes" for failure attachments: debugging scaffolding for a past flake. | Delete. | none |
| 2 | 11-12 | A3, D2 | The workflow seed has a "Add the amount to Wallet" step and the test asserts `alpha.dev.app.wallet` transactions. Wallet is deleted (D2), so this test breaks. | Carry without the Wallet step: incoming receipt → workflow saves the exact attachment to Files and records the mail id. | none once rewritten |
| 3 | 13-18, 20-25 | P7 | Eight tests of the developer Incoming email editor (attachment limits, invalid MIME, held `Blob.prototype.arrayBuffer`, layout). They test a simulator dialog. | Delete. | Low |
| 4 | 16-18, 21 | P3 | `Storage.prototype.setItem` and `Blob.prototype.arrayBuffer` patches. | Gone. | none |
| 5 | 19 | — | Delivered text attachment opens from Inbox in the reviewed viewer. | Carry as a step in the inbox journey. | none |
| 6 | 12, 24 | B5 | Screenshots to fixed `test-results/incoming-attachment-review/*.png`. | Drop. | none |

## Proposed end state
One case in `journeys/workflows.spec.ts` ("email trigger"): deliver an email with a receipt through Device controls, the email-triggered workflow runs once and Files holds the exact bytes. One step in the inbox journey opens the delivered attachment. Delete the file.
