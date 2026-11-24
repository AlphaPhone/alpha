# specs/quint/legacy/core/interaction-metadata.json
- Lines: 349 | Kind: formal-spec configuration data (legacy) | Verdict: DELETE
- Covers: per-profile metadata (constants, invariants, properties, deadlock flag) for `CoreActionSettlement`, `CoreApprovalService`, `CoreInteractionSession`, `CoreInteractiveTask`.
- Duplicates: the same model/configuration records in `specs/quint/legacy/manifest.json`. Callers/importers: none by name — `git grep interaction-metadata` returns nothing outside the audit; only reachable through the optional `--metadata=` flag of `legacy/core/check-configurations.mjs`, which itself has no caller (research ci-and-formal §3).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7, P6 | Orphan data file for an orphan runner, describing historical models. | Delete with `check-configurations.mjs` and the legacy tree. | None |

## Proposed end state
Deleted.
