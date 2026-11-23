# specs/quint/refinement/application/recovery-ui.md
- Lines: 43 | Kind: harness narrative note | Verdict: DELETE (fold the "Environment boundaries" paragraph into the `RendererFailureUI.qnt` header)
- Covers: prose about the RendererFailureUI refinement, a past double-panel fix, run counts and environment limits. Duplicates: `recovery-ui.mjs:129-135` assumptions. Callers/importers: none (grep for `recovery-ui.md` outside `docs/` is empty).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | A8 | "Source correction" history. | Delete. | None |
| 2 | 27-30 | A8/B5 | Stale run counts ("1,000 simulations", "twelve existing diagnostics tests", "depth-six Apalache"). | Delete. | None |
| 3 | 32-43 | T4 | Restates assumptions. | One copy in the `.qnt` header. | None |

## Proposed end state
File deleted; the model header states what JSDOM does not establish (top layer, AT, WebView, Android renderer recovery).
