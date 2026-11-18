# specs/quint/refinement/native/renderer-coordinator.mjs
- Lines: 45 | Kind: Quint refinement driver (host JVM; whole `MainActivity`, `RendererRecoveryBudget`, `NavigationOpenRequest`) | Verdict: KEEP; SIMPLIFY
- Covers: Foreground renderer recovery and task handoff: HOME escape/reload, standard backoff, assistant/standalone surfaces, foreign duplicates, closed callbacks, clock window, Settings fallbacks, handoff markers/acks/failures, configuration recreate, stale posts, task restoration and reuse. Model `RendererRecovery` (`id RendererRecovery-main-activity`). Duplicates: none. Callers/importers: `native/index.mjs:21,189`, `test/quint-renderer-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35 | correctness (minor) | `sources: [...data.sources, ...extraSources]` adds `extraSources` twice (already in `data.sources` from line 21). | Pass `data.sources`. | None |
| 2 | 19 | T10 (indirect) | Hashes `AlphaNavigationService.java` (`navigationActionSource`) though it is not compiled here; `main-activity-platform.mjs:562` reads it as text. Any rename there breaks this harness. | Fix in `main-activity-platform.mjs` (port to a compiled constant); drop from this list. | Low |
| 3 | 17-31 | A7 | `generateRendererCoordinatorTraces` exported only for the CLI (`git grep` finds no other caller). | Inline; drop the CLI. | None |
| 4 | 29, 37 | B5 | `fixtureSha256` of the stub set embedded in an assumption string. | Delete. | None |

## Proposed end state
~25 lines: compile, run the 27-scenario campaign, `checkTraces`.
