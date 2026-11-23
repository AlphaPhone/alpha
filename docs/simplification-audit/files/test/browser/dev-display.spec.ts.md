# test/browser/dev-display.spec.ts
- Lines: 36 (7 tests) | Kind: Playwright `chromium`, dev build; 1 product UI journey, the rest drive the `AlphaDevice` browser stand-in through `registerPlugin` and IDB patches | Verdict: **MERGE** into `journeys/settings.spec.ts` (1 case)
- Covers: Settings → General → Display text size (product), text scale persistence and non-compounding on new content, simulated shade brightness and device display settings, failed persistence rollback, permission snapshot facts, cross-tab updates. Duplicates: none for the Display choices. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-30 | — | Real journey: Settings → General → Display → "Text size: Largest", selected state, then Small. | Carry (drop screenshot). | none |
| 2 | 3-7 | P2 | Sets text scale through `AlphaDevice.setTextScale`; checks persistence after reload and that new 20 px content becomes 30 px once. | Fold into case 1: choose Largest through the UI, reload, then check a newly opened view's font size. | Low |
| 3 | 8-12, 31-33 | P7 | Shade brightness slider and `openSettings({page:'display'})` are the simulator's stand-in for Android system settings. | Delete. | Low |
| 4 | 13-15, 34-36 | P3 | `IDBObjectStore.prototype.put` patches for `alpha.browser.device.v1`. | Delete. | Low: control rollback on a failed write loses coverage (stand-in only). |
| 5 | 16-18 | T6 | Permission snapshot read via `AlphaDevice.snapshot()`; no UI. | Delete. | Low |

## Proposed end state
One Display step list in the settings journey: pick Largest, see the selected state and larger text, reload and keep it, a newly opened view is scaled once, pick Small. Research proposed deletion; the Display choice is product Settings, so one case stays.
