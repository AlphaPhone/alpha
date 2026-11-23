# specs/quint/refinement/application/canonical-notes-mutation.mjs
- Lines: 155 | Kind: Quint refinement harness (reuses the Notes editor bundle) | Verdict: KEEP (follows the `canonical-notes-draft.mjs` port)
- Covers: upstream `NotesEditor.remove`/`restore` through `CanonicalNotesController`: dirty-delete prerequisite save, replacement/close during that save, queued edits, owner loss, concurrent command refusal, malformed replies. Duplicates: none. Callers: `test/quint-canonical-notes-mutation.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 72 | T10 (inherited) | Depends on `compileCanonicalNotesEditor`, which patches upstream `notes-editor.ts` at `    this.saving = true;`. | Ported with `canonical-notes-draft.mjs`; this file only reads `s.captured` id/token/version/base. | M |
| 2 | 28-37 | — | Derives the pending write kind from the real POST capability (`delete-note` / `restore-note`). Good: shows the captured-save fields can come from requests too. | Reuse this approach for the draft port. | — |
| 3 | 73-80, 81-149 | D9 | 37 scenario names, nested `includes` conditionals. | Table of scenario functions. | L |
| 4 | 71 | B5 | `captureSources([driver, ...extraSources])` then the compile captures again. | Single capture. | L |

## Proposed end state
Same schedules expressed as a table; editor bundle without text patching.
