# test/app-update-startup.test.mjs
- Lines: 65 | Kind: unit of an upstream module (generated `.eliza/client-features/packages/ui/src/state/app-update-gate.ts`) with stub bridge | Verdict: DELETE
- Covers: startup only probes hosts that advertise `updateState`; an unmounted WebView acknowledges its own preparation and waits through uncertain status; a successor mounts after native reconciliation; same-bridge idle releases startup. Duplicates: upstream `vendor/eliza/packages/ui/src/state/__e2e__/app-update-gate.test.ts`; Quint `specs/quint/refinement/application/mounted-update-admission.mjs` runs `watchMountedAppUpdates` from the same module. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T5 | Imports generated upstream code; Alpha passes only the plugin name `AlphaDevice`. | Delete; if a case is missing upstream, add it there (D14 follow-up). | Low |

## Proposed end state
Gone.
