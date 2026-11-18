# specs/quint/refinement/services/calendar.mjs
- Lines: 0 (file no longer exists) | Kind: Quint refinement harness (deleted) | Verdict: already DELETED in this worktree (stage A1, D4)
- Covers (at HEAD): model `CalendarSync` via `apps/app/src/runtime/calendar-linked-store.ts` + `LinkedCalendarReconciler`; removed with the client-side Calendar linked-sync stack, and its import is already gone from `index.mjs`.

## Leftovers to clean up
- `index.mjs:138` still carries the `CalendarSync` obligation "Outbox claim/revision/undo/restart/unknown-outcome paths execute", which is now false.
- `README.md:16` (this folder) claims the same; the README is DELETE.
- `specs/quint/services/manifest.json:246` keeps model `CalendarSync` with product sources `agent-calendar.ts`, `agent-calendar-client.ts`, `canonical-calendar-draft.ts`, `CalendarSync*.java`; it now has **no** refinement harness. Either write one against `agent-calendar.ts` (the product path) or record it as model-only. Coverage gap noted in the chunk summary.
