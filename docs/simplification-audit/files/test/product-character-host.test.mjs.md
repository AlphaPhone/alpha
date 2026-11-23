# test/product-character-host.test.mjs
- Lines: 49 | Kind: source-text + transplant (vm-evals `native-cloud-runtime.ts`; includes-check on `scripts/agent-identity.ts`; slices `AlphaLocalAgentPlugin.java` and vendor `NativeProviderSlot.java`) + tooling integration (`productCharacterHostFixture`, which itself vm-transplants `scripts/cloud-resident-host.ts`) | Verdict: MERGE tests 2-3 into `test/tooling/cloud-resident-host.test.mjs` (direct import); DELETE tests 1 and 4
- Covers: the dev Cloud resident host launches the agent with only the verified packaged worker/google-host module paths and never a provider key, character JSON or binding; invalid worker artifacts refuse before profile creation. Duplicates: `test/cloud-resident-host.test.mjs`, `test/agent-identity.test.mjs` (character bio). Callers/importers: `npm test` glob; imports `test/fixtures/product-character-host.mjs` (also imported by 5 other tests and `specs/quint/refinement/application/boundaries.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-15 | A7 | Imports `verifySource`, `preparedSourceEnv`, `workerArtifactDirectory`, `digest`, `verifyWorkerArtifact`, `preparePrivateRuntimeProfile`, `runtimeEnvironment`, `CLOUD_SDK_BASES`, `hash`, `randomUUID`, `randomBytes`, `execFileSync`, `os`, `createHash` (only for the unused `hash`): none used in this file. | Drop. | Low |
| 2 | 17-21 | T2/T1 | vm-evals `native-cloud-runtime.ts` and `includes()`-checks a template string in `agent-identity.ts`. | Delete; `agent-identity.test.mjs` owns the bio. | Low |
| 3 | 22-31 | keep | Real launch environment through the fixture (bound/unbound/cleared) and five invalid-artifact refusals. | Keep in `test/tooling/cloud-resident-host.test.mjs` once the fixture imports `cloud-resident-host.ts` instead of vm-transplanting it. | Low |
| 4 | 32-49 | T1 | Index-order regexes on `AlphaLocalAgentPlugin.java` (`configureEnvironment`, `applyUnboundEnvironment`) and on vendor `NativeProviderSlot.java`. Pins statement order of a 1,369-line file. | Delete. If the native "module path survives provider stripping" rule matters, it is a Gradle JVM test of an extracted environment builder. | Medium |

## Proposed end state
Two cases (launch env per credential state; invalid artifact refuses before launch) in
`test/tooling/cloud-resident-host.test.mjs`, importing the host function directly. The rest is deleted.
