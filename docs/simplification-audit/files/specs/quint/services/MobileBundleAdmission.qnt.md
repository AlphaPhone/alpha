# specs/quint/services/MobileBundleAdmission.qnt
- Lines: 142 | Kind: Quint model, live (services manifest); models build tooling: `scripts/mobile-uuid-adapter.ts`, `core-state-patch.ts`, `build-mobile-agent.ts`, `mobile-bundle-smoke.ts` plus upstream `mobile-uuid-exports.ts`, `build-mobile-bundle.ts`, `plugin-lifecycle.ts`, `bun.lock`, `upstream.lock.json` | Verdict: KEEP (tooling lane), revisit if the build receipt is removed
- Covers: the on-device agent bundle is admitted only with a current exact producer receipt: reviewed inputs, existing bundle, exact UUID and core connector transforms; a changed bundle/producer/adapter needs a fresh receipt; malformed or tampered receipts are refused (6 runs, 4 invariants). Duplicates: none. Callers/importers: manifest; `refinement/services/mobile-bundle-admission.mjs` (imports the real `mobileBuildReceipt`/`verifyMobileBuildReceipt`, `coreStateBuildPlugin`, `parseBuildPolicy` and `test/fixtures/mobile-uuid-build.mjs`); `test/quint-mobile-bundle-admission.test.mjs`; aggregate `services/index.mjs`. The receipt `alpha-mobile-build.json` is read by `stage-local-agent-runtime.ts`, `android-build-preflight.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | B5 / §2.11 | A formal model of a build receipt: the thing modelled is itself evidence ceremony. The scripts' reports keep the receipt (`mobile-uuid-adapter.ts` SIMPLIFY-keep) because staging gates on it, so the model stays live. | Keep while the receipt gates staging; delete model + harness + fixture together if the receipt is replaced by a plain rebuild check. Owner question. | Low |
| 2 | manifest `sources` | P1 | Its sources are `scripts/**`, which is one reason a scripts change triggers formal CI. | Path filter to exactly these four scripts, `scripts/build-policy-source.ts`, the upstream files and `upstream.lock.json`. | None |
| 3 | harness | — | Harness mutates copies of real files in a temp dir (not product source) and calls the real functions. Fine. | None. | — |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged, run only in an "android/mobile build tooling" lane; tied to the receipt's existence.
