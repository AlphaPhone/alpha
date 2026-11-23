# specs/quint/refinement/services/browser-cloud-request-custody-baseline.md
- Lines: 21 | Kind: narrative doc (historical defect report + description of the corrected model) | Verdict: DELETE
- Covers: describes a request-ID custody defect in the dev bridge at commit `e180629fe5...` and how `BrowserCloudRequestCustody.qnt` models the fix. Duplicates: the harness `assumptions` in `browser-cloud-request-custody.mjs:41-45` and the model file. Callers: none (`git grep browser-cloud-request-custody-baseline` finds nothing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-13 | A8 | History of a fixed defect pinned to an old commit; nothing runs it ("Run the exact baseline from commit ..." needs a checkout of that commit). | Delete. | None |
| 2 | 15-21 | A8 | "Corrected request custody" restates the model and harness assumptions; counts ("25 states") will drift. | Delete; if wanted, one line in the `.qnt` header. | None |

## Proposed end state
File removed.
