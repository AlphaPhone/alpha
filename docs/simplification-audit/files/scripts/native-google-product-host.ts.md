# scripts/native-google-product-host.ts
- Lines: 26 | Kind: build input (product binding of the upstream native Google agent host, compiled into `google-host.mjs`) | Verdict: KEEP
- Covers: binds the shared upstream host to this product's production Cloud API origin, user agent, Gmail body cap, access file and Calendar timing flag. Duplicates: none. Callers/importers: `scripts/build-native-google-host.ts` (entry point), required input in `scripts/native-google-host-artifact.ts:76`; `test/support/managed-google-agent.mjs`, `test/fixtures/native-google-host-builder-port.mjs`, `test/one-runtime-profile.test.mjs`; Quint `specs/quint/refinement/services/native-google-access-file.mjs:16` (bundles it as entry), `manifest.json`; `scripts/quint-lib.ts:24`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 9 | D13 | Deep relative imports into `.eliza/client-features/...` and `../apps/app/src/...`. | Use the `@eliza/*` alias when it lands (stage F). | Low |
| 2 | 8-9 | D4 | Re-exports `readGoogleAgentAccessFile` and `nativeCloudRuntime` so the compiled host exposes them; needed by `native-cloud-runtime-config-check.ts` (`nativeCloudRuntime`). | Keep. | — |

## Proposed end state
Unchanged apart from the alias import. It is a product build input, not a script.
