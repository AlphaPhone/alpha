# test/browser/dev-connection-pagehide.spec.ts
- Lines: 32 (1 test) | Kind: Playwright `chromium`, dev build; synthetic `pagehide`/`visibilitychange` with `Storage.prototype.getItem` throwing | Verdict: **DELETE**
- Covers: the Development connections dialog closes on a persisted `pagehide` while storage throws, raises no page error, and can be reopened. Duplicates: none exactly; dialog retirement on `pagehide` is asserted in several other specs (`dev-maps-share`, `dev-camera-light`). Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-25 | P3, T6 | Patches `Storage.prototype.getItem`, redefines `document.hidden` and dispatches hand-made page-transition events; no user action. | Delete. | Low: the only coverage of "no exception when storage is revoked during pagehide" for this dialog. |
| 2 | 8, 30 | P2 | Opens the dev connection dialog through the diagnostics backdoor; the dialog itself is a development surface (D6). | Gone. | none |
| 3 | 5 | P13 | Local `pageerror` collector. | Harness auto-fixture fails on page errors for every spec. | none |

## Proposed end state
Deleted. The harness-wide `pageerror` failure covers unexpected exceptions on every journey's navigation.
