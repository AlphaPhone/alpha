# specs/quint/legacy/core/plugin-lifecycle-refinement.md
- Lines: 18 | Kind: formal-spec documentation (legacy) | Verdict: DELETE
- Covers: prose for the `CorePluginLifecycle` legacy replay (upstream `registerPlugin`/unload) and its two expected mismatches (rollback visibility, final shutdown lookup).
- Duplicates: the two mismatches are restated in `specs/quint/refinement/legacy/index.mjs` (`pluginDifferences`). Callers/importers: linked from nothing (`git grep plugin-lifecycle-refinement.md` empty; the `plugin-lifecycle-refinement` hits are the `.mjs` harness).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 | Documents a historical upstream TLA replay. | Delete with `check-plugin-lifecycle-refinement.mjs` and the model. | None |

## Proposed end state
Deleted.
