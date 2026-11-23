# scripts/test-inbox-multiple-drafts.ts
- Lines: 73 | Kind: unit with module mocks (real `apps/app/src/prototype/inbox-drafts.ts` bundled by `scripts/fixtures/bundled-module.ts`; `inbox-unsaved`, `inbox-local-store`, `connection-ui`, `inbox-operation`, `daily`, `platform-plugins`, `inbox-attachment` replaced by string mocks) | Verdict: MERGE into `test/integration/inbox-provider.test.ts`
- Covers: starting a new email keeps the unfinished one as a Drafts entry (with partial recipient), reopen/reload, account isolation, storage failure keeps the current email, empty composers not collected, reply-all recipient computation, same reply resumes its draft, forward body, account switch during a pending shelf write cannot open under the new From. Duplicates: `test/browser/dev-inbox.spec.ts` (draft save/restore), `inbox-unsaved-recovery.spec.ts` (owner isolation), `test-inbox-cloud-flow.ts:196-203` (shelf preservation). Callers: `test/inbox.test.mjs:9`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-24 | T3 | Seven modules replaced by JS strings typed nowhere; a signature change in any of them passes silently. | In the merged file use the same bundled real modules as the sent-cleanup cases, mocking only storage and Cloud boundaries. | M |
| 2 | 51-58 | T4 | Preserve/reopen/reload/account isolation overlap the Playwright drafts specs. | Drop. | L |
| 3 | 64-69 | — | Reply-all recipient set (reply-to first, own address removed, cc kept), same reply resumes one draft, account switch race: no other coverage found. | Carry these 3. | L |
| 4 | 56, 68 | — | Shelf write failure keeps the current email. | Carry 1. | L |
| 5 | 52-69 | D8 | Each line holds 6-10 statements. | Split per case. | L |

## Proposed end state
Four cases (reply-all recipients, same-reply resume, shelf failure retention, account-switch race) in `test/integration/inbox-provider.test.ts`; file and its `inbox.test.mjs` row deleted.
