# specs/quint/refinement/native/local-agent.mjs
- Lines: 113 | Kind: Quint refinement driver that **bundles and imports the real** `apps/app/src/runtime/local-agent.ts` with esbuild (only `@capacitor/core` replaced; virtual time) | Verdict: KEEP (add per-model test; build once)
- Covers: renderer side of the resident runtime: `stopLocalAgent` resolves only after native status confirms service and socket are down (confirmed / incomplete-timeout / stop-rejected), and `LocalAgentProtocol.connect` cancellation calls `cancelStart` once and publishes no session (owned and attached starts); model `ResidentRuntime` (native manifest, live). Duplicates: `credential-coordinator.mjs` covers the native `AlphaLocalAgentPlugin` side of the same model; host local-agent tests (see their reports) may overlap the stop polling. Callers/importers: only native aggregate `index.mjs:11,172` (the `prepare-local-agent.mjs` grep hits are a different file) — **no per-model test**.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / P | Only runner is the aggregate. | Add `test/quint-resident-runtime-renderer.test.mjs` (or fold into a `ResidentRuntime` test together with `CredentialResidentTraces`). | High if aggregate goes first |
| 2 | 25-29 | cost | `build(options)` runs twice with identical options (once for `metafile`, once for output); the first result already has `outputFiles` because `write:false`. | Use one build. | None |
| 3 | 15-16 | D7 follow-up | `define` of `import.meta.env` and globals `performance`/`setTimeout` replaced via `define` — relies on local-agent.ts reading `performance.now()` and `setTimeout` as free identifiers. Acceptable port seam. | Keep; if the product module takes a clock/timer parameter later, use it instead. | Low |
| 4 | 95 | T8 | `for 30× await Promise.resolve()` microtask spin to let `connect` reach its first await. | Wait on the bridge `start`/`request` call being made (deferred) instead of a fixed spin. | Low |
| 5 | 26-28 | B5 | Hashes every esbuild input for the receipt. | With receipt decision. | None |
| 6 | — | — | Good model of the owner's target style: imports the real module, stubs only the native boundary. | Pattern to copy for the T10 ports. | — |

## Proposed end state
Single esbuild pass, deferred-based waits, its own test file; otherwise unchanged.
