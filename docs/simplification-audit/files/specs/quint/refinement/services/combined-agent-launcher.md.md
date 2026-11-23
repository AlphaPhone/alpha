# specs/quint/refinement/services/combined-agent-launcher.md
- Lines: 50 | Kind: model/harness prose | Verdict: KEEP pending owner (delete with the launcher); trim
- Covers: scope of `CombinedAgentLauncher`, fixture design, schedules and run command. Duplicates: `assumptions` in `combined-agent-launcher.mjs:59-64`. Callers/importers: none (repo grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-40 | A8 | "is now a checked safety invariant. The prior source observation is preserved in the baseline record" narrates history and links the baseline file proposed for deletion. | Delete the history sentences and link. | None |
| 2 | 42-45 | — | Cross-reference to `DevelopmentHost` / `cloud-resident-host.ts` is accurate scope separation. | Keep one line. | None |
| 3 | whole | C7 | Duplicates harness assumption strings. | Keep one copy. | None |

## Proposed end state
~20 lines of current scope and one run command, or deleted with the launcher.
