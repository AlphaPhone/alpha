# apps/app/src/runtime/mock-admission.ts
- Lines: 13 | Role: test-mocks only — before mock mode opens on Android, pauses native notification collection and hosted background delivery, failing if either cannot be paused. | Verdict: MOVE to the dev module folder (`apps/app/src/dev/` or `browser/`)
- Importers: 2 (`main.tsx`, `runtime/connection-ui.tsx`), both dynamic imports behind `testMocksEnabled`. Text/path pins: `vite.config.ts:31-32` (`'./runtime/mock-admission': 'export {};'` and `'./mock-admission': 'export {};'` stubs for flag-off builds), `specs/quint/application/manifest.json:480`, `test/support/feature-parity.mjs:558`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-13 | D6 / D5 | Dev/mock module in `runtime/`, kept out of production by a Vite stub *and* constant folding (two of the "four stacked mechanisms", PATTERNS D5). | Move into the single `dev/` boundary (DECISIONS D6) so one dynamic import of `dev/index.ts` covers it; delete both `vite.config.ts` stub entries for it. | Low; `scripts/audit-production-bundle.ts` must still pass. |
| 2 | 9 | C2 | `registerPlugin<{pauseNotificationCollection():Promise<void>}>('AlphaConnection')` inline typing. | Import from the shared `AlphaConnection` plugin module (native-connection.ts owns it). | None. |
| 3 | 9-10 | — | `Promise.resolve().then(()=>…)` converts synchronous throws into rejections for `allSettled`; fine. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| AlphaConnection slice | type (inline) | 9 | `native-connection.ts` AlphaConnection typing | shared plugin module |

## Proposed end state
Same 13 lines at `dev/mock-admission.ts`; `vite.config.ts` stub entries removed; Quint manifest/feature-parity paths updated.

## Verification
Mock-mode Playwright journeys (test-mocks build), `scripts/audit-production-bundle.ts`, Quint application manifest path.
