# test/browser/confidentiality-claims.spec.ts
- Lines: 36 | Kind: Playwright rendered-copy check, chromium (dev server; the "production" label means `/` without `?mode=dev`, **not** the production bundle) | Verdict: **REWRITE** as (a) a forbidden-claims rule in `scripts/audit-production-bundle.ts` and (b) one text check inside the mock-state loop of `journeys/accessibility.spec.ts`
- Covers: no visible screen claims sealing, attestation, enclave locality or hardware keys that the build cannot prove (10 apps × 2 modes, 4-5 Settings tabs × 2 modes), and mock mode never shows sealing/attestation (51 `?mode=mock&start=` targets). Duplicates: `test/login-surfaces.test.mjs` / `test/support/login-surfaces.mjs` scan copy for some of the same words; `design.spec.ts` and `accessibility-sweep.spec.ts` already load the same mock targets. Callers/importers: none. About 78 tests.
- Runtime: ~78 full boots; the mock loop sleeps `waitForTimeout(500)` 51 times (~26 s of fixed sleeps).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-26 | T1-like / T4 | A copy rule checked by booting every screen. `scripts/audit-production-bundle.ts` has no rule for these phrases (grep for `enclave`, `attest`, `Sealed` found none), so this spec is the only guard. The shipped text lives in the bundle, so a string scan of the flag-off build is the cheaper and more complete check (it also covers screens this spec never opens). | Add the `forbidden` regex list to the production bundle audit; delete the 28 product-screen tests. | Medium: text assembled at runtime from fragments would escape a string scan. Keep one sweep-level innerText check (below) as the backstop. |
| 2 | 29-35 | T4 / T8 | Mock-mode loop reloads 51 states with a 500 ms sleep each; `design.spec.ts` loads the same states. | Add `expect(text).not.toMatch(mockForbidden)` to the one mock-state loop kept in `journeys/accessibility.spec.ts`; wait on `[data-screen]` instead of sleeping. | Low. |
| 3 | 4-12 | C6 | The `states` table and `shell` list are a third copy of the mock start targets (also `design.spec.ts:2-7`, `accessibility-states.ts`). | One exported target list in the harness. | none |
| 4 | 18 | — | Settings "Passwords" only in dev mode: dev password provider is a simulator (C21). | Drops with the rewrite. | none |

## Proposed end state
`audit-production-bundle.ts` fails the production build if any forbidden confidentiality phrase is present. The accessibility sweep's mock-state loop asserts the mock-mode subset on each state it already renders. This file is deleted.
