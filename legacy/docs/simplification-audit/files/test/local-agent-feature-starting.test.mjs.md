# test/local-agent-feature-starting.test.mjs
- Lines: 89 | Kind: transplant (slices `export class LocalAgentProtocol {` … `export const LOCAL_PROVIDER_MODEL=` out of `runtime/local-agent.ts`, strips types, builds it with `new Function` and 10 injected globals including a fake `Date`/`setTimeout`) | Verdict: REWRITE as cases in `test/integration/resident-runtime.test.ts` importing the real module
- Covers: the resident protocol retries a GET that answers `503 feature_starting` (canonical pending record only) with the same request identity under the original 120 s deadline; never retries mutations, unknown/failed/malformed records or non-feature routes; honours caller abort and session change; clamps `retryAfter`; the `AbortSignal.any` fallback releases listeners. Duplicates: none found (`grep feature_starting test specs scripts` hits only this file). Callers/importers: `npm test` glob; honours `ALPHA_FEATURE_STARTING_SOURCE` (env knob nothing sets).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12, 21 | T2 | Marker slice of a class body; any reorder of exports in `local-agent.ts` (D1 split) breaks it. | Import `LocalAgentProtocol` via `test/fixtures/browser-source.mjs` `loadBrowserModule` (already used for the same class by `local-agent-native-stream.test.mjs` and `local-agent-native-events.test.mjs`), injecting the bridge through the constructor and timers via `node:test` `mock.timers`. | Medium: the class reads `Date.now`/`setTimeout` as globals; `mock.timers` covers both. |
| 2 | 9 | T9 | `ALPHA_FEATURE_STARTING_SOURCE` env override nothing sets. | Drop. | Low |
| 3 | 16-35 | T8, C3 | Home-built virtual clock with a 512-turn microtask pump; another copy of the fake-clock helper. | Use `mock.timers`. | Low |
| 4 | 74-89 | T3 | WebView `AbortSignal.any` fallback listener cleanup (monkey-patches `addEventListener` on a real signal). | Keep one case only if the WebView floor still lacks `AbortSignal.any` (owner/PRD fact); otherwise drop. | Low |
| 5 | 39-72 | — | The six protocol cases are real product rules with no other coverage. | Carry all six (pending→ready, non-retryable failures, no mutation retry, abort, owner/session change, deadline, Retry-After clamp) as a table. | Medium |

## Proposed end state
File deleted. `test/integration/resident-runtime.test.ts` gains a "deferred feature registration" block over the real
`LocalAgentProtocol` with a fake bridge and `mock.timers`: the six cases above as data rows.
