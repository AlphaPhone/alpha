# specs/quint/refinement/services/development-digest-pending-probe.mjs
- Lines: 223 | Kind: Quint refinement probe (imports real `developmentDigestStore` from `apps/app/src/runtime/local-agent-storage.ts` and real `localAgentStorage` from `scripts/local-agent-dev-storage.ts`, replaces `node:fs` with an in-memory port via a module hook) | Verdict: KEEP; trim legacy-phase scenarios with D1 (B297)
- Covers: CAS persistence of the dev-mode pending digest slot: exact-byte expected values, phase review→dispatched only, stale tabs, lost ack, pre-commit failure. Duplicates: `scripts/test-local-digest-storage.ts` (script-test of the same host storage; reviewed in the scripts chunk). Importers: `development-digest-pending.mjs` (spawned as a child process).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 95-99, 177-181, 214-220 | A1 / D1 | Scenarios `legacy retry retains original expected bytes`, `raw CAS refuses an equivalent legacy re-encoding` and the step `Refuse removing the reviewed phase` exist for rows written "by an older build" without `phase` and with pretty-printed JSON. delete-candidates B297 removes optional `Pending.phase` handling (`local-agent-storage.ts:60` `prior.phase===undefined`). | Delete the two legacy scenarios, the `'legacy'` phase / `pretty` projection, and `hostReencode`; change the model (`DevelopmentDigestPending.qnt` `Phases`, `legacyRetry...Test`, `rawByteDrift...Test`) in the same commit. | Medium (model + harness + product together) |
| 2 | 1-28 | — | Uses real imports and a `registerHooks` fs port; good shape (import-based, no text slicing). | Keep. | — |
| 3 | 16 | — | `globalThis.fetch` closed: correct isolation. | Keep. | — |
| 4 | — | D6 | Code under test is a dev surface (`devSurfacesEnabled && !isAndroid && browserLocalAgentEnabled`, `hosted-digest-ui.tsx:285`). D6/D19 keep it; if the dev local-agent digest store is ever removed, this probe goes with it. | None now. | — |

## Proposed end state
Five scenarios (exact advance, immutability, stale tab, lost ack, pre-commit failure) on the current phase format only; same import-based fixture.
