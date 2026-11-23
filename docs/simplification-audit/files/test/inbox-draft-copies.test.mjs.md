# test/inbox-draft-copies.test.mjs
- Lines: 110 | Kind: stub-bundle transplant (esbuild bundles `prototype/inbox-drafts.ts` and `prototype/inbox-unsaved.ts` with 6-7 imports replaced by inline JS strings, loaded as `data:` modules) | Verdict: MERGE into `test/integration/inbox-gmail.test.ts` (one case) and DELETE the rest
- Covers: (1) an "earlier version of a sent email" opened from Drafts loses its `earlierThanSent` label once edited and saved; (2) `inboxUnsaved` coalesces 40 keystrokes into one secure-store write, flushes on hide, update and retire, refuses a >64 kB copy, and does not clear an edit typed during a clear. Duplicates: `scripts/test-inbox-multiple-drafts.ts` (run by `test/inbox.test.mjs`) bundles the same `inbox-drafts.ts` with an almost identical mock set; `test/inbox.test.mjs` case 4 bundles `inbox-unsaved.ts` again; `editCoalescer` (the write coalescing underneath) is proved by `specs/lemma/apps/app/src/runtime/inbox-edit-coalescer.dfy` and replayed by `specs/quint/refinement/services/inbox-edit-coalescer-replay.mjs`; `test/browser/inbox-unsaved-recovery.spec.ts` and `inbox-folders-drafts.spec.ts` drive drafts in the browser. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | C3, T2 | Local `bundle(entry, mocks)` helper keyed on the last path segment; the same helper exists in `inbox-operation-guards.test.mjs` and `scripts/fixtures/bundled-module.ts`. Any rename of an imported module silently stops stubbing it. | Delete with the file. | Low |
| 2 | 15 | C3 | Hand-written SHA-256→hex (renderer has the same helper ~28 times). | Gone with the file. | Low |
| 3 | 23 | T6-like | `inbox-unsaved` replaced by a 400-character JS string that re-implements its contract; test 1 then asserts against the fake. | Delete. | Low |
| 4 | 58-110 | T3, T4 | Coalescing behaviour duplicates the Lemma proof and Quint replay of `editCoalescer`; flush-on-hide/update/retire and "edit during clear survives" are the unsaved wrapper's own rules. | MERGE the wrapper rules (hide flush, retire flush, edit-during-clear kept, oversize refusal keeps prior copy) as one case driving the real module over an in-memory `secureConnectionStore` port. | Medium |
| 5 | 82-84 | T5 | Monkey-patches `JSON.parse` to count parses: tests an implementation detail (cache), not behaviour. | Drop. | Low |
| 6 | 73, 80 | T8 | Real-time 5 s polling loops waiting for the coalescer timer. | Use injected timers (the coalescer already accepts `timers`). | Low |

## Proposed end state
File deleted. `test/integration/inbox-gmail.test.ts` gets one "retained email copy" case on the real `inbox-unsaved.ts`
with an in-memory secure store and injected timers. The earlier-version label case moves to
`test/browser/journeys/inbox.spec.ts` (open "Earlier version of a sent email" from Drafts, edit, save, label gone) if the
owner wants it covered; it is not covered elsewhere today.
