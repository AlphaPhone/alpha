# specs/quint/services/NativeGoogleAccessFile.qnt
- Lines: 139 | Kind: Quint model (services family, live; 6 tests) | Verdict: KEEP
- Covers: the canonical Google access record (`GoogleAgentAccessFile.java`) that gates Gmail changes / Calendar edits for the native Google host: unavailable, invalid, linked or directory records deny both switches; an open reader keeps its snapshot; admission samples once before verification; lookups never need write access. Sources exist: `GoogleAgentAccessFile.java`, `AlphaLocalAgentPlugin.java`, `scripts/native-google-product-host.ts`, upstream `native-google-agent-host.ts`. Duplicates: none found. Callers/importers: manifest; harness `refinement/services/native-google-access-file.mjs` (bundles `scripts/native-google-product-host.ts` with esbuild and runs it; compiles `NativeGoogleAccessFileTraces.java` against the real Java writer; reads the bridge Java file only as an input hash, no slicing); wrapper `test/quint-native-google-access-file.test.mjs` + services aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Wrapper test and aggregate both run the JVM + esbuild campaign. | One runner. | Low |
| 2 | 100-106 | — | `safety` also carries bound checks (`writes`, `refusals`, `hostGeneration`) that are really `TypeOK`. | Optional: name them `TypeOK`, no behaviour change. | None |

## Proposed end state
Model unchanged. Production-reachable (resident Google access is product), harness already imports real code; runs once.
