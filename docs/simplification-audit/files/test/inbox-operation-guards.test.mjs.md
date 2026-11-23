# test/inbox-operation-guards.test.mjs
- Lines: 280 | Kind: mixed. Stub-bundle transplant of `runtime/inbox-operation.ts`, `runtime/gmail-mailbox.ts`, `prototype/inbox-provider-controls.ts`, `runtime/service-read-cache-store.ts` (esbuild, ports replaced by JS strings); unit tests of `editCoalescer` and `ServiceReadCache` (real imports, fake clock/store) | Verdict: MERGE 3 cases into `test/integration/inbox-gmail.test.ts`, DELETE the rest
- Covers: Gmail mailbox operation journal (regressed "prepared" receipt never re-arms Confirm, lost dispatch reply stays dispatching, withdrawn grant blocks a saved review after restart), edit coalescer timing, mail/Calendar read-cache separation and eviction, newest-bodies-that-fit. Duplicates: `regressedReceipt`/`receiptReadGuard` are proved in `specs/lemma/apps/app/src/runtime/inbox-operation.dfy`; `InboxOperation` is replayed by `specs/quint/refinement/services/inbox-provider-drafts.mjs`, `inbox-coordinator-ports.mjs`, `inbox-cleanup.mjs`; `editCoalescer` by `inbox-edit-coalescer.dfy` + `inbox-edit-coalescer-replay.mjs` + `test/quint-inbox-edit-coalescer.test.mjs`; `ServiceReadCache` by `test/service-read-cache.test.mjs`, `test/quint-service-read-cache.test.mjs`, `specs/quint/refinement/services/service-read-cache-replay.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-16 | C3, T2 | Second copy of the last-segment `bundle()` stub helper (twin in `inbox-draft-copies.test.mjs`). | Delete. | Low |
| 2 | 55-63 | T3, T4 | Truth-table of `regressedReceipt` plus `receiptReads.length === receiptReadGuard.length` (checks an arity). The Lemma proof covers the predicate. | Delete. | Low |
| 3 | 65-106 | T4 | Journal regression/lost-reply/unsent-review cases over a fake client: the real operation module against a fake Gmail port. Partly covered by the Quint replays. | MERGE one table-driven case ("regressed provider answer after dispatch: no second dispatch, survives reload") into the inbox integration file over the real module. | Medium |
| 4 | 116-170 | T2 | Review sheet (`inbox-provider-controls.ts`) bundled with `connection-ui` and `inbox-local-store` stubbed through `globalThis.inboxControlsFixture`; sets `document.documentElement.dataset` by hand. User-visible ("Confirm is not offered again", "nothing is dispatched under a withdrawn grant"). | REWRITE in `test/browser/journeys/inbox.spec.ts` with the Gmail fixture provider: confirm archive, provider regresses, Check, Confirm hidden; restart with `mailboxMutations:false`, Confirm hidden. | Medium |
| 5 | 172-201 | T3, T4 | Edit-coalescer timing with a home-built fake clock; duplicate of Lemma + Quint replay. | Delete. | Low |
| 6 | 203-237 | A1, T2 | "Mail saved in the account document by an earlier version is erased there, not read": a legacy cleanup path (D1: no earlier install exists). The rest (separate documents per service, clear isolation) duplicates `test/service-read-cache.test.mjs`. | Delete; delete the retired-snapshot eraser in `service-read-cache-store.ts` with it. | Low |
| 7 | 239-267 | T3, T5 | Eviction counts `toJSON` calls (performance detail) and an exact 4 MiB bound; bound is worth one case, the encode count is not. | Keep one "4 MiB bound evicts oldest" case in the merged service-read-cache test. | Low |
| 8 | 269-280 | T3 | `newestMailBodies`/`cachedJsonBytes` pure helpers; only test of them. | Fold one case into inbox integration (saved mailbox keeps newest bodies under a byte budget). | Low |
| 9 | 22 | C3 | Inline SHA-256→hex helper. | Gone. | Low |

## Proposed end state
File deleted. Inbox integration gains: regressed receipt after dispatch never re-dispatches (real `InboxOperation`,
in-memory store, fake Gmail port), saved mailbox byte budget. The review-sheet cases become two steps of the inbox journey.
The legacy shared-document eraser and its test go together (D1).
