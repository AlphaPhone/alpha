# scripts/cloud-resident-host.ts
- Lines: 203 | Kind: script (dev-server host: launches the loopback Cloud-bound resident agent for `npm run dev:cloud`) | Verdict: KEEP + SIMPLIFY (move to dev-server folder)
- Covers: owns a private profile, vault passphrase and provider-key session, binds/clears a Cloud credential, switches Cloud vs own (Cerebras/Cartesia) keys, restarts the resident and reports status to the browser bridge. Callers: `scripts/browser-cloud-dev-bridge.ts:3,511` (only production caller, active when `dev:cloud` sets `VITE_ALPHA_CLOUD_RESIDENT`); renderer reaches it via `apps/app/src/runtime/browser-cloud-resident.ts` (`residentOwn`, `residentCloud`, …). Tests: `cloud-deployment`, `cloud-resident-embedding-route`, `cloud-resident-full-profile`, `core-state-patch`, `fixtures/product-character-host.mjs`. Pinned in `specs/quint/application/manifest.json` (`createCloudResidentHost`) and `specs/quint/refinement/application/boundaries.mjs`.
- Not D5: this is the development Cloud resident, not hosted-agent pairing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 122,124 | D8 | Two single statements of ~1,000 characters building environment maps. | Split into `cloudSettings(credential)`, `directSettings(direct, credential)` objects. | Low |
| 2 | 68,124,130,150,163 | C6 | `'qwen-3.8-27b'` literal 8× next to `CLOUD_MODEL='cerebras/qwen-3.8-27b'`. | `const DIRECT_MODEL='qwen-3.8-27b'`. | Low |
| 3 | 161,175,198 | C3 | Key regex `/^[!-~]{8,1024}$/` and "Enter a valid … key" checks written three times. | One `validKey()` helper. | Low |
| 4 | 194-200 | A8 / D10 | `selectOwn` is labelled "Compatibility for existing owner setup callers", but `residentOwn` from `local-agent.ts:554` is the live path. It duplicates `editProviderKeys` + `selectProvider`. | Implement `selectOwn` as edit-then-select via `applyProvider`, drop the compatibility comment. | Med |
| 5 | 84,95 | B2 | `process.getuid?.()` on a Linux/macOS-only dev host. | Call `process.getuid()`. | Low |
| 6 | 93-95, also dev-cartesia, dev-speech-settings | C3 | Third copy of "open O_NOFOLLOW, fstat owner-only regular file, bounded read". | `scripts/lib/private-file.ts` `readPrivateFile(path,{maxBytes})`. | Low |
| 7 | 137 | B3 | Validates port/close of a `GoogleHost` returned by our own injected `startGoogleHost`. | Delete. | Low |
| 8 | 56-66, 96 | C1 | Re-declares the upstream provider-key session interface and casts the `.mjs` import. | Import the type from upstream if it ships one; else keep the local interface (vendor is read-only). | Low |
| 9 | 120 | B3 | Re-validates `credential.token` type after the bridge already parsed the request. | Validate once in the bridge (the trust boundary). | Low |

## Proposed end state
Same `CloudResidentHost` interface in `scripts/dev-server/`, environment built by two named helpers, one key validator, shared private-file reader, `selectOwn` expressed via the generic provider operation. Est. −40 lines and readable. Quint manifest symbol pin updated with the move.
