# scripts/test-workflow-ui-flow.ts
- Lines: 38 (≈7.6 KB) | Kind: transplant-backed flow test (real `WorkflowProtocol`; renderer sliced through `workflow-renderer-fixture.ts`) | Verdict: REWRITE as `test/browser/journeys/workflows.spec.ts` (run/cancel cases), then DELETE
- Covers: Run needs a review click then confirm; disabling does not cancel; cancel needs confirmation; an ambiguous accepted run stays blocked across reload; with the submission protocol a lost response reconciles by key without another POST; typed refusals (`definite`, key conflict, wrong identity) never auto-retry and only identity-bound non-admission clears the lock; a manual typed workflow's switch sends no `/activate`; a hosted digest hides Run now and clears an old lost run. Duplicates: `test/browser/workflow-outcome-unknown.spec.ts` (outcome-unknown UI), `workflow-interruption-recovery.spec.ts`, `test/workflow-adapter-recovery.test.mjs` (same transplant fixture). Callers/importers: `test/adapter-contracts.test.mjs:9`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 12 | T2 | Transplanted renderer. | Journey against the real page with a routed fake agent. | Medium: richest coverage of the run-safety rules. |
| 2 | 6–9 | C5 | Fake agent server, 4th copy. | Shared fixture. | Low |
| 3 | 22, 32, 36 | T8 | `setTimeout(r,50)` negative waits ("nothing was sent"). | Assert request counters after a positive UI condition. | Low |
| 4 | 11 | — | `listeners` not passed (unlike siblings), so account switching is not exercised here; harmless. | — | None |
| 5 | whole | D8 | Minified. | Gone. | None |

## Proposed end state
Delete. Carry into `journeys/workflows.spec.ts` (describe "run"):
1. First Run click reviews only; second click starts exactly one run; receipt shows run id, version and events.
2. Disable does not cancel; Cancel asks "Confirm cancel" then sends one cancel.
3. Lost run response → "Check before running again"; reload keeps Run blocked; no second POST.
4. Submission-protocol agent: reload reconciles by submission id, no resubmit.
5. Refusals: no automatic retry; only `WORKFLOW_VERSION_NOT_ADMITTED` with matching identity clears the lock.
6. Manual typed workflow: switch shows "Manual", sends no `/activate`.
7. Hosted digest: Run now hidden, "In Digests", stale lost-run lock cleared.
Check overlap with `workflow-outcome-unknown.spec.ts` before writing case 3 (merge rather than duplicate).
