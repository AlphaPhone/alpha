# specs/quint/refinement/application/vault-coordinator.mjs
- Lines: 186 | Kind: Quint refinement harness — `sourceContext` transplant of `passwords/password-manager.ts` with an injected `observe` expression reading module-private variables; real esbuild bundles of vendor `plugin-native-passwords` client/bindings | Verdict: PORT
- Covers: `CredentialVault` (receipt id `CredentialVault-coordinator`) — password manager settings (`apps/app/src/passwords/password-manager.ts`, reached from `prototype/settings-adapter.ts`): typed secret cleared on leave/background, metadata reads retired by lock/expiry/leave, damaged-vault reset review retired by leave/refresh, late native authentication cannot reset. Duplicates: password manager Playwright spec(s) cover visible unlock/add; no other formal driver. Callers: `test/quint-vault-coordinator-refinement.test.mjs`, `index.mjs` aggregate; self-run CLI.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50-62 | T2 | Type-strips the product file, deletes imports by regex, and injects `observe: () => ({active,generation,locked:status?.locked…,draft…,busy,noticePresent:!!notice})`, i.e. reads private `let` variables by name. Renaming any of them breaks the harness. | Bundle `password-manager.ts` with esbuild stubs for `@capacitor/core`, `../platform-plugins`, `../build-flags`, `../browser/dev-profile`, `./dev-vault`; observe through `passwordManagerGroups()` rows (locked/unlock row, entries, Reset review row, busy/notice rows), the entry page's password field value, and port calls. | M |
| 2 | 58 | A3 / D3 | Stubs `createTransferClient` because the product still imports the vendor `transfer.ts` (password import/export). D3 deletes password transfer. | Remove the stub when transfer is deleted. | L |
| 3 | 12-20 | C3 | `sharedModule` is a third bundling loader (CJS + `new Function`). | Use the shared loader. | L |
| 4 | 169-172 | B5 | Writes `test-results/quint-refinement/vault-coordinator-source.json` (no reader) after asserting the secret is not in it. | Drop the file; keep the "typed bytes never serialized" assert on the receipt only if receipts stay. | L |
| 5 | 25-27 | B5 | Hashes `strip-types.mjs`, `support.mjs` and vendor sources as provenance. | Drop. | L |
| 6 | 183-186 | T9 | Self-run CLI branch. | Delete. | L |
| 7 | 77-133 | D8 | Two near-identical scenario loops with dense one-line statements. | One `scenario(name, steps)` table like the other harnesses. | L |

Product file read as text: `apps/app/src/passwords/password-manager.ts` (whole file via `sourceContext`; private names `active, generation, status, entries, damaged, confirmReset, draft, busy, notice`).

## Proposed end state
Real bundled module, observation through rendered rows and port calls, nine schedules in one table, no evidence file.
