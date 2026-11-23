# test/home-cards.test.mjs
- Lines: 319 | Kind: unit (imports `prototype/home-cards.ts` and `locale-time.ts` and calls ~15 presenters) + source-text (lines 95, 101-106, 164, 197, 203, 268-293 read `template.html`, `data-adapter.ts`, `home-overview-cards.ts`, `agent-calendar-adapter.ts`, `workflow-adapter.ts`, `automations-adapter.ts`) + transplant (200-249: slices `p.renderVals=function()` out of `agent-calendar-adapter.ts` and evals `home-calendar-selection.ts` in `vm`) | Verdict: DELETE
- Covers: Home card copy: attention/inbox counts and freshness, brief card, calendar source/provenance and empty titles, attendee initials, workflow freshness, next-item ordering under Agent Calendar. Duplicates: `test/browser/home-daily-overview.spec.ts` (calendar source, hidden calendars, failed widget, overdue reminder, Agent Calendar, Inbox card account and read time, Brief run time, workflows load time), `home-attention.spec.ts`, `home-inbox.spec.ts`, `home-brief-result.production.spec.ts`, `home-workflows.spec.ts`, `home-overview-cards.test.mjs`, `home-views-model.test.mjs:292`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 95, 101-106, 164, 197, 203, 268-293 | T1 | Regex over template and adapter text ("no `gmailSearch`", placeholder order, `homeWorkflowDescription:loaded.description`). Blocks the `data-adapter.ts` → `home/home-values.ts` split (cross-file-actions §`data-adapter.ts`). | Delete. | Low |
| 2 | 200-249 | T2 | Slices `renderVals` from `agent-calendar-adapter.ts` and re-evaluates the selector with stubs. | Delete. | Low |
| 3 | 12-198, 250-319 | T3 | Presenter tables. Several presenters have aliases listed as dead (delete-candidates B199). | Delete; the visible strings are asserted by the Home specs above. | Low |
| 4 | 35-45, 46-56, 295-319 | — | Three behaviours with no journey found: a never-read stale inbox claims no count; a long brief is truncated with "…"; the calendar name is never borrowed from another calendar or an unknown id. | Carry as three assertions in `journeys/home-shell.spec.ts` (stale Gmail read with `updatedAt:null`; 200-char brief; event naming an unknown calendar id). | Low |

## Proposed end state
File deleted. Home copy is asserted where the user sees it (`journeys/home-shell.spec.ts`, folding
`home-daily-overview`, `home-attention`, `home-inbox`, `home-workflows`, `home-brief-result`), plus the three carried cases.
