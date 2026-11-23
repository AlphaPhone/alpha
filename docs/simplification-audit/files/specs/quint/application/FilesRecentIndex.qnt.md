# specs/quint/application/FilesRecentIndex.qnt
- Lines: 129 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Files recent list: bounded index, picker grants released only when no kept row names them; exported scan eviction rules. Duplicates: Files Playwright journeys. Callers/importers: `specs/quint/refinement/application/files-recent-index.mjs`, `test/quint-files-recent-index.test.mjs` (not in index); 11 symbol pins.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 21-26 | T2/T10 | `loadProductModule` bundles files-index.ts and scan-pdf.ts but with `rewrite` text transforms (asserted to change), and reads `selection-adapter.ts` text to slice adapter behaviour. | Import without rewrites; move the selection-adapter piece it needs into files-index.ts or export it. | Low-medium. |
| 2 | manifest symbols | T10 | 11 pins (duplicates `filesIndex`, `forgetSelected` twice). | Delete. | None. |

## Proposed end state
Model unchanged; harness imports modules unmodified.
