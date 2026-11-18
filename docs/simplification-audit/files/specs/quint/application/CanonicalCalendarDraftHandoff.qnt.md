# specs/quint/application/CanonicalCalendarDraftHandoff.qnt
- Lines: 87 | Kind: Quint model (live, 6 runs, 3 invariants) | Verdict: MERGE into `CanonicalCalendarDraft.qnt`
- Covers: the canonical Calendar receiver shared by mounted Note and scan review: a retained earlier draft refuses a new Note/scan draft (reminder uses separate admission), a pending discard or a loading replacement slot admits nothing, an unavailable canonical source keeps the origin review. Duplicates: admission (`retained`, owner replacement, discard) overlaps `CanonicalCalendarEditorClose` (`admitted`, `finish-draft`, `draft-busy`) and `CanonicalCalendarDraft` (owner slots). Callers/importers: manifest (7 sources: `agent-calendar-adapter.ts`, `canonical-calendar-drafts.ts`, `canonical-notes-ui.ts`, `camera-adapter.ts`, `scan-review.ts`, `scan-event-review.ts`, `assistant-draft-store.ts`); harness `canonical-calendar-draft-handoff.mjs` (158 lines, + `.md`) on `test/fixtures/calendar-draft-handoff.mjs`, `calendar-mounted-editor.mjs` (**Vite + Chromium**, imports `/src/...` modules in the page) and `camera-calendar-review.mjs`; `test/quint-canonical-calendar-draft-handoff.test.mjs` **and** aggregate (index.mjs:68).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | See `CanonicalCalendarDraft.qnt.md` #1. | Merge as the "origin admission" section. | Medium |
| 2 | harness | T6 / P1 | The harness drives the real mounted app in Chromium (a journey), but from the host `npm test` lane, twice. | Run in the browser lane only, once. | Low |
| 3 | 3-5 | — | Comments explaining Note vs scan notices are useful; keep. | None | — |

## Proposed end state
Merged section of the canonical Calendar draft model; the mounted harness remains (browser lane) and replays these runs against the merged module.
