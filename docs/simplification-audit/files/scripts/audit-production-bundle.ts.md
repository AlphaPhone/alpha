# scripts/audit-production-bundle.ts
- Lines: 180 | Kind: build-output audit CLI + library (required by AGENTS.md) | Verdict: KEEP + SIMPLIFY (prune denylist of deleted features)
- Covers: a flag-off web bundle contains no mock, fixture, developer, retired-feature or removed-speech-engine markers, no source maps, no hard-coded avatar initials, and a valid `assetlinks.json`. This is the target home for real release rules that T1 source-text tests currently assert (DECISIONS D10). Duplicates: `readBuildFlags` twin in `scripts/apk.ts:220`. Callers/importers: `package.json` `audit:bundle` (end of `verify`); workflows `android.yml`, `browser.yml`; `scripts/apk.ts:238-251` (spawns it per APK); `scripts/qualify-head.ts`; `playwright.config.ts`; tests `agent-always-local`, `avatar-initials-audit`, `demo-copy`, `font-license`, `llama-cpp-only`, `production-bundle-audit`, `release-signing`, `settings-truth` (T1 regex on this file at :22), `verify-apks`; Playwright `test/browser/production-surface.spec.ts`; `quint-lib.ts` list.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 70 | A7 | `'Update channel (development)'` - 0 hits in `apps/` or `android/` (`git grep -F`); the `updateChannelCheckEnabled` row was deleted (D8). `test/settings-truth.test.mjs:22` regex-asserts this literal is in the script (T1). | Delete the entry and the T1 assertion. | None. |
| 2 | 36-39 | A3 | `'Kitchen Speaker'`, `'4000 1234 5678 9017'`, `'Card scanned'`, `'Simulated payment'` guard Wallet/payment fixtures that D2 deletes (still 1-2 hits each today, stage A in progress). | Delete these entries in the same commit that deletes Wallet. A denylist entry for code that no longer exists protects nothing. | None. |
| 3 | 19-23, 55-67 | A3, D5 | Hosted/paired/pairing/cli-session entries (`RETIRED_PAIRING_TEXT`, `RETIRED_SIGN_IN_HAND_OFF_TEXT`, `/api/auth/pair`, `personalElizaId`, `dedicated-always`, ...). They are still meaningful while D5 keeps the dev/remote harness. | Keep while the dev harness exists; prune with stage A4/F as each string disappears from `apps/`. Unexport `RETIRED_PAIRING_TEXT` and `RETIRED_SIGN_IN_HAND_OFF_TEXT` (0 importers). | Low. |
| 4 | 14-74 | A8 | Decision IDs/dates/issue numbers in comments (`P-43`, `#381`, `#406`, "owner, 2026-10-13"). | Keep one line per group saying *what* it blocks. | None. |
| 5 | 77-85 | D10 | Engine tokens are spelled in pieces (`'on' + 'nx'`) only so `test/llama-cpp-only.test.mjs` (a repository-wide grep test, T1) does not match this file. | When that grep test is deleted, write the regex plainly. | None. |
| 6 | 111-119, 133-135 | B1 | `readBuildFlags` swallows JSON errors into `{valid:false}` then the caller turns that into an error - two layers for one failure. | Let `JSON.parse` throw inside `auditWebBundle` and report it as an error string. | None. |
| 7 | 171-172 | B1 | `catch { /* a bundle without readable notices ... */ }` around licence warnings. The comment documents a specified fallback - acceptable. | Keep, narrow to `ENOENT`. | None. |
| 8 | 158-178 | - | CLI loop is fine. `scripts/apk.ts` spawns this CLI per APK instead of importing `auditWebBundle`. | Make `apk.ts` import the function (see apk.ts report). | None. |

## Proposed end state
~150 lines: one `DENYLIST` with short group comments, entries only for strings that can still reach a bundle,
`engineFindings`, `avatarInitials`, `auditWebBundle`, CLI. Release rules removed from deleted T1 tests (for
example "no `Update channel` row", "no Wallet copy") land here only if the product code still exists to leak them.
Coverage stays with `test/production-bundle-audit.test.mjs` (fixture bundles; merge `avatar-initials-audit`,
`demo-copy` and the bundle part of `llama-cpp-only` into it) and the real `npm run audit:bundle` in `verify`.
