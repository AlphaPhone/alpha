# test/browser/signed-out-page.spec.ts
- Lines: 5 | Kind: Playwright smoke (`chromium`, `?mode=dev`), 1 test | Verdict: **MERGE** into `journeys/dev-surface.spec.ts`
- Covers: the explicit development build has no production sign-in gate, and Settings reaches "Development connections". Duplicates: `settings-page-accessibility` (dev Settings rows); research suggests the dev-surface smoke. Callers/importers: none. It imports `helpers/connection-diagnostics` (`openConnectionDiagnostics`, a backdoor navigation helper per research).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T7 | A one-assertion spec file. | One step in the dev-surface journey. | none |
| 2 | 1 | T6-lite | `openConnectionDiagnostics` reaches the diagnostics surface outside visible navigation. | Navigate by visible rows (Settings → General → Developer → Connections) when merged. | none |

## Proposed end state
In `journeys/dev-surface.spec.ts`: "dev build has no sign-in gate and shows Development connections", reached through
visible Settings rows.
