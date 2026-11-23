# specs/quint/application/CalendarAgentSelection.qnt
- Lines: 145 | Kind: Quint model (live, 8 runs, 6 invariants, 4 witnesses, symbol pins) | Verdict: KEEP model; PORT harness probe
- Covers: what Calendar hands the assistant as "the selected object": an inspected device event only while its detail is open, a calendar source only while the new-event form targets the on-phone calendar; every read or close retires older inspections by epoch. Duplicates: none. Callers/importers: manifest (source `prototype/calendar-adapter.ts`); harness `calendar-agent-selection.mjs` (112 lines) on `calendar-adapter-fixture.mjs` (esbuild bundle of the real adapters with ports stubbed) and `calendar-itf.mjs`; only `test/quint-calendar-agent-selection.test.mjs` (2 tests, 280 s timeouts, asserts `traces === 38`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture:26-27, 49-52 | T10 | The fixture bundles the real adapter (good) but then string-replaces the bundled text at the literal declaration `let agentSelection, agentSelectionKey = "", agentSelectionEpoch = 0;` to append a read-only probe of closure state. A reformat or a split of the declaration breaks it. | Have `installCalendarAdapter` expose the selection through state the shell already reads (e.g. `calendar.agentSelection` view state or a returned `selection()` getter) and read that in the harness. Then delete the `closures` table entry. | Low |
| 2 | wrapper | T9 / B5 | Wrapper's second test mutates bundled text (`replaceAll('token === agentSelectionEpoch','true')`) to prove the replay notices a broken guard: a mutation test of the harness, anchored on product text. Wrapper also asserts `traces === 38`. | Delete the mutation test and the exact count (assert `> 0`). | None |
| 3 | manifest | T10 | Symbol pins include string fragments `calendar-source`, `calendar-event`. | Drop fragment pins. | None |

## Proposed end state
Model unchanged. Harness reads selection state through a supported interface; fixture has no bundle-text patch; one wrapper test without exact counts.
