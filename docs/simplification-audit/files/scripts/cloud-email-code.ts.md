# scripts/cloud-email-code.ts
- Lines: 33 | Kind: script (dev-server module: wire contract for Cloud email-code sign-in) | Verdict: KEEP (move with `browser-cloud-dev-bridge.ts` into the dev-server folder)
- Covers: request bodies (PKCE S256) and expiry / resend-time clamping for the development browser bridge's email sign-in, matching native `CloudEmailCode.java`. Callers: `scripts/browser-cloud-dev-bridge.ts:5` (only production caller); tests `cloud-email-resend`, `cloud-sign-in-flow`, `cloud-email-deployment`; `scripts/quint-lib.ts` runtime paths; `specs/quint/application/manifest.json` source pin.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24,29 | C3 | Same "number or Date.parse string" timestamp parse written twice. | One `parseTime(value)` helper. | Low |
| 2 | 17,20 | C3 | `(environment==='production'?productionCloud:stagingCloud).tenant` twice. | `const cloud = {production: productionCloud, staging: stagingCloud}`. | Low |
| 3 | path | D11 | Dev-server middleware module sits among build/release scripts. | Move to `scripts/dev-server/` with the bridge (research `scripts.md` proposal); update `quint-lib.ts` and the Quint manifest path pin. | Low |

## Proposed end state
Same four exports, ~25 lines, located beside the browser Cloud dev bridge.
