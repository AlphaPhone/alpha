# scripts/fixtures/cloud-delegation/controls.ts
- Lines: 29 | Kind: component-page fixture (shared control object exposed on `window` for the test driver) | Verdict: MOVE to `test/fixtures/component-pages/cloud-delegation/`
- Covers: the handle through which the driver switches owner, emits the OAuth callback, holds/releases a clear and injects a compare-exchange race. Duplicates: none. Callers/importers: `fixtures/cloud-delegation/capacitor.ts`, `entry.tsx`, `native.ts`; read in the page by `scripts/test-cloud-delegation.ts` via `window.alphaCloudDelegationFixture`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-27 | — | Placeholders that throw until the page mounts are a reasonable "not ready" signal. | Keep. | L |
| 2 | file | T9 | Test fixture under `scripts/`. | Move with the page. | L |

## Proposed end state
Moves unchanged with the other four page files.
