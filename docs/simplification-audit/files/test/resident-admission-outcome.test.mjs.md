# test/resident-admission-outcome.test.mjs
- Lines: 55 | Kind: unit (real import of `residentAdmissionOutcome`, table of inputs, no mocks) | Verdict: REWRITE as cases in `journeys/connection-cloud.spec.ts`
- Covers: each Cloud resident admission reason (signed-out, offline grace, sign-in-rejected, account-changed, plan-unavailable, needs-plan, admitted) maps to one binding, plan view, sign-in step, detach and forget-plan flag. Duplicates: partially `test/browser/resident-first-run.production.spec.ts`, `resident-failures.production.spec.ts`; `specs/quint/services/manifest.json` pins `residentAdmissionOutcome`. Callers/importers: `npm test` glob; imports `apps/app/src/runtime/subscription-entitlement.ts` and upstream `.eliza/.../cloud-resident-binding.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-47 | T3 | Pure table test of one mapping function; it asserts internal view-field shapes (`residentPlanNotice`, `planEndsAt`) rather than what the user sees. | Move the user-visible outcomes into the journey; delete the table. | Medium: detach/forget-plan decisions are security-relevant |
| 2 | 49-55 | T3 | Second test re-derives the same invariant ("only sign-in reasons ask to sign in") from the table. | Fold into journey case list. | Low |

## Proposed end state
Delete the file after `journeys/connection-cloud.spec.ts` (resident stub `test/browser/resident-stub.ts`, Cloud fixture)
drives these cases through the UI: (1) signed out with a connection shows Sign in and detaches; (2) offline with a plan
verified this week keeps the agent with an offline notice; (3) 401 on plan read shows "rejected" sign-in and forgets the
plan; (4) account changed shows account-changed sign-in and does not detach; (5) no plan shows the needs-plan notice;
(6) admitted plan binds Cloud inference. Each asserts the panel text and that the agent is still running.
