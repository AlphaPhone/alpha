# test/quint-maps-share-choice.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (`replayMapsShareChoice`, `specs/quint/refinement/application/maps-share-choice.mjs`; driver strips/slices `prototype/maps-adapter.ts` and `action-message-presentation.ts`) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the chat share-choice buttons follow MapsShareChoice (7 scenarios, 5 witnesses, 60 walks; 16 actions). Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 8-14 | B5 | Count pins and a 16-action list on a 330-char line; `console.log` noise. | Drop. | None |
| 3 | — | T10 | Driver slices two product files. | PORT to imports. | Medium |

## Proposed end state
Deleted; MapsShareChoice registered in the application index.
