# specs/quint/services/IdentitySession.qnt
- Lines: 305 | Kind: Quint model, live (services manifest; `sharedSources` 10 upstream `packages/auth/android/.../cloud/*.java`); imported by `native/ControllerComposition.qnt` and `native/ApplicationComposition.qnt` | Verdict: KEEP
- Covers: native Eliza Cloud sign-in (AP-03): single-use Google return burn, durable receipt before key, key before acknowledgement, bounded code/MFA attempts, serialized activation worker, cold returns cannot mint credential intent, restart recovery (22 runs, 13 invariants). Duplicates: historical `specs/quint/legacy/**` SignIn comparison (retired with P6). Callers/importers: manifest; compositions above; `refinement/services/sign-in-coordinator.mjs` (javac-compiles the patched upstream `CloudSignInPlugin` family plus `AlphaCloudSignInPlugin.java`, `CloudDeployment.java`, `PluginWorkers.java` against `SignInTestPorts.java`; Java trace campaign — compiles whole files, no slicing); `policies.mjs`; `test/quint-signin-refinement.test.mjs`; aggregate `services/index.mjs` and `test/quint-services-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | — | Lists `cloud-sign-in.ts`, `cloud-sign-in-ui.tsx`, `connection-ui.tsx`, but the refinement only runs Java; renderer files are listed so a change re-runs the model. `connection-ui.tsx` is the 4.2k-line god module (D1), so every edit to it re-runs this 22-scenario Java campaign. | After the `connection-ui` split, list only the sign-in sub-module. | Low |
| 2 | 130 | — | `ack(success)` is a one-line alias of `ackWithReceipt(success,false)`; used by many runs. | Keep (readability). | — |
| 3 | harness | T4, B5 | 21 scenarios run in the wrapper test and again in the aggregate; receipts hash inputs. | One runner. | None |

## Proposed end state
Model unchanged (product-critical, composed twice). Harness already compiles whole Java files; drop the duplicate run and input-hash receipts; path-filter to the sign-in Java/TS files, `android/upstream-native-sources.json`, model + harness.
