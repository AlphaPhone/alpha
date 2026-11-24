# test/browser/simulator-recovery.spec.ts
- Lines: 41 | Kind: Playwright chromium, 8 tests; dev-surface UI ("Saved app recovery" dialog under `?mode=dev&tools=1`) with two module-in-page checks (s2 r42 w1) | Verdict: MERGE into `journeys/dev-simulator.spec.ts`
- Covers: malformed `alpha.dev.app.*` data is preserved byte-for-byte, recovery dialog isolates the broken app, download returns the raw bytes, reset is explicit and refuses concurrent replacement / failed removal / foreign tab / retired page, polling does not reopen a dismissed dialog. Duplicates: `simulator-concurrency.spec.ts` (module-level twin of tests 6-7), `remaining-dialog-layout.spec.ts` (dialog layout). Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-14 | A3 / D2 | Seeds `wallet` and expects a "Reset Wallet" button. Wallet is deleted (D2); the case fails once `browser/apps.ts` drops it. | Remove `wallet` from the seed and the button list. | Low |
| 2 | 7 | T6 / P3 | `Component.prototype.vset.call({},'inbox',…)` from `/src/prototype/model.js` asserts a thrown error: internal reducer call, no UI. | Delete the evaluate; the following `localStorage` byte check already proves nothing was overwritten. | None |
| 3 | 38-41 | T6 | Whole test is `new SimulatorWriter()` in-page (`reset` then `write` refused). | Delete; covered by test 3 (reset then reopen Inbox shows no dialog and data is null). | Low |
| 4 | 26 | T8 | `waitForTimeout(1500)` to prove polling does not reopen. | `page.clock.install()` + `runFor` past the poll interval. | None |
| 5 | 19, 23 | P3 | Monkey-patches `Storage.prototype.removeItem/getItem` to simulate denial. Acceptable at the storage boundary, but restore via a harness helper (`harness.failStorage(key,'remove')`). | Move to shared helper. | None |
| 6 | 14 | B4 | Scroll-width check plus dark screenshot is layout, duplicated by `remaining-dialog-layout.spec.ts`. | Drop from here. | None |
| 7 | 4 | T7 | Inline `alpha.connection.selection.v1` seed and sessionStorage once-guard. | Harness fixture `devSimulator({apps:{…}})`. | None |

## Proposed end state
`journeys/dev-simulator.spec.ts` (chromium, test-mocks only, about 60 lines): one case "malformed Inbox data: recovery dialog, download equals raw bytes, healthy Contacts opens, survives reload"; one case "reset needs confirmation, refuses a concurrent replacement and a failed removal, then erases only Inbox"; one case "a second tab and a retired page cannot reset"; one case "dismissed recovery stays closed while polling" on the page clock. Drop Wallet, the two in-page module calls and the layout/screenshot duplication. Delete this file. Owner question (D19): is the Phone/Messages/Contacts/Inbox/Workflows simulator still wanted? If not, this whole journey goes with it.
