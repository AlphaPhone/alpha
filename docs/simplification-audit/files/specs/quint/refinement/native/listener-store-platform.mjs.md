# specs/quint/refinement/native/listener-store-platform.mjs
- Lines: 33 | Kind: Quint refinement fixture (SharedPreferences/Context/PackageManager stubs; stand-in `Listener`, `ListeningService`, `SenseConfig`) | Verdict: KEEP (fold into one sense stub folder)
- Covers: ports for `listener-store.mjs`; base layer for `listener-service-platform.mjs`. Callers/importers: `listener-store.mjs`, `listener-service-platform.mjs`, and (transitively hashed) `listener-input.mjs`, `listener-service.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-30 | D6 / D8 | One-line Java strings; `Context.stopService` asserts the exact `ListeningService` component (useful check, keep it). | Static files shared with the service layer. | Low |

## Proposed end state
Part of one `stubs/sense/` folder.
