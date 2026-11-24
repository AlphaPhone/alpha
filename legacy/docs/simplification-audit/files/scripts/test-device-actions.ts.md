# scripts/test-device-actions.ts
- Lines: 162 | Kind: integration (real `DeviceActions` from `apps/app/src/runtime/device-actions.ts` driven over a loopback HTTP server; the action journal is the in-memory `scripts/fixtures/device-action-journal.ts`) | Verdict: MOVE to `test/integration/device-actions.test.ts` (node:test), cleaned up
- Covers: the device-action proposal lifecycle (decision, claim, receipt, journal-before-effect, receipt recovery after restart, lost-claim reconciliation, stale-context refusal), per-proposal parsing with visible notices, foreground availability/notes-search/named-target admission, and foreign journal-reservation refusal. Duplicates: partly `specs/quint/native/DeviceActions.qnt` + `specs/quint/refinement/application/device-action-review.mjs` (review/journal states, formal), no other HTTP-level test. Callers/importers: only `test/adapter-contracts.test.mjs:7` (spawns it with `--import tsx`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T9 | Self-respawns under `--import=tsx` when not already loaded with tsx; the shim `adapter-contracts.test.mjs` spawns it again. Two process layers for one test. | Make it a `node:test` file under `test/` loaded by the normal test runner's tsx loader; delete the respawn and the shim row. | L |
| 2 | 40 | T1/B5 | `assert.deepEqual(FOREGROUND_OPERATION_TYPES, DEVICE_REVIEW_TYPES)` compares two constant lists (local vs upstream contract). Checks no behaviour. | Delete; if the two lists must match, import the upstream list in `device-actions.ts` instead of redeclaring it (C6). | L |
| 3 | 14 | D13 | Deep relative import into `../.eliza/client-features/packages/contracts/src/device-reviews.ts`. | Use the `@eliza/*` alias once it exists. | L |
| 4 | 17-37, 144 | T8/D8 | Module-level mutable `state/effects/mode/claims/attemptId` shared by the main block and `executionIdentityAndRetirement` (which resets them by hand at :144). Minified statement soup. | Split into named `test()` cases each owning its server state; one assertion per line. | L |
| 5 | 39-130 | — | `reviewNoticesAndForeground` uses its own in-process `request` (no HTTP), so it is a unit block inside an integration file. Its cases (invalid sibling isolation, notices never leak record ids, time-zone mismatch is a notice, forged widened availability window never reaches the agent) are the only coverage of these privacy rules. | Keep as separate `test()` cases in the same file. | — |
| 6 | 3-4 | C5 | `scripts/fixtures/loopback.ts` and `device-action-journal.ts` move with it to `test/fixtures/`. | Move fixtures. | L |

## Proposed end state
`test/integration/device-actions.test.ts`: ~8 `test()` cases (HTTP lifecycle + receipt outage + restart; lost claim + reconciliation; stale context + reject; pending-review notices; foreground availability receipt privacy; forged-window refusal; foreign reservation refusal; retirement before dispatch). No self-respawn, no constant-equality assert, fixtures in `test/fixtures/`. Remove the row from `test/adapter-contracts.test.mjs`. The success message at :161 (a 600-character narrative) goes; test names carry the meaning.
