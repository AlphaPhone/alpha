# specs/quint/refinement/application/hosted-background-admission.mjs
- Lines: 192 | Kind: Quint refinement harness (source campaign, `HostedBackgroundAdmission`, live) | Verdict: PORT
- Covers: renderer setup/pause of native hosted-result background work: one reservation per attempt, abort forwarded only while registered, pause retires exactly the requested session, cancel refusals surface, browser makes no native call (`apps/app/src/runtime/hosted-background.ts`). Live digest feature, not the D5 hosted-agent path. Duplicates: none. Callers/importers: `test/quint-hosted-background-admission.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-66 | T2 | `sourceContext()` strips types, regex-deletes every `import` (including the real `parseDigestResult` from `./hosted-digests`) and runs the file in `vm` with `registerPlugin`, `isAndroid`, `AbortController`, `crypto` as fake globals. A code path that starts using `parseDigestResult` would hit `undefined`. | `bundledSource('apps/app/src/runtime/hosted-background.ts')` with esbuild port stubs for `../platform-plugins` and `../native`; swap `globalThis.AbortController`/`crypto.randomUUID` for the scenario. | L |
| 2 | 20-26 | — | `ObservedController` subclass captures the private signal — legitimate observation via a global, survives the port. | Keep. | — |
| 3 | 98 | — | `attemptId: 'discarded-fixture-value'` checks that the wrapper overwrites caller-supplied IDs. Good. | Keep. | — |
| 4 | test wrapper | B5 | Wrapper asserts the exact `observedFields` list and action names. | Drop; `checkTraces` already fails on mismatch. | L |

## Proposed end state
Imports the bundled module; `sourceContext` loses one more caller (it should go once all callers port). Nine schedules unchanged.
