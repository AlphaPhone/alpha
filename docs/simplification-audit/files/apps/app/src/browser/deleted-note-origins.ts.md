# apps/app/src/browser/deleted-note-origins.ts
- Lines: 15 | Role: adapts the browser calendar and reminder deletion documents to the upstream Notes deletion-receipt port. | Verdict: MERGE into `browser/deletions.ts` (its only importer)
- Importers: 1 (`browser/deletions.ts:1,14`). Text/path pins: `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D11 | `import {deletedNoteOrigins as receiptsRetire,…}` — the upstream function is renamed to `receiptsRetire`, then wrapped by a local `deletedNoteOrigins`. | Import as `upstreamDeletedNoteOrigins`, or call it directly from `deletions.ts`. | None |
| 2 | 1-15 | D4 | One port object and a one-line wrapper with a single caller. | Inline the `receipts` port into `deletions.ts` (≈8 lines) and delete the file; edit `feature-parity.mjs`. | None |
| 3 | 1 | D13 | Deep relative `../../../../.eliza/client-features/...` import. | `@eliza/*` alias. | None |

## Local types and helpers
None with twins.

## Proposed end state
File removed; port defined in `deletions.ts`.

## Verification
`test/browser/notes-*` deletion specs, `pending()` callers (`runtime/deletion-undo.tsx`).
