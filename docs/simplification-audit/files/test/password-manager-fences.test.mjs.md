# test/password-manager-fences.test.mjs
- Lines: 183 | Kind: unit with stub bundle (twin harness of `password-manager-hidden.test.mjs`) | Verdict: MERGE into `journeys/settings.spec.ts` (Passwords section, see `password-manager.test.mjs.md`)
- Covers: Lock and unlock expiry retire a listing still being read; an unlock or delete that completes after leaving reads nothing and does not navigate; the delete-everything confirmation does not survive a refresh, a failed unlock, leaving or hiding; a confirmed reset in the foreground resets once. Duplicates: `password-manager.test.mjs:103-148,162-169` (same fences), `test/browser/password-manager.spec.ts:163,176`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-31 | C5 / T3 | Copy of the `-hidden` port map and bundler. | One harness. | Low |
| 2 | 62-91 | T4 | Lock fence and expiry fence duplicate `password-manager.test.mjs:103-121` and `password-manager.spec.ts:163`. | Keep once (journey case 4). | None |
| 3 | 93-127 | T4 | After-leave unlock/delete duplicate `password-manager.test.mjs:123-132`. | Keep once (journey case 5). | None |
| 4 | 132-183 | - | Reset confirmation lifecycle across refresh / failed unlock / leave / hide / foreground confirm: partly in `password-manager.spec.ts:176`; the hide and foreground-once cases are unique. | Journey case 6. | Medium |

## Proposed end state
File deleted; cases folded into the Passwords journey section as listed in `password-manager.test.mjs.md` (cases 4-6).
