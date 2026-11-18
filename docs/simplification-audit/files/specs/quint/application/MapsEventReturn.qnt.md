# specs/quint/application/MapsEventReturn.qnt
- Lines: 124 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (marker + transplant)
- Covers: Maps→Calendar event return: only the current visible attempt owns the return, opens the exact event once, unwinds once; hide/pagehide/leave retire attempts (`prototype/maps-adapter.ts`, `runtime/maps-event-return.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `maps-event-return.mjs` (+ `.md`) via `test/quint-maps-event-return.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 12-26 | T2/T10 | Injects at `  let returningToEvent: {raw: unknown; abort: AbortController} | undefined;`, strips adapter + helper, regex-removes imports and concatenates. | Move the remaining return state from maps-adapter into `maps-event-return.ts` and import it with `sourceModule` (it already imports `cloud-provider.ts`/`maps-notification-open.ts` that way). | M |
| 2 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports `maps-event-return.ts`; no adapter text.
