# test/browser/browser-cloud-bootstrap.spec.ts
- Lines: 45 | Kind: Playwright spec, chromium; module-in-page (T6) against the dev `/__alpha-browser-cloud` host bridge, 4 tests | Verdict: DELETE
- Covers: on the browser development host, an empty optional Cloud credential leaves Home usable; injected native `AlphaConnection` cannot fall through to the dev store; choosing offline during a held credential read wins; a credential that changes during restore is refused ("Account changed"). Duplicates: production Cloud sign-in/restore specs (`native-cloud-*`, other chunks). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-11 | P7 | Routes `/__alpha-browser-cloud`, the Vite dev bridge (`scripts/browser-cloud-dev-bridge.ts`), not a production path. | Delete. | Low. |
| 2 | 15, 23, 29-31, 40 | T6/P2 | Calls `connectionController.initialize/offline` and `native-connection.ts` stores directly. | Delete. | Low. |
| 3 | 33-45 | coverage | "Account changed" restore race is product logic in `connection-ui.tsx` shared with native. | If wanted, add one step to `journeys/connection-cloud.spec.ts` with the native credential stub changing between reads. | Medium. |

## Proposed end state
File deleted. One optional "credential changed during restore → Account changed alert" step in the connection-cloud journey on the production harness.
