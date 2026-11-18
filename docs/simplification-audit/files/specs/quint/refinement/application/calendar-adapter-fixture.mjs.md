# specs/quint/refinement/application/calendar-adapter-fixture.mjs
- Lines: 169 | Kind: harness fixture (esbuild bundle of the real calendar adapters with 19 port stubs, mounted on a fake shell; **plus text injection into the bundled output**) | Verdict: KEEP (PORT the probe)
- Covers: no behaviour itself; installs `installCalendarAdapter` (+ form/edit draft adapters) for model replays. Duplicates: shell/plugin fakes resemble `test/browser` Capacitor bridge fakes (T7). Callers/importers: `calendar-agent-selection.mjs`, `day-anchor.mjs`, `test/quint-day-anchor.test.mjs` — all survive.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-28, 43-47 | T10 | Exposes private closure state by `code.replace` of two exact esbuild-output declarations: `let creationPending = null, creationRecoveryFailed = false, creationDraftEpoch = 0, creationReadEpoch = 0;` and `let agentSelection, agentSelectionKey = "", agentSelectionEpoch = 0;` (source `calendar-adapter.ts:65,67`). Breaks on any reorder/rename and on esbuild formatting changes. | Observe through product API instead: `shell.calendarSelection()` already exposes selection; add nothing test-only (D7). For epochs, compare behaviour (late answer changes nothing) rather than counters, or move adapter state into a small exported `CalendarAgentSelection` class the adapter owns and the harness constructs. | M |
| 2 | 14-22 | T10 | 19 regexes keyed on import specifiers (`connection-ui$`, `browser\/review$`, `dev-profile$` …) — coupled to file names that stage F renames/moves. | Keep, but key on resolved paths after the `dev/` and `@eliza/*` moves; update in the same commit. | M |
| 3 | 39-41 | B5 | Asserts five files are in the bundle graph. | Drop; the import fails anyway if missing. | L |
| 4 | 7-9 | C5 | Entry exports three separate calendar adapters (C5 says merge the draft adapters). | Update the entry with that merge. | L |
| 5 | 139 | — | `new Function` with injected `Date`, timers, `document`, `window`: controlled clock. Acceptable. | — | — |

## Proposed end state
Same fixture without post-build text replacement; selection observed through `calendarSelection()`, creation recovery through the rendered calendar view; port map updated with stage F moves.
