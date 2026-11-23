# scripts/test-inbox-retention-cases.ts
- Lines: 120 | Kind: source transplant (T2) through `scripts/inbox-adapter-fixture.ts` `boot()` (vm-evaluated stripped `prototype/inbox-*.ts`), already `node:test` with 9 cases | Verdict: REWRITE as cases in `test/browser/journeys/inbox.spec.ts` ("reader survives part failures")
- Covers: an open message stays open when a stale body refresh, resume check, attachment, conversation or its next page fails (503); a 403 still closes it and clears content; Load more cursor survives opening a message; a stale review re-reads the open message; Drafts reload keeps Load more; failed refresh keeps the offline snapshot; Archive waits for the re-read revision after a read-state change. Duplicates: `test/browser/inbox-folders-drafts.spec.ts` (thread loads), `gmail-grant-recovery.spec.ts` (revocation clears). Callers: `test/inbox-retention-cases.test.mjs` (spawns `--test` and asserts the output contains `tests 9`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | T2 | Depends on the transplant harness. | Journey cases with route-level 503/403 injection. | M |
| 2 | shim | B5/T9 | The shim asserts the child printed exactly `tests 9`: an exact-count ceremony; adding a case breaks it. | Delete the shim. | L |
| 3 | 108-120 | — | Case 9 (Archive uses the re-read revision, nothing prepared against the old one) protects mailbox integrity. | Carry. | M |
| 4 | 15-53, 92-106 | — | Cases 1, 3, 4, 8 are user-visible resilience rules. | Carry. | L |
| 5 | 25-31, 55-90 | T4 | Cases 2, 5, 6, 7 are narrower variants (resume check, cursor, stale review re-read, drafts reload). | Carry 6 only if no journey covers "Retry with the current message"; drop 2, 5, 7. | L |

## Proposed end state
Five or six journey cases in `journeys/inbox.spec.ts`; this file and `test/inbox-retention-cases.test.mjs` deleted.
