# scripts/aosp-unsigned-debug.init.gradle
- Lines: 5 | Kind: Gradle init script (forces unsigned debug APKs) | Verdict: DELETE
- Covers: sets the debug build type's signing config to null for every Android application project. Duplicates: none. Callers/importers: none: `git grep "unsigned-debug"` finds nothing in the repository (outside this audit) or in `vendor/eliza`; no `--init-script` in any script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | A7 | Orphan file. | Delete. | None |

## Proposed end state
Deleted.
