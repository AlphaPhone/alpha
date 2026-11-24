# scripts/native-cloud-runtime-config-check.ts
- Lines: 46 | Kind: integration test living in scripts/ (runs the compiled native Google host + real `@elizaos/core` AgentRuntime + upstream router) | Verdict: MOVE to `test/` (merge with its 12-line wrapper)
- Covers: with the compiled `google-host.mjs` and a cloud runtime profile, startup rewrites stale local routing to `elizacloud` for TEXT_SMALL/TEXT_LARGE, keeps speech local and the local embedding preference, sets only the read/operation Gmail + Calendar read brokers (no send broker), never persists the API key, issues no provider traffic, and the default native profile switches embeddings back to local inference. Duplicates: none found (the only test that starts the compiled host with real routing). Callers/importers: only `scripts/test-native-cloud-runtime-config.ts` (spawns it under Bun after verifying the SDK and host artifact), which `.github/workflows/resident-android.yml:312` runs as phase `native-cloud-routing`. No npm script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A test split across a wrapper script (`test-native-cloud-runtime-config.ts`: verify source, verify artifact, check Bun 1.4.2, spawn) and this checker. The test file is not the test. | Merge both into `test/native-cloud-routing.integration.ts` (Bun, `--conditions=eliza-source`), keep the workflow step calling it by its new path. | Low |
| 2 | 20, 29-30, 41 | D13 | Imports upstream modules by path into the prepared SDK (`packages/app/src/runtime/native-managed-google-host.ts`, `plugins/plugin-local-inference/src/services/router-handler.ts`, `native-runtime-profile.ts`). These are real imports (good) but break on an upstream file move. | Keep; once the `@eliza/*` alias lands, import through it. | Low |
| 3 | 12, 25, 28 | D8 | 600-character `Object.assign(process.env,{…})` line and chained asserts on one line. | Format; one assert per line. | None |
| 4 | 17-18 | — | Replaces `globalThis.fetch` to forbid provider traffic: correct and restored in `finally`. | Keep. | — |
| 5 | 45 | B5 | Prints a JSON "evidence" object of constants (`nativeAdmissionStartup:true`, …) that nothing reads. | Drop; the exit code is the result. | None |

## Proposed end state
One file `test/native-cloud-routing.integration.ts` that verifies the pinned SDK and the host artifact (via `verifyNativeGoogleHostArtifact`), then runs the same assertions; `resident-android.yml` calls it directly. `scripts/test-native-cloud-runtime-config.ts` and this file are removed. The behaviour (cloud text routing, local embeddings, no send broker, no credential persistence) keeps its only coverage.
