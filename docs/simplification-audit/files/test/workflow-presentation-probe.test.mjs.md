# test/workflow-presentation-probe.test.mjs
- Lines: 41 | Kind: unit (esbuild-bundles `runtime/workflow-presentation.ts` with `@capacitor/core` replaced by a stub that routes to `globalThis.bridge`, re-imports fresh copies via `data:` URLs) | Verdict: DELETE
- Covers: the presentation-capability probe treats a stalled bridge as retryable, a missing method as protocol 1 (asked again later), and caches a protocol 2 answer per process. Duplicates: none directly; `workflow-device-bindings-fixture.test.mjs` exercises the mapping on top. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T3 | Capacitor stub bundled in; one module copy per test through a comment-busted `data:` URL. | Delete. | None |
| 2 | 19-26 | B2 | Covers "a bridge without the method is protocol 1": phantom capability detection for `workflowPresentationCapabilities`, a native method shipped in the same APK. | Product follow-up: remove the UNIMPLEMENTED branch and the per-process cache once the method is required; the test goes with it. | Low |
| 3 | 13-18, 35-41 | owner | Stall-then-retry timing is the remaining real behaviour. | If the probe survives, cover "bridge never answers → protocol 1 for this call" as one case in `test/integration/workflows-protocol.test.mjs`. | Low |

## Proposed end state
File deleted with the B2 simplification of `workflow-presentation.ts`. If the stall timeout stays, one case moves to the protocol integration file using an injected bridge rather than a bundler stub.
