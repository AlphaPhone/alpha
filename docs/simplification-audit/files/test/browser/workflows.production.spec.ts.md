# test/browser/workflows.production.spec.ts
- Lines: 273 | Kind: Playwright spec, production project (flag-off bundle), 4 tests; rendered controls only | Verdict: MERGE into `journeys/workflows.spec.ts` as its production-project section (keep all four cases)
- Covers: AP-11 on the flag-off bundle: the list shows only agent workflows and no development surface; detail, two-tap Run and its receipt; enable needs confirmation, pause is immediate; approvals approve/deny with second confirmation and request digests; cancel a running execution; a lost Run stays unknown until an explicit same-submission resend, across reloads; out-of-scope request refused before sending. Duplicates: lost-run resend also in `workflow-interruption-recovery.spec.ts` test 2; scope refusal in `workflow-scope-refusal.spec.ts` test 1. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-103 | C5 | Best of the five workflow agent fakes: plugin-workflow wire shapes, sessionStorage-backed (survives reload), records gets/posts/unexpected, answered at the `Agent.request` bridge. | Lift into `harness/workflow-agent.ts` and use it for every dev workflow step (replacing the fakes in missed-run, outcome-unknown, generation, scope-refusal, interruption-recovery). | Medium; biggest single dedup in this chunk. |
| 2 | 123, 170, 213, 258 | T8 | 120–180 s per-test timeouts. | Measure on the harness and drop to defaults where possible. | Low. |
| 3 | 223 | T8 | `waitForTimeout(500)` to show no retry. | Assert after a deterministic UI step. | None. |
| 4 | 35 | B1 | `catch { return initial(); }` around a sessionStorage parse. | Fine in a fixture; keep. | None. |
| 5 | 82 | A8 | "These legacy approval fixtures…" comment. | Reword: approvals without a typed spec. | None. |
| 6 | 2-16 | ok | Evidence-boundary comment is accurate (no APK, emulator or engine). | Keep, shortened. | None. |

## Proposed end state
`journeys/workflows.spec.ts` has a production section (run by the production project) with these four steps, on
`harness/workflow-agent.ts` and `flag-off-android` helpers. The same agent fake backs the dev-project sections.
