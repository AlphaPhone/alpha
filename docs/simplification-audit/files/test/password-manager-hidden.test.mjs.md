# test/password-manager-hidden.test.mjs
- Lines: 85 | Kind: unit with stub bundle (esbuild bundle of `password-manager.ts` with nine ports replaced, including the upstream `plugin-native-passwords` client, bindings and transfer modules) | Verdict: MERGE into `journeys/settings.spec.ts` (Passwords section, see `password-manager.test.mjs.md`)
- Covers: a hidden Passwords page locks and reads nothing from the vault even when the lock call fails; returning to the foreground reads status again and does not list a locked vault. Duplicates: shares its whole port map and bundle code with `password-manager-fences.test.mjs` (lines 1-31 identical apart from a global name; research measured 49 % long-line overlap). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-29 | C5 / T3 | Verbatim twin of the fences harness; stubs upstream client/bindings code as well as product ports. | One harness (the browser `nativeVault` fixture). | Low |
| 2 | 17 | A3 / D3 | Stubs `transfer.ts` (password import/export), which D3 deletes; the stub becomes dead with that deletion. | Gone with the file. | None |
| 3 | 57-85 | - | The two behaviours (hidden page reads nothing even after a failed lock; shown page reads status again) are not in any Playwright spec. | Carry as case 7 of the Passwords journey section. | Medium (privacy) |

## Proposed end state
File deleted; its two cases live in the Passwords section of `journeys/settings.spec.ts`, driven by `document.visibilityState` emulation (`page.evaluate` dispatching `visibilitychange` is acceptable as an environment event) and asserted through the fixture's recorded `status`/`list`/`lock` calls.
