# specs/quint/application/ReminderDecision.qnt
- Lines: 149 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Done/Snooze/Delete on a dated reminder: journal before native, read back never resend, conflicting decision waits, delete goes to review. Duplicates: Partly ReminderIntents (operation records, same `reminder-deletions.ts`/`reminder-journal-store.ts`), but at the detail-decision level; acceptable split. Callers/importers: `specs/quint/refinement/application/reminder-decision.mjs` (`checkReminderDecision`) <- `test/quint-reminder-decision.test.mjs` (not in the aggregate `index.mjs`, so run once).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 (none) | Harness bundles the real `prototype/reminder-adapter.ts` through `reminder-adapter-fixture.mjs` (esbuild, port stubs) and replays ITF traces: an import-based refinement. Good model of what the others should look like. | None. | - |
| 2 | 19,36,107 | B4 | `FreshBeforeDecision = not(s.startedStale)` is vacuous: `start` requires `not(s.stale)` and then sets `startedStale: s.startedStale or s.stale`, which is always false. The invariant restates the guard. | Delete `startedStale` and `FreshBeforeDecision`; `staleBlocksDecisionTest` already shows the guard. | L |
| 3 | manifest | T10 | 20 symbol pins incl. a message string (`Another action on this revision is unconfirmed`). | Drop symbol pins; the harness is the real link. | L |

## Proposed end state
- Keep model and harness unchanged apart from the vacuous variable.
- Harness stays import-based; it is the template for porting the transplant harnesses in this chunk.
- Manifest: file pins only.
