# test/agent-always-local.test.mjs
- Lines: 263 | Kind: source-text (regex/slices of `connection-ui.tsx`, `agent-adapter.ts`, `alpha-client.ts`, `AlphaLocalAgentPlugin.java`, `AlphaCredentialStore.java`, `vendor/eliza` Java) + transplants (`new Function` over sliced `inferenceUnavailableReply`, `planActionCard`, an `agent-adapter` failure branch) + constant checks | Verdict: DELETE
- Covers: owner decision P-43 (the on-device agent always runs; plan state only binds Cloud inference), honest plan/sign-in replies, plan notice not a gate, native unbound launch. Duplicates: `test/browser/native-cloud-subscription.spec.ts` (composed flow), `test/resident-admission-outcome.test.mjs`, `scripts/audit-production-bundle.ts` DENYLIST (production copy). Callers/importers: `npm test` glob; imports `DENYLIST`, `RETIRED_*` from `scripts/audit-production-bundle.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-29 | T1/B5 | Asserts that the audit script's constant contains three strings: a self-check of a constant. | Delete; the bundle audit is the gate. | None |
| 2 | 30-44, 46-132, 204-253 | T1 | ~70 regex and `indexOf`-order assertions over `connection-ui.tsx` and Java text (statement order inside functions, call counts by `split`). Blocks every split of `connection-ui.tsx` (D1). | Delete. | Low |
| 3 | 134-202 | T2 | Evaluates sliced function bodies with `new Function` and fake globals. | Delete; cover in the journey below. | Medium |
| 4 | 241-250 | T5 | Reads `vendor/eliza` Java text. | Delete. | None |
| 5 | 129 | A1 | Comment and regex pin "preserving legacy recovery" (`clearLocalProvider(reason==='unbound')`); legacy Cloud recovery is being deleted (C5). | Delete. | None |
| 6 | 255-263 | T1 | "No Web Speech fallback" and "TZ env" as text greps. | The first belongs in `audit-production-bundle.ts` (forbid `speechSynthesis` in the bundle); the second is an emulator check. | Low |

## Proposed end state
File deleted. Behaviour that needs coverage moves to `journeys/connection-cloud.spec.ts` (extend
`native-cloud-subscription.spec.ts`): signed-out start shows the agent running and an honest "Sign in for AI" reply; a plan
refusal shows one bubble with one Manage card; sign-out keeps the agent running; Settings offers Restart, never Stop.
`speechSynthesis` joins the production-bundle denylist.
