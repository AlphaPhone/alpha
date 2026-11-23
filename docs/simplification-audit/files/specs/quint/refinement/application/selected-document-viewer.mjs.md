# specs/quint/refinement/application/selected-document-viewer.mjs
- Lines: 55 | Kind: Quint model-trace replay on the real bundled module (`loadBundled`) in JSDOM | Verdict: KEEP
- Covers: `SelectedDocumentViewer` — `openSelectedDocumentViewer` (`apps/app/src/browser/selected-document-viewer.ts`, used by `browser/files.ts`) closes once, Back closes the oldest, hiding closes all, reopen works, listeners are released (4 per viewer). Duplicates: none formal; Files preview Playwright specs touch the viewer UI. Callers: `test/quint-selected-document-viewer.test.mjs` only (not in the aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C5 | Uses `browser-model-traces.mjs`, one of three near-identical ITF trace runners (`assistant-model-traces.mjs`, `shell-model-traces.mjs`). | Import the single merged runner once they are merged. | L |
| 2 | 43 | — | `listening` compares listener count to `4 * open.length`; couples to the exact number of listeners per viewer. Acceptable as the model abstraction states it. | Keep; document in model. | L |
| 3 | 1-6 | — | Real import, no text slicing; good template for other ports. | — | — |

## Proposed end state
Unchanged apart from importing the shared trace runner. Runs in the quint-refinement lane when
`selected-document-viewer.ts` or its model changes.
