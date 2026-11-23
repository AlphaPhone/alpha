# test/inbox.test.mjs
- Lines: 48 | Kind: wrapper of 3 child suites (`scripts/test-inbox-attention-flow.ts`, `test-inbox-multiple-drafts.ts`, `test-inbox-saved-drafts.ts` via `test/fixtures/child-suite.mjs`) plus one stub-bundle transplant of `prototype/inbox-unsaved.ts` | Verdict: MERGE (child-suite bodies into `test/integration/inbox-gmail.test.ts`); DELETE the inline case
- Covers: Inbox attention/badge, explicit reads, folders, provider drafts, attachments (attention-flow, 338 lines); multiple account-scoped local drafts (73 lines); saved drafts on the platform store (32 lines); inline case: clearing status copy "Clearing…" and that no chat copy reaches Inbox. Duplicates: the inline case re-bundles `inbox-unsaved.ts` like `inbox-draft-copies.test.mjs`; `test-inbox-multiple-drafts.ts` bundles `inbox-drafts.ts` like `inbox-draft-copies.test.mjs` test 1; Playwright `inbox-folders-drafts.spec.ts`, `inbox-unsaved-recovery.spec.ts`, `home-inbox.spec.ts` drive the same views. Callers/importers: `npm test` glob; the three scripts are called only from here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | T9 | Three child Node processes, two of them through `--import tsx`; failures surface as concatenated stdout. | Move bodies into the integration file as node:test cases; the attention flow already imports the real adapter through `scripts/inbox-adapter-fixture.ts`. | Low |
| 2 | 15-48 | T2, T3 | esbuild bundle with 6 stubbed imports to assert a status string and that a regex for chat copy never matches (a negative copy check). | Delete; "Clearing…" status is visible UI: one step in `test/browser/journeys/inbox.spec.ts` if wanted. | Low |
| 3 | 37 | T8 | Busy-wait `while(!fixture.row?.text) await setTimeout(1)` with no deadline: hangs forever on regression. | Gone. | Low |
| 4 | 9-10 | T4 | `test-inbox-multiple-drafts.ts` and `test-inbox-saved-drafts.ts` stub `inbox-unsaved`/`json-domain-document` with JS strings (scripts chunk). | When moved, run the real `inbox-local-store.ts` over an in-memory port instead of string stubs. | Medium |

## Proposed end state
File deleted. `test/integration/inbox-gmail.test.ts` holds the attention flow, multiple drafts and saved drafts cases
(real modules, in-memory ports, one shared inbox fixture), alongside the retention cases from
`inbox-retention-cases.test.mjs`. `test/fixtures/child-suite.mjs` loses this importer (8 importers remain; it goes
when the last `scripts/test-*.ts` wrapper moves).
