# specs/quint/legacy/README.md
- Lines: 214 | Kind: documentation of the legacy Quint family | Verdict: DELETE (with C17)
- Covers: translation notes, TLC state counts, check commands and receipt narrative for the 11 historical design models and the view-refresh runner. Duplicates: `specs/quint/legacy/core/README.md` (Core conversions); `specs/quint/README.md:13` row links here. Callers: linked from `specs/quint/README.md:13`; no script reads it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 84-117, 176-214 | B5 / A8 | Long receipt narrative ("Full finite-state checking … recorded separately in `test-results/quint-legacy/`", `Calendar-optimized.log`, `CameraSession-properties-stable.json`, "interrupted runs remain separate evidence"): evidence ceremony pointing at untracked `test-results/` files nobody reads. | Delete with family. | — |
| 2 | 112-113 (per formal audit R1d) | A7 | Links to `docs/flow-redesign-2026-11/tla/results.md` and `docs/ui-refresh-2026-11/tla/results.md`, which do not exist. | Delete with family. | — |
| 3 | 3-6 | P6 | States the "current design" is source `ef9fbf7cd7`: self-declared historical. | — | — |

## Proposed end state
Removed. `specs/quint/README.md` drops the Legacy row (line 13) and states that formal families are application, services and native.
