# specs/quint/refinement/application/maps-event-return.mjs
- Lines: 237 | Kind: Quint refinement harness (source campaign on a transplanted adapter, `MapsEventReturn`, live) | Verdict: PORT
- Covers: Maps "Back to event" — only the current visible attempt owns a Calendar return; leave/hide/pagehide/dispose retire it; the exact canonical (v2) or native Android Calendar (v1) origin is read and opened once; confirmed-missing/ambiguous withdraw the origin (`prototype/maps-adapter.ts`, `runtime/maps-event-return.ts`). The v1 "native" origin is the Android Calendar provider path kept by D18, not a D1 legacy reader. Duplicates: `test/canonical-maps-return.test.mjs` was deleted in this branch; Playwright maps specs cover leave/reenter. Callers/importers: `test/quint-maps-event-return.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 21-28 | T2/T10 | Injects `globalThis.inspectEventReturn` at `'  let returningToEvent: {raw: unknown; abort: AbortController} | undefined;'`, concatenates stripped helper + adapter with imports regex-removed, runs in `vm`. | Move the return-attempt state (`returningToEvent`, tap handler, settlement) from the adapter into `runtime/maps-event-return.ts` as an exported controller and import it with `sourceModule` (the harness already imports `cloud-provider.ts` and `maps-notification-open.ts` that way). | M |
| 2 | 65-78 | C5 | ~20-global vm context duplicated from `map-plane-ownership.mjs`. | Shared fixture until ported. | L |
| 3 | 217-218 | — | Uses real `cloud-provider.ts` and `maps-notification-open.ts` via `sourceModule` — correct pattern. | Keep. | — |
| 4 | test wrapper | B5 | `traces === 18`, `checkpoints === 129`. | Drop. | L |

## Proposed end state
Imports an exported event-return controller; 18 schedules unchanged; no adapter text.
