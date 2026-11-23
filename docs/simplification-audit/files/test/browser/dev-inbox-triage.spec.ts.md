# test/browser/dev-inbox-triage.spec.ts
- Lines: 48 (6 tests) | Kind: Playwright `chromium`, dev build; UI on the simulated local mailbox, assertions on `alpha.dev.app.inbox` | Verdict: **MERGE** into `journeys/inbox.spec.ts` (2 cases)
- Covers: search, archive, Undo, Move to Trash through reload; reply saves its source and marks only that mail replied; forward keeps attachment bytes and needs a recipient; sending another message keeps a saved draft; multiple drafts keep identities; an older draft without an id gets one on restore. Duplicates: `dev-inbox.spec.ts:40-42` (reply, forward, archive Undo and search in one test); `inbox-folders-drafts.spec.ts`. Callers/importers: `chromium` project; imports `helpers/mail-actions.ts`; uses `node:crypto` for the seeded hash.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-13 | P13 | Seeds the simulator mailbox with an inline JSON blob in an init script. | Harness `seed.inbox()` fixture. | none |
| 2 | 14, 19-21, 27, 31 | T6 | `stored()` reads the simulator key after each step instead of the UI. | Assert visible state (Archive folder, Trash, Sent, replied marker). | Low |
| 3 | 15-23 | T4 | Search/archive/undo/trash duplicates `dev-inbox.spec.ts:40-42`. | Keep one combined case. | none |
| 4 | 24-32 | — | Reply prefix and forward with attachment bytes and recipient requirement. | Carry as one "reply and forward" case. | none |
| 5 | 34-45 | — | Separate send keeps a saved draft; two drafts, discard one. | Carry as one "drafts" case. | none |
| 6 | 46-48 | A1 | "an older draft receives an identity on restore": seeds a `localDrafts` entry without `localDraftId` (old shape). | Delete with the legacy draft reader. | none |

## Proposed end state
In `journeys/inbox.spec.ts`: one "triage" case (search, archive, Undo, trash, reload), one "reply and forward" case, one "drafts" case (shared with `dev-inbox`). Delete the file.
