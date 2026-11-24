# test/browser/dev-inbox.spec.ts
- Lines: 52 (7 tests) | Kind: Playwright `chromium`, dev build; UI on the simulated local mailbox, assertions on `alpha.dev.app.inbox` | Verdict: **MERGE** into `journeys/inbox.spec.ts` (3 cases)
- Covers: compose with recipient chip and Cc, attach a file, save draft, reload, restore, send, open the sent attachment's exact bytes, no external traffic; failed send keeps the composer; draft keeps an unsubmitted address and discard needs confirmation; malformed chips cannot be saved or sent; a selected contact stays a valid recipient; reply/forward/archive/search; editing a saved draft shows "Unsaved local draft". Duplicates: `dev-inbox-triage.spec.ts` (reply, forward, archive, search); `inbox-compose-layout.spec.ts`, `inbox-unsaved-recovery.spec.ts`. Callers/importers: `chromium` project; imports `helpers/mail-actions.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-8 | — | The strongest inbox journey in the suite: chips, Cc, attach, save, reload, restore, send, open the same bytes. | Carry. External-request fence moves to the harness. Drop the screenshot. | none |
| 2 | 9-11 | P3 | `Storage.prototype.setItem` throws for the simulator key. | Delete. | Low |
| 3 | 12-14, 44-52 | — | Discard needs confirmation; editing a saved draft shows the unsaved notice. | Carry into the "drafts" case. | none |
| 4 | 16-26 | — | Malformed recipient chips are refused. | Carry as a step of the compose case. | none |
| 5 | 28-39 | — | Contact recipient after reload; asserts stored `to` is `['maya']`. | Fold into the compose case; assert on the restored chip. | none |
| 6 | 40-42 | T4 | Duplicate of `dev-inbox-triage`. | Keep one. | none |

## Proposed end state
Together with `dev-inbox-triage`, `journeys/inbox.spec.ts` has: compose-attach-save-restore-send-open (with chip validation and a contact recipient); triage; reply and forward; drafts (save, keep, unsaved notice, confirmed discard). Delete the file.
