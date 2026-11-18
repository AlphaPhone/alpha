# specs/quint/refinement/native/NavigationServicePorts.java
- Lines: 47 | Kind: Quint refinement support (static port state for the navigation harness) | Verdict: KEEP
- Covers: controlled Android command delivery (`startForegroundService`/`startService` hooks with one-shot failure and pre/post hooks), permission/declaration flags, authority-token numbering and `navigationStopped` event capture for `NativeNavigationOwnership`. Duplicates: none.
- Callers/importers: `NavigationServiceTraces.java`, `navigation-service.mjs` (compiled list), `navigation-service-platform.mjs` (generated `Context`, `PackageManager`, `Service`, `Plugin` stubs call `start`, `command`, `event`, `permission`, `declared`, `failForeground`, `fallbackStops`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40 | coupling | Reads `AlphaNavigationService.ACTION_STOP` (package-private constant). Stable product name. | None. | None |
| 2 | 31 | D8 | `fallbackStops` declared away from the other fields. | Group with the other statics when the file is next touched. | None |

## Proposed end state
Unchanged. It lives and dies with `NavigationServiceTraces.java`.
