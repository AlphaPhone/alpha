# test/resident-prebind-stop.test.mjs
- Lines: 19 | Kind: transplant (nine marker slices of `connection-ui.tsx` and `local-agent.ts` concatenated with ~60 stubs into a `data:` module, plus the upstream binding controller) | Verdict: DELETE
- Covers: a refused stop before binding preserves the provider, retires the old client, never falls through to another start; a newer epoch is not retired; a failed bind never clears a provider. Duplicates: partially `test/resident-binding-guard-return.test.mjs`, `scripts/test-resident-reuse.ts`; upstream `cloud-resident-binding` tests. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | T2 | Nine `indexOf` slices; several end markers are comments; `pauseHostedBackground` and `connectCloud` are C4 deletions, so it breaks with stage A4. | Delete. | Medium: provider-preservation on refused stop loses host coverage |
| 2 | 11 | D8/T3 | One 3,000-character line declaring the fake world. | Goes with the file. | Low |

## Proposed end state
Delete. Carry one journey case to `journeys/connection-cloud.spec.ts`: resident stub refuses `stop` (state `stopping`)
during a Cloud bind; the UI shows the recovering state, the stub records no `configureCloudProvider` and no
`clearProviderIfCurrent`, and no second `start`. Other modes are internal.
