# specs/quint/refinement/services/combined-agent-launcher-baseline.md
- Lines: 24 | Kind: historical evidence note (pre-fix observation with commit and SHA-256 receipts) | Verdict: DELETE
- Covers: records the 2026 `metadata-write` custody bug observed at commit `3ef046a2…` before the launcher fix. Duplicates: git history. Callers/importers: only linked from `combined-agent-launcher.md:39` (repo grep found no other reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A8 / P6 / B5 | Changelog of a fixed defect with receipt hashes nothing reads; the current model checks `ChildCustodyAfterLaunch` as an invariant. | Delete; remove the link in `combined-agent-launcher.md`. Same for twin `reviewed-workflow-launcher-baseline.md` (other chunk). | None |

## Proposed end state
File gone; the fix is protected by the `metadata-write` / `metadata-stubborn` scenarios in the live harness.
