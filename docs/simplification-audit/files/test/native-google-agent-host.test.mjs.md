# test/native-google-agent-host.test.mjs
- Lines: 90 | Kind: integration (starts the shipped on-device Google host `scripts/native-google-product-host.ts`, which binds the upstream `.eliza/client-features/packages/app/src/runtime/managed-google-agent` host to Alpha's Cloud origin, User-Agent and Settings access file, on a real loopback HTTP port; Cloud is a scripted `request` function); self re-exec under `--import tsx` | Verdict: KEEP, MERGE into `test/integration/native-google-host.test.mjs`
- Covers: the native Gmail/Calendar host authenticates the renderer with the SDK token, refuses browser origins / wrong Cloud owner / retired bindings, prepares and dispatches one send exactly once, and publishes Calendar sources per verified connection without leaking secrets. Duplicates: test 3 = `test/native-google-fetch-input.test.mjs` test 4 (off-origin refusal through the same port); access-switch off/missing cases live in `test/native-google-agent-host-access.test.mjs`. Callers/importers: `npm test` glob; imports `test/support/managed-google-agent.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T9 | Re-spawns itself under `--import tsx` (60 s timeout) because the upstream module needs a TS transform; one extra Node process per run. | Let `scripts/run-node-tests.ts` register `tsx` once for the integration folder; drop the self re-exec. | Low |
| 2 | 9-10 | D4 | Two `await import` lines from the same support module. | One import. | None |
| 3 | 61-65 | T4 | "never a general proxy" uses the test-support copy of the Alpha port config (`createNativeGoogleCloudPort` in `test/support`), not the product entry; same case as fetch-input test 4. | Keep one copy, driven through `startNativeGoogleAgentHost` so the product config is what is tested. | Low |
| 4 | 68-73 | T5 | `startManagedGoogleAgentHost` is the support wrapper around the upstream broker; token validation and idempotent close are upstream behaviour. | Delete; upstream follow-up. | Low |
| 5 | 20-41 | C3 | Inline SHA-256 review digest and UUID constants also hand-written in `native-google-agent-host-access.test.mjs`. | Share one Cloud-route fake in the merged file. | None |

## Proposed end state
`test/integration/native-google-host.test.mjs` holds this file's tests 1, 2, 5 and 6, the access-switch cases from
`native-google-agent-host-access.test.mjs` and the exact-URL/header case from `native-google-fetch-input.test.mjs`,
all through `startNativeGoogleAgentHost` (the product entry) and one scripted Cloud `request` fake. No self re-exec.
Most assertions exercise the upstream host; they stay because this is the host the APK ships, but upstream should own
its own unit cases (list as D14 follow-up).
