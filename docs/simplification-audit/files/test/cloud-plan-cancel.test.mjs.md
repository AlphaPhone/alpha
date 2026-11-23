# test/cloud-plan-cancel.test.mjs
- Lines: 17 | Kind: source transplant (slices `settings-adapter.ts` between two literal lines, strips types, runs in `vm` with a 20-key box) | Verdict: DELETE
- Covers: the Eliza Cloud account page in Settings offers only "Open account" and never cancels the plan, signs out or confirms while busy. Duplicates: `test/browser/cloud-account-panel.spec.ts`, `connection-boundaries.production.spec.ts` (render the account page). Callers/importers: `npm test` glob; imports `test/support/strip-types.mjs`; honours `SETTINGS_SOURCE` env knob that nothing sets (T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T2 / D7 | Cuts the adapter at `        const plan=connectionController.residentPlanSettings();` and `page.groups.push(group([{...connectionHelpRow()` (both still present). Any reformat (D9 Prettier) breaks it. | Delete. | None |
| 2 | 7 | T9 | `process.env.SETTINGS_SOURCE` override is set by no script or workflow. | Goes with the file. | None |
| 3 | 12 | A8 | Test name says "legacy account navigation"; the behaviour is current. | - | - |

## Proposed end state
Deleted. The single behaviour worth keeping (account page has one "Open account" row and no plan-cancel / sign-out side effect) becomes one assertion in `journeys/settings.spec.ts` (or the connection-cloud journey), driving the signed-in Settings > Account page with the cloud fake and counting native calls.
