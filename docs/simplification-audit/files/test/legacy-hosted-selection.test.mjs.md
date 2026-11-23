# test/legacy-hosted-selection.test.mjs
- Lines: 125 | Kind: transplant (slices three regions of `runtime/connection-ui.tsx` by literal markers, strips types, runs them in `vm` with fake `localStorage`) plus source-text (Settings agent-status row sliced from `prototype/settings-adapter.ts` and run through `new Function`; regexes over `initialize()`) | Verdict: DELETE
- Covers: `migrateLegacyHostedSelection`: a saved hosted/paired agent selection from an earlier build becomes `{kind:'resident'}`, the old choice is moved to `alpha.connection.legacy-hosted-selection.v1`; Settings never labels a non-resident connection as on-device. Duplicates: none; the feature itself is retired. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-78, 98-114 | A1, D1, D5 | Tests a migrate-on-read path for data from an earlier build (comment cites "#406"); the package starts with empty private data, so the migration, `LEGACY_HOSTED_SELECTION` (`connection-ui.tsx:1612-1640`) and the startup call (`:2640`) are deleted under D1/D5. | Delete with the migration. | Low |
| 2 | 12-17, 116-125 | T2, T1 | Marker slices (`'/**\n * Every Alpha Phone signs in to Eliza Cloud'`) and regexes over `initialize()` body. | Delete. | Low |
| 3 | 80-96 | T1, T2 | The Settings "Agent: Unsupported/Remote/Running" rule is evaluated by slicing source with `indexOf('          const agentStatus…')` (exact indentation). Product rule worth one assertion. | Cover in `test/browser/journeys/settings.spec.ts`: production-gated build shows "Agent · Running" for the resident (already the default state). Non-resident kinds cannot occur in a product build after D5. | Low |
| 4 | 18-19 | C6 | Storage key literals re-declared. | Gone. | Low |

## Proposed end state
File deleted together with `migrateLegacyHostedSelection` and `LEGACY_HOSTED_SELECTION`. The Settings agent row is
asserted by the settings journey.
