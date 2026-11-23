# specs/quint/application/CanonicalCalendarDraft.qnt
- Lines: 145 | Kind: Quint model (live, 7 runs, 5 invariants) | Verdict: MERGE target — absorb `CanonicalCalendarEditorClose.qnt` and `CanonicalCalendarDraftHandoff.qnt` as one canonical Calendar draft module
- Covers: the agent ("canonical") Calendar editor's owner-bound durable draft slot: a previous account's bytes stay in their own slot, an old read cannot fill the next account, held writes/clears stay with their captured owner, a retired clear in a reopened same-owner lifetime requires review, a foreign stored frame is never offered, an earlier lifetime cannot discard a new draft. Duplicates: `CalendarPresentation` draft-identity runs; `CanonicalCalendarEditorClose` and `CanonicalCalendarDraftHandoff` model the same `prototype/canonical-calendar-drafts.ts` (§2.11 fragmentation). Callers/importers: manifest (6 sources incl. upstream `durable-draft*.ts`); harness `canonical-calendar-draft.mjs` (88 lines, + `.md`) on `test/fixtures/canonical-calendar-draft-owner.mjs` (esbuild bundle of the real adapter, codec and upstream durable store with four ports stubbed: import-based, good); `test/quint-canonical-calendar-draft.test.mjs` **and** aggregate (index.mjs:32).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 / §2.11 | Three models, three harnesses, three wrappers and two fixtures for one 143-line adapter. Draft ownership (here), editor Back/resume/discard (`EditorClose`) and Note/scan admission (`DraftHandoff`) share `retained`/owner/discard state. | One module `CanonicalCalendarDraft` with three sections and all 19 runs; harnesses stay separate files only if their fixtures differ (this one is Node-only; the other two need Chromium). | Medium (state merge; keep bounds) |
| 2 | 83 | — | `commitForeign(owner)` is `s' = s` (a label for another owner's commit having no effect). | Keep if the harness names it; otherwise delete. | None |
| 3 | 121 | B4 | `s.notices == 0` in `safety` while nothing ever increments `notices`. | Delete the `notices` field and conjunct. | None |
| 4 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
One canonical Calendar draft model (~300 lines) owning slot ownership, editor close/resume/discard and origin admission; `notices` removed; one manifest entry; Node harness from this file plus the mounted (browser-lane) harness for editor/handoff traces.
