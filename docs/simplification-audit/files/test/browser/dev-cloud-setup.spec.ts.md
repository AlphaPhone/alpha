# test/browser/dev-cloud-setup.spec.ts
- Lines: 20 (5 tests) | Kind: Playwright `chromium`, dev build, UI plus IDB patching and `navigator.locks` holds | Verdict: **DELETE**
- Covers: development Dedicated hosting review completes and connects chat, setup survives reload and is isolated per sample account, failed persistence, Home cancels a locked account selection, another tab retires a queued setup write. Duplicates: `dev-cloud-scenarios.spec.ts`. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-20 | A3, D5 | Same PRD-excluded personal-Cloud / Dedicated provisioning fixture as `dev-cloud-scenarios`. | Delete with C4. | none |
| 2 | 12-13 | P3 | `IDBObjectStore.prototype.put` patch for `alpha.browser.cloud.setup.first.v1`. | Gone. | none |
| 3 | 15-20 | C3 | Inline `navigator.locks` "hold the document" barrier, also in `dev-connection-actions`, `dev-connection-setup`, `dev-clock`. | Gone here; see chunk summary for the shared helper. | none |

## Proposed end state
Deleted with the development Cloud fixture (C4).
