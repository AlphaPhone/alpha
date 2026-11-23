# test/owner-route-native-import.test.mjs
- Lines: 9 | Kind: integration-ish loader check (spawns `node --input-type=module --eval` that imports `apps/app/src/runtime/owner-route-policy.ts` natively and asserts six route verdicts) | Verdict: DELETE
- Covers: `owner-route-policy.ts` loads under Node's native TypeScript loader and answers a few owner-route questions. Duplicates: `test/owner-route-parity.test.mjs` imports the same module family natively (`../apps/app/src/product/owner-route-table.ts`) and checks every one of these six verdicts in its case table; `vite.config.ts:11` imports `scripts/local-agent-dev-bridge.ts`, which imports the policy, so every Vite build/dev start also loads it. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | A8 | Comment's premise is stale: it says Vite's *native* config loader imports the policy and that JSON import attributes are at stake. No `configLoader: 'native'` is set anywhere (grep of package.json, scripts, Playwright config), and `owner-route-table.ts` has no imports at all (no JSON). | Gone with the file. | None |
| 2 | 6 | T4 | The six asserted verdicts are a subset of `owner-route-parity.test.mjs`'s table. | Delete. | None |
| 3 | 7 | T9 | Spawns a second Node process to do what a top-level `import` in any test already does. | Delete. | None |

## Proposed end state
File deleted. Native-loader importability of runtime modules is exercised by every host test that imports `.ts` directly (the host runner relies on type stripping) and by `vite build`.
