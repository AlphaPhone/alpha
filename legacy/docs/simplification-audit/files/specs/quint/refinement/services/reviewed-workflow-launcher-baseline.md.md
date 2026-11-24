# specs/quint/refinement/services/reviewed-workflow-launcher-baseline.md
- Lines: 24 | Kind: historical record (pre-repair baseline hashes and receipt digests) | Verdict: DELETE
- Covers: records the launcher, model and receipt SHA-256s at commit `eadc3dd782…` before a custody repair, and the two lost-custody schedules. Duplicates: git history. Callers: linked only from `reviewed-workflow-launcher.md:31` (grep: no code reads it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-24 | A8 / B5 | Changelog of a past fix with hashes and receipt digests; no consumer. | Delete; remove the link in `reviewed-workflow-launcher.md:30-31`. | None |

## Proposed end state
Gone. The commit hash is recoverable from git log.
