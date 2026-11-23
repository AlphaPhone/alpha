# specs/quint/refinement/native/maps-location.mjs
- Lines: 170 | Kind: Quint ITF replay driver that **bundles and imports the real** `apps/app/src/maps/native-location.ts` (esbuild; stubs `../platform-plugins` and `@capacitor/core`), drives it with controllable bridge promises | Verdict: KEEP
- Covers: Maps location owner: permission check/request, listener and watch registration, hide/show (front wait), stop and cleanup confirmation/failure, fixes/errors routed to the right session, refusal while settling; model `NativeMapsLocation` (native manifest, live). Duplicates: run by `test/quint-native-maps-location.test.mjs` and again via `forward-replays.mjs` in the native aggregate (T4). Callers/importers: those two.

## How it is tied to product code
Import-style (good): only the module specifiers `'../platform-plugins'` and `'@capacitor/core'` are pinned (stub keys at 31-34); if
`native-location.ts` changes its import path for `registerPlugin`, the stub stops applying and the bundle pulls the real
plugin module (fails loudly). Observes public/instance fields `admitting`, `generation`, `session`, `requestingPermission`,
`available()`, and the error message strings `CLEANUP` and `OWN_FAILURES` (23, user-visible copy).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-23, 101-102 | T10 (copy pins) | Classifies outcomes by matching product error **messages** (`'Location cleanup could not be confirmed.'`, `/still settling/`, `/unavailable in this build/`). A copy edit breaks the replay. | Product module exports typed error classes or `code`s; harness matches on those. Needs exports from `native-location.ts`: e.g. `LocationCleanupError`, error `code` field. | Low |
| 2 | 24 | C3 | Local `deferred()`; ci-and-formal §4 counts 20 copies. | `refinement/support.mjs`. | None |
| 3 | 18 | C5 | Uses `services/maps-model-traces.mjs` ITF engine; `itf-replay.mjs` is the other one. | One ITF module. | None |
| 4 | 105 | T8 | Three fixed `await Promise.resolve()` before `note()`; comment explains ordering. | Acceptable; deterministic microtask count. | Low |
| 5 | — | T4 | Aggregate duplicate. | `forward-replays.mjs` goes. | None |

## Proposed end state
Same replay; outcomes keyed on error codes rather than copy; shared `deferred`/ITF helpers; one runner.
