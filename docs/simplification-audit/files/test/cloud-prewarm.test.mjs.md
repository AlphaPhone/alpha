# test/cloud-prewarm.test.mjs
- Lines: 76 | Kind: mixed: source transplant (cases 1-2 slice `warmInference(){...}` out of `connection-ui.tsx`), source-text (cases 3 and 5 regex `connection-ui.tsx`, `agent-adapter.ts`, `voice-adapter.ts`, `AlphaLocalAgentPlugin.java`), unit (case 4, real `localAgentPathAllowed`) | Verdict: DELETE (carry two behaviours)
- Covers: inference pre-warm: one `POST /api/cloud/warm` per minute, only for a verified resident session with Cloud inference, skipped during a turn; triggers on activation, visibility, chat open/first keystroke, Talk; dev bridge and Android resident gate admit exactly that route. Duplicates: none for the debounce; the dev-bridge allowlist is also covered by `test/development-conversation-stream.test.mjs` / `local-agent-voice-bridge.test.mjs` (same `localAgentPathAllowed`). Callers/importers: `npm test` glob; imports `test/support/strip-types.mjs`, `scripts/local-agent-dev-bridge.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 | Re-spawns itself under `--import tsx` (60 s timeout) when not already loaded with tsx: a second Node process per run. | Goes with the file. | None |
| 2 | 13-50 | T2 | `warmer()` slices `  warmInference(){` .. `  async readResidentDiagnostics(` and evals it with a fake context; tests the debounce through private globals (`lastInferenceWarm`, `INFERENCE_WARM_INTERVAL_MS`). | Delete. Carry the behaviour (one warm per minute; none while a turn is in flight, offline, plan notice, signed out) into `journeys/chat.spec.ts`: open chat twice, type, count `/api/cloud/warm` requests on the dev resident fake. | Low: no other test of the debounce until the journey exists. |
| 3 | 52-62 | T1 | Regexes over three product files for exact call sites and "no setInterval". | Delete. | None |
| 4 | 64-67 | T3 | Real `localAgentPathAllowed` allowlist: exact route, no prefix/suffix/query. | Fold the five rows into the existing dev-bridge test (`test/development-conversation-stream.test.mjs` or `test/tooling/local-agent-launcher.test.mjs`). | None |
| 5 | 69-76 | T1 / T2 | Extracts a regex literal from `AlphaLocalAgentPlugin.java` source and re-evaluates it in JS. | Delete; if the native gate needs a test it is a JVM unit inside the Android test source set or an instrumentation case. | Low |

## Proposed end state
Deleted. One journey step in `journeys/chat.spec.ts` asserts the warm request count; the dev-bridge allowlist rows move to the dev-bridge tooling test. Nothing reads product source text.
