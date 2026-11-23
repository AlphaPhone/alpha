# test/photos-view-contract.test.mjs
- Lines: 80 | Kind: unit tests of an upstream module (`.eliza/.../device-actions/photos-view-contract.ts`) | Verdict: DELETE
- Covers: validators and review text for the agent's Photos view operations (`photos_filter`, `photos_open`, `photos_album_create`, `photos_share`). Duplicates: `vendor/eliza/plugins/plugin-assistant/src/services/device-actions/photos-view-contract.test.ts` (323 lines, the same 10 areas: types, filter, open, album, share, capability negotiation, review text, results). Callers/importers: `npm test`; imports `apps/app/src/runtime/photo-library.ts` (`LIBRARY_LIMITS`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-80 | T5/T4 | It re-tests an upstream validator that has its own suite upstream. The header comment ("Source-level: the phone consumer tests") says as much. | Delete. | none |
| 2 | 7-13 | T1-like | Asserts constant arrays and the capability string. | Gone with the file. | none |
| 3 | 22, 36, 38 | — | The one Alpha-specific fact: upstream limits agree with the phone's `LIBRARY_LIMITS.query` and `.kept`. | If the owner wants it pinned, the phone should import the limits from the upstream contract (one source) rather than test equality. Raised as an owner question. | low |

## Proposed end state
Deleted. Upstream owns the validator tests. If the phone keeps its own `LIBRARY_LIMITS`, derive `kept` and `query` from the upstream
contract export so that no equality test is needed.
