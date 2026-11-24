# specs/quint/application/DockClearanceOwnership.qnt
- Lines: 86 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Dock clearance measurement ownership: exact installer, visible header, safe insets; stale cleanup cannot erase replacement measurements. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/dock-clearance-ownership.mjs`, `test/quint-dock-clearance-ownership.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`); ui-return review note.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T2/T10 | Builds a JSDOM from `template.html`, strips types of `runtime/dock-clearance.ts` and runs it in `vm`; reads `main.tsx` and `.eliza/.source.json`. | Bundle-import `dock-clearance.ts` (it is a module); keep JSDOM. | Low. |
| 2 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; harness imports dock-clearance.ts into JSDOM.
