# scripts/test-notes-store-flow.ts
- Lines: 30 | Kind: unit of the upstream `NotesStore` through Alpha's 6-line binding (file-backed storage), half of it legacy migration | Verdict: DELETE
- Covers: lossless v1 -> v2 migration, revision stability across reconstruction, stale/concurrent/aborted refusal, voice association kept, `NotesCommitUncertain`, malformed store preserved. Duplicates: the semantics belong to `plugin-notes/src/client/notes-store.ts` (Alpha's `apps/app/src/runtime/notes-store.ts` only supplies key names); `test/browser/notes-document-storage.spec.ts` covers two-tab/lost-ack/malformed behaviour in the product. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 8-11, 24 | A1 | Seeds `LEGACY_NOTES_KEY` and asserts the legacy archive is never modified (D1 deletes the key). | Delete. | None |
| 2 | 11-28 | T5/T3 | Re-tests upstream store algorithms (revision hashing, CAS, uncertain commit). | Delete; upstream follow-up if plugin-notes lacks a concurrency test. | Low |

## Proposed end state
Deleted, with its shim entry.
