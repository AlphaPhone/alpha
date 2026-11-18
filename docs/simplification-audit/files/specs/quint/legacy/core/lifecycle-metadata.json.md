# specs/quint/legacy/core/lifecycle-metadata.json
- Lines: 594 | Kind: formal-spec configuration data (legacy) | Verdict: DELETE
- Covers: per-profile metadata for `CorePluginLifecycle`, `CoreRuntimeLifecycle`, `CoreServiceLifecycleDesign`, `CoreTaskScheduler`, `CoreTaskService`.
- Duplicates: entries in `specs/quint/legacy/manifest.json`. Callers/importers: none (`git grep lifecycle-metadata` empty); only the optional `--metadata=` input of the uncalled `check-configurations.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7, P6 | Orphan data for an orphan runner. | Delete. | None |

## Proposed end state
Deleted.
