# test/browser/dev-network.spec.ts
- Lines: 15 (3 tests) | Kind: Playwright `chromium`, dev build with `tools=1&shell=launcher`; simulator shade tiles and `AlphaDevice` network stand-in | Verdict: **DELETE**
- Covers: the simulated shade's Wi-Fi and Bluetooth tiles and the simulated Wi-Fi settings dialog share persisted state; airplane mode disables radios and restores them; cross-tab updates; a failed write keeps all values. Duplicates: none. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-15 | P7, A5 | Network tiles and `openSettings({page:'wifi'})` exist only in the development simulator; on Android these are system Quick Settings and Settings (research: "delete/dev-surface smoke"). | Delete. | Low: no product renderer behaviour is lost. |
| 2 | 9, 12-13 | T6 | `AlphaDevice.setNetwork` and `openSettings` called in-page. | Gone. | none |
| 3 | 14 | P3 | `IDBObjectStore.prototype.put` patch. | Gone. | none |

## Proposed end state
Deleted. If the owner keeps the simulated shade (Q-DEV-1), opening it is one step of `journeys/dev-surface.spec.ts`; its toggles need no test.
