# specs/quint/application/CanonicalCalendarEditorClose.qnt
- Lines: 124 | Kind: Quint model (live, 6 runs, 3 invariants) | Verdict: MERGE into `CanonicalCalendarDraft.qnt`
- Covers: the mounted canonical Calendar form: Back closes picker, then form, then detail; an invalid form closes keeping the last valid copy; retained-draft resume/discard controls; a retained edit blocks opening another; owner replacement drops the visible draft. Duplicates: `CalendarPresentation` Back order and draft runs; `CanonicalCalendarDraft` (owner/discard); `CanonicalCalendarDraftHandoff` (admission notices). Callers/importers: manifest (7 sources incl. `prototype/model.js`, `template.html`, `subview-accessibility.ts`); harness `canonical-calendar-editor-close.mjs` (203 lines, + `.md`) on `calendar-mounted-editor.mjs` (**Vite + Chromium**) and `calendar-draft-handoff.mjs`; dispatches `alpha-back`/`launcher-home` window events via `page.evaluate`; `test/quint-canonical-calendar-editor-close.test.mjs` **and** aggregate (index.mjs:67).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | See `CanonicalCalendarDraft.qnt.md` #1. | Merge as the "editor close" section. | Medium |
| 2 | harness:81,162 | T6 | Back and Home are injected as synthetic window events (`page.evaluate(() => window.dispatchEvent(new Event('alpha-back')))`) rather than user input. | Use the same key/gesture the journeys use (`helpers` Back), so the trace exercises the real input path. | Low |
| 3 | 85 | — | `settings` action exists only to reach `canConnect` in a run. | Keep. | — |
| 4 | wrappers | T4 / P1 | Chromium harness run twice in the host lane. | Browser lane, once. | Low |

## Proposed end state
Merged section of the canonical Calendar draft model; mounted harness kept in the browser lane, driving Back through the real input path.
