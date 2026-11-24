# test/cloud-maps-session.test.mjs
- Lines: 112 | Kind: bundled-module unit (esbuild-bundles real `maps/cloud-maps.ts` and `maps/share.ts` with 4-5 imports replaced by stub modules, imports via `data:` URL) | Verdict: DELETE; carry 2 cases to `journeys/maps.spec.ts`
- Covers: Cloud Maps stays configured across a rebuilt client of the same session/credential, retires on a new session/credential/sign-out; a captured provider refuses requests/tiles and late replies after the account changed; map "Copy link" resolves only after the copy settles, failure or closed panel resolves closed. Duplicates: `test/browser/journey-j04-cloud-maps.production.spec.ts`, `dev-maps-share.spec.ts` (Copy link), `maps-share-layout.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9 | C3/T3 | Local esbuild stub loader (one of several copies across `test/`). | Delete. | None |
| 2 | 24-83 | T3 | Account-binding of Maps requests: real privacy rule (no tiles/requests under another account). | `journeys/maps.spec.ts` (from `journey-j04-cloud-maps.production.spec.ts`): sign out or switch account while a search is pending -> no result shown, no further Maps requests (route log). | Medium |
| 3 | 94-112 | T4 | Copy-link settle semantics; `dev-maps-share.spec.ts` covers the visible flow. | Delete. | None |

## Proposed end state
Deleted. The Maps journey checks account switch mid-request; share behaviour stays in the Maps share journey step.
