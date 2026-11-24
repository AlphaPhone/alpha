# scripts/cloud-deployment.ts
- Lines: 104 | Kind: script (code generator + `--check` gate in `npm run verify`, Vite config and `android/consumer-host.json`) | Verdict: KEEP + SIMPLIFY
- Covers: generates the Cloud deployment constants for Java/TS/Gradle and fails verify when outputs are stale, when the credential storage namespace fingerprint would change (every installed phone would lose its Cloud credential), or when SDK bases disagree. Callers: `package.json` `verify` (first step), `vite.config.ts:1` (`checkCloudDeployment`), `android/consumer-host.json:102`, `scripts/cloud-readiness.ts`; tests `android-host`, `cloud-deployment`, `cloud-email-deployment`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 96 | A8 / A1 | Error tells the operator to "add a tested migration (LegacyCloudRecovery)"; `LegacyCloudRecovery` is deleted (D1/D17; no such class under `android/app/src` now) and the PRD plans no migration. | Reword: "would change the credential namespace; installed phones would lose their Cloud credential. Choose values that keep the namespace, or accept sign-out and append the new namespace." | Low |
| 2 | 14-15 | A1 | `STORAGE_NAMESPACES` "oldest first" array has one entry; only `.at(-1)` is read. | Replace with `const STORAGE_NAMESPACE = '…'`. | Low |
| 3 | 17-43 | B3 | ~25 lines validating a frozen constant committed two files away (key sets, URL canonical form, hostname regex, tenant regex). The check runs at build time so it is a trust boundary for edits, but `cloudSdkBases` re-checks the same origins. | Keep the HTTPS/canonical-origin and distinct-API checks (they mirror the native class initialiser); drop the key-set string-join checks (TypeScript already types `CLOUD_DEPLOYMENT`). | Low |
| 4 | 54-55 | B4 | `nativeAuthCallbackRegistration` re-runs `validateCloudDeployment` and then guards `if(!row)` for a typed `CloudEnvironment`. | Index directly. | Low |
| 5 | 13 | C3 | Reads `app.config.json` with `fs` + `JSON.parse` while `cloud-email-code.ts` uses `import … with {type:'json'}`. | Use the JSON import. | Low |
| 6 | 74-75 | D8 | 200+-char generator lines. | Split when formatting (D9). | — |
| 7 | 90 | D7 | `config`, `sdkBases`, `namespaces` options exist only for tests. | Keep only if the retained integration test needs them. | Low |

## Proposed end state
~70 lines: generator, `--check` (stale outputs, namespace fingerprint, SDK bases), `--pages-registration`. Single namespace constant; no legacy-migration wording; validation limited to what the native client would refuse.
