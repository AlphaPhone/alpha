# test/workflow-management-capability.test.mjs
- Lines: 42 | Kind: transplant (`prototype/workflow-adapter.ts` in a vm via `scripts/workflow-renderer-fixture.ts`, fake controller and shell); re-spawns under tsx | Verdict: DELETE
- Covers: the "Removed workflows" management card is shown only while the agent reports lifecycle support, and a late capability answer cannot publish after abort, leaving or owner change. Duplicates: `test/browser/workflow-removed-navigation.spec.ts`, `workflow-retirement.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T9/T2 | tsx respawn plus text-stripped adapter source. | Delete. | None |
| 2 | 30, 40 | B5 | Exact read counters (`statusReads`, `listReads`). | Delete. | None |
| 3 | 33-42 | T3 | Staleness fence on a probe, tested with a hand-built owner swap. | Delete; the staleness-fence mechanism is being generalised (C4) and gets its own coverage there. | Low |

## Proposed end state
File deleted. `journeys/workflows.spec.ts` keeps one case: with an agent that supports lifecycle changes, Settings › Workflows shows "Removed workflows"; with one that does not, it does not.
