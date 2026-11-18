# test/browser/connection.production.spec.ts
- Lines: 31 | Kind: Playwright, `production` project, flag-off bundle in a plain browser (no bridge) | Verdict: **MERGE** into `journeys/production-gating.spec.ts` (cold-start case only)
- Covers: the web production build shows an "Android only" chooser with Continue, offers no pairing or hosting controls, sends nothing off-host, remembers Continue across reload, keeps the conversation map, and moves saved `remote`/`cloud` selections aside to the resident. Duplicates: `connection-boundaries.production.spec.ts:283-321` (`legacyWeb`, same chooser, same Continue flow). Callers/importers: none. 3 tests (loop).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 19-23 | A1 / C4 | Two of three loop arms seed legacy `remote`/`cloud` selections and assert the `legacy-hosted-selection.v1` move (#406). Deleted with C4. | Keep only the cold-start arm. | none |
| 2 | 10, 24, 29 | A1 | Seeds and checks a conversation map keyed by `legacy-owner-*`. Only meaningful for the migration. | Drop. | none |
| 3 | 2 | A8 | Comment referring to "Remote development protocol fixtures … in the dev-* lane". | Delete. | none |
| 4 | — | T4 | Same behaviour as the `legacyWeb` cold-start arm in `connection-boundaries`. | One test. | none |

## Proposed end state
One test in `journeys/production-gating.spec.ts`: web build cold start shows the Android-only chooser, no pairing controls, Continue persists across reload, no off-host request.
