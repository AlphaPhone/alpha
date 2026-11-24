# test/abort-signal-compat.test.mjs
- Lines: 38 | Kind: transplant (type-stripped copy of `apps/app/src/runtime/abort-signal.ts` and the generated `.eliza/.../plugin-maps/src/client/navigation-relay.ts` loaded as `data:` modules) | Verdict: DELETE
- Covers: `anyAbortSignal` fallback when `AbortSignal.any` is missing (Android WebView 113) and the Maps navigation relay working without it. Duplicates: none directly; the relay's open/poll/retire sequence is also exercised by `scripts/test-maps-device-navigation.ts` (child suite of `adapter-contracts.test.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 26-27 | T2 | Reads source text, strips types and imports a `data:` copy instead of importing the module; breaks on any import added to either file. | Delete. | Low |
| 2 | 13-15 | T3 | Monkey-patches `addEventListener` on real signals to count listeners: a unit test of a 20-line polyfill. | Delete. | Low |
| 3 | 25-38 | T5 | Second test exercises upstream plugin code (`.eliza/client-features/plugins/plugin-maps`) generated from `vendor/eliza`. | Delete; upstream owns it. | Low |

## Proposed end state
File deleted. The WebView-113 fallback is a real compatibility requirement; if it must stay covered, add one case to the
Maps journey (`journeys/maps.spec.ts`) run with `AbortSignal.any` deleted by an init script (`page.addInitScript`) and assert a
navigation hand-off still completes. Otherwise rely on the emulator image (API 29 WebView) runs.
