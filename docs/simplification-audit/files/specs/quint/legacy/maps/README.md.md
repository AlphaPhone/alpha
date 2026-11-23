# specs/quint/legacy/maps/README.md
- Lines: 52 | Kind: documentation for a historical Quint comparison harness | Verdict: DELETE (with `legacy/maps/` and `Maps.qnt`, C17/D11)
- Covers: prose description of what `check-maps-refinement.mjs` mounts, which six `MapsHistorical*` mismatches it records, and the command `node --import=tsx --test test/quint-legacy-maps-refinement.test.mjs`. Duplicates: the `assumptions` array in `check-maps-refinement.mjs:500-506` says the same thing. Callers/importers: none (docs only; `git grep legacy/maps` hits only the harness importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-52 | P6 | Describes a historical-design replay (source `ef9fbf7cd7`) whose model the sibling reports already DELETE. | Delete with the directory. | None |
| 2 | 13-21 | — | The viewport/text-scale hit-target paragraph is the only written record that Maps guidance controls are checked at 150 % text and in landscape with the right-docked pill. | Carry that requirement into the Maps journey spec (see chunk summary), not into a README. | Low |

## Proposed end state
File removed with `specs/quint/legacy/maps/`. Nothing replaces it; the live `MapsRerouteOwnership` harness documents its own mount in `specs/quint/application/README.md`.
