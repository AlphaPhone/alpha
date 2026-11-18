# apps/app/src/prototype/scan-text-layer.ts
- Lines: 1 | Role: Re-export shim: `export * from '../../../../.eliza/client-features/plugins/plugin-files/src/documents/scan-text-layer.ts';` | Verdict: DELETE
- Importers: 3, all `import type {ScanTextLine}` — `scan-document.ts:4`, `scan-pdf.ts:2`, `scan-searchable-review.ts:7`. No value import (`validateScanTextLayer` is not imported through it).
- Text/path pins: `specs/quint/services/manifest.json:909` (source list), `test/support/feature-parity.mjs:419` (path list), `specs/quint/refinement/services/scan.mjs` (mentions path). Research confirmed as shim (app-prototype §P14).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | Pass-through re-export used only for one type. | Replace the three `import type` lines with the plugin-files path (or the `@eliza/…` alias once D13 lands); delete the file; remove it from `specs/quint/services/manifest.json:909` and `test/support/feature-parity.mjs:419`. | None (type-only). |

## Local types and helpers
None.

## Proposed end state
File deleted.

## Verification
`npx tsc --noEmit` (or `npm run verify` typecheck); `node --test test/feature-parity*.test.mjs`; Quint services manifest source check.
