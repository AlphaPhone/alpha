# test/mail-preview.test.mjs
- Lines: 29 | Kind: unit (real import of `runtime/mail-preview.ts` under JSDOM) | Verdict: MERGE into `test/integration/inbox.test.mjs` (one case); DELETE the rest
- Covers: Gmail preview snippets decode entities once, stay literal text, and drop marketing preheader padding. Duplicates: `test/browser/mail-preview.spec.ts` (entities, literal markup, no image request, drafts) covers tests 1-3. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-21 | T4 | Entity decoding and "markup cannot create elements" are driven end-to-end by `mail-preview.spec.ts`. | Delete. | None |
| 2 | 23-29 | T3 | Preheader-padding stripping (ZWNJ, U+034F, braille blank) while keeping real Persian ZWNJ and braille text is not covered elsewhere. | Carry as one table-driven case (5 rows). | Low |

## Proposed end state
One preheader case in `test/integration/inbox.test.mjs`; file deleted.
