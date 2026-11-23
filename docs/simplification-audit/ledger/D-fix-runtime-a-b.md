# D-fix-runtime-a-b

## Finding 1 (low): retired legacy-calendar statuses in daily-overview

- Re-checked: `AgentCalendarState.status` in `apps/app/src/runtime/agent-calendar.ts` no longer includes
  `transition-required` or `legacy-recovery`. The only references in `apps/` were the
  `OverviewAgendaFeedStatus` union and one `case` branch in `apps/app/src/ui/overview/daily-overview.ts`.
  The only production caller (`agent-calendar-adapter.ts`, through `presentHomeAgendaFeed`) passes
  `model.status`, so the branch was unreachable. This is a confirmed dead remnant of decision D1.
- Fix: removed both members from `OverviewAgendaFeedStatus`. Removed the `case "transition-required":` /
  `case "legacy-recovery":` branch, which returned the retired copy "Saved app calendar is retained
  separately; review the transition.". The `"review"` member of `OverviewAgendaFeedPresentation.state`
  is left unchanged.
- Behaviour: no production change, because the branch could not be reached.
- Verification: `npx tsc --noEmit` reports 0 errors. No references to the removed statuses or the copy
  remain in `apps/` or `test/`.
