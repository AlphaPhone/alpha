# apps/app/src/product/native-cloud-runtime.ts
- Lines: 10 | Role: Alpha's Cloud deployment declaration for the native resident (`apiBaseUrl` + `productCharacter` name/bio), packaged into the native Google host module | Verdict: SIMPLIFY (merge the character definition with scripts/agent-identity.ts)
- Importers: 0 app files. scripts/native-google-product-host.ts:9 re-exports it (the build entry for the native host); test/cloud-deployment.test.mjs:174-178 loads it; test/product-character-host.test.mjs:18 vm-runs its text.
- Text/path pins: test/product-character-host.test.mjs:18-20 strips `^import .*;\n` and `^export ` and evaluates the remainder with only `product` and `productionCloud` in scope (T2) — any new import binding breaks it — and asserts the bio string is also present verbatim in scripts/agent-identity.ts; test/one-runtime-profile.test.mjs:71-73 asserts the text has no `serviceRouting|updateRoutingPreferences|ELIZA_RUNTIME_PROFILE` and that native-google-product-host.ts re-exports this exact path (T1); test/fixtures/product-character-host.mjs:28 writes a file at this path as a worker input; specs/quint/native/manifest.json:15, specs/quint/services/manifest.json:2353.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 vs scripts/agent-identity.ts:13 | C3, C6 | `productCharacter:{name:characterName,bio:[\`The assistant built into ${appName} for writing, research, decisions and practical follow-through.\`]}` is the same object as `AGENT_CHARACTER` in scripts/agent-identity.ts:13; the comment on line 9 says "Same product registration as scripts/agent-identity.ts" and test/product-character-host.test.mjs:20 keeps the two strings in sync by text search | Export `productCharacter` once (here, or in a new `product/product-character.ts`) and import it in scripts/agent-identity.ts; delete the text-sync assertion | Medium: product-character-host.test.mjs evaluates this file with a fixed scope, so importing a helper here needs that test rewritten as a real import (it should be, T2) |
| 2 | 8 | B3 | `if(!characterName.trim()\|\|!appName.trim())throw Error('Product character identity is required')` on literal strings from a `satisfies`-typed constant; scripts/agent-identity.ts:13 repeats the same check | Delete both checks; test/product-identity.test.mjs:70 (appName) and test/agent-identity.test.mjs:17 (characterName) already assert the values | Low |
| 3 | 10 | D8 | 260-character one-liner of nested `Object.freeze` | Format over several lines | None; keep `Object.isFrozen` semantics (asserted by tests) |
| 4 | 4-6, 9 | — | Comments explain ownership (routing upstream, credential native) — useful | keep | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `nativeCloudRuntime` | const | 10 | none | stays |
| `productCharacter` (inline) | const | 10 | `AGENT_CHARACTER` scripts/agent-identity.ts:13 | one exported `productCharacter` in product/ |
| identity non-empty check | helper | 8 | scripts/agent-identity.ts:13 | delete |

## Proposed end state
~8 formatted lines: import `productCharacter` (or define it here and let agent-identity import it), export the frozen `nativeCloudRuntime`. No re-validation.

## Verification
test/product-character-host.test.mjs (rewrite to import), test/cloud-deployment.test.mjs, test/one-runtime-profile.test.mjs, test/agent-identity.test.mjs; native Google host build (`agent:build-workflow-worker` / `scripts/native-google-product-host.ts`) in `npm run android:build:local`.
