# test/browser/simulator-save.spec.ts
- Lines: 15 | Kind: Playwright chromium, 2 tests; test 1 dev-surface UI (Contacts simulator save failure), test 2 module-in-page (`Component.prototype.vset`) | Verdict: MERGE test 1 into `journeys/dev-simulator.spec.ts`; DELETE test 2
- Covers: a storage-full save keeps the Contacts draft and retries once successfully; transient simulator view updates write no storage. Duplicates: none for test 1; test 2 overlaps `simulator-recovery.spec.ts` test 3 (reset preserves unrelated apps). Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-15 | T6 / A3 | Test 2 calls `Component.prototype.vset` on a fake owner for six apps including `wallet` (deleted, D2). No UI. | Delete. | Low |
| 2 | 8 | T6 | `expect(failures).toContain('Development app save failed.')` asserts an uncaught page error as the contract. A thrown `pageerror` on a handled failure is itself a smell (B1 inverse). | Assert only the visible notice and retained draft. | Low |
| 3 | 4 | P3 | `Storage.prototype.setItem` patched to throw for one key and toggled via `window.allowSimulatorSave`. | Shared harness helper `failStorageWrites(key)` / `release()`. | None |

## Proposed end state
One step in `journeys/dev-simulator.spec.ts`: "Contacts save failure keeps the draft, retry saves exactly one row, row survives reload". About 10 lines with the shared storage-failure helper. Delete this file.
