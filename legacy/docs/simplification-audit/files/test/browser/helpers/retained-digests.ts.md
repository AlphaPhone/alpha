# test/browser/helpers/retained-digests.ts
- Lines: 9 | Kind: Playwright backdoor (dispatches the internal `alpha:hosted-digests` window event) | Verdict: **REWRITE** as a `harness/nav.ts` step through the visible route
- Covers: opens the "Scheduled digests" dialog without a user route ("the owner removed the Settings shortcut"). Duplicates: none. Callers/importers: `compact-viewport`, `digest-native-sources.production`, `digest-resident-schedule.production`, `journey-core-loops.production`, `mvp` specs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T6, P2 | Fires a product-internal event. The product does expose a visible entry: `apps/app/src/prototype/automations-adapter.ts:181` lists "Scheduled digests" in Automations, which dispatches the same event. | `nav.openScheduledDigests()` = open Automations → Scheduled digests. | Low. |
| 2 | 3-5 | A8 | History comment. | Delete. | none |

## Proposed end state
A role-based nav step through Automations; file deleted.
