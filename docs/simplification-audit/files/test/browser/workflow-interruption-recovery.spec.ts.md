# test/browser/workflow-interruption-recovery.spec.ts
- Lines: 248 | Kind: Playwright spec, chromium, 14 tests; real UI over the dev agent with a fault layer | Verdict: KEEP as the basis of `journeys/workflows.spec.ts` (runs and recovery section)
- Covers: MVP-32 run admission under faults: rapid taps admit one run; lost request → Not received → one resend under the same submission id; lost response matched after reload; changed workflow closes an unaccepted request; wrong "no record" cannot double-run; agents without submission ids never offer resend; two tabs; cancel losing to completion; lost new-workflow save resend; typed-refusal unlocks the draft; manual-trigger only; editing during a waiting run; no prototype suggestion chips. Duplicates: lost-run resend also in `workflows.production.spec.ts` test 3; two-tab case duplicates `workflow-intent-storage` test 1. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-46 | T6 | Fault layer wraps `connectionController.getWorkflowClient` from the page. It sits on the transport, which is the right seam, but is installed by patching the controller. | Move into `harness/workflow-agent.ts` as `faults` on the dev agent route (or on `__alpha-local-agent`), so no controller patch. | Medium. |
| 2 | 49, 53-55 | T6 | `stored()` reads `development-execution-document`; `seed()` calls the client in page. | Read the agent fake's store; seed through the fake. | Low. |
| 3 | 70-84 | T4 | Lost Run → resend duplicates the production spec test 3. | Keep one: this richer dev version, and reduce the production test to the list/run/approval smoke; or the reverse. | None. |
| 4 | 237-248 | T6/A6 | "No prototype suggestion chips" patches `Component.prototype.renderVals` to read `sugg`. It guards an undo layer over prototype chip text. | Delete here; if chips matter, assert visible chips on Home in `journeys/home-shell.spec.ts`, and remove the prototype chip text at its source (A6). | Low. |
| 5 | 8, 12 | T8 | 15 s expect and 90 s test timeouts with load narratives. | Harness default timeouts; remove the comments. | Low. |
| 6 | 214 | T8 | `waitForTimeout(1500)` to show no run started. | Assert posts after a deterministic step. | Low. |
| 7 | 63 | T6 | Six synthetic `button.click()` loops via `document.querySelectorAll`. | Keep (rapid taps are the behaviour); fine as is. | None. |
| 8 | 3 | C5 | Imports `guardCalendarFixture as guardNoMedia` from a calendar helper. | Move the media guard to `harness/app.ts`. | None. |

## Proposed end state
Becomes the runs/recovery section of `journeys/workflows.spec.ts` (~11 steps), on `harness/workflow-agent.ts` with a
`faults` option, `harness/nav.ts` and the shared media guard. Drops the chip test and the duplicated lost-run case.
