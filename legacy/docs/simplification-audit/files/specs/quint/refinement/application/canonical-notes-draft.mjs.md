# specs/quint/refinement/application/canonical-notes-draft.mjs
- Lines: 180 | Kind: Quint refinement harness (esbuild bundle) with a source-text patch of upstream code | Verdict: PORT
- Covers: upstream `NotesEditor` open/begin/edit/save/reconcile/close against Alpha's `CanonicalNotesController`: captured save snapshot vs newer edits, queued saves, token replacement during a pending save, owner loss, rich formats and framing. Duplicates: `contracts.mjs` `notesLifecycle` canonical block (subset). Callers: `test/quint-canonical-notes-draft.test.mjs`, `index.mjs`; `compileCanonicalNotesEditor` / `createCanonicalNotesEditorFixture` imported by `canonical-notes-mutation.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-42 | T10 | esbuild `onLoad` reads `.eliza/client-features/plugins/plugin-notes/src/client/notes-editor.ts` as text, asserts exactly one occurrence of the marker `'    this.saving = true;'` (4-space indent) and injects `__quintSaveCaptures.set(this, captured)` plus an exported `__quintInspectSaved`. Product file read as text: upstream `notes-editor.ts`. Marker: `    this.saving = true;`. Breaks on any upstream reformat or rename of the local `captured`. | PORT: the captured save must be observable without patching. Options: (a) upstream exposes a read-only `savingSnapshot` getter on `NotesEditor` (D14: upstream change, listed as follow-up); (b) derive the captured fields from the pending POST body (`requests.at(-1).body.params`: id, content, expectedRevision, format, color) which the transport port already sees, and drop `s.captured.token/version` or take them from the editor's committed callback. (b) needs no product change. | M |
| 2 | 26-50 | C5 | Its own esbuild + `new Function(require, module, exports)` loader duplicates `support.mjs` `bundledSource`. | Use `bundledSource` once the plugin is gone. | L |
| 3 | 12-24 | — | Explicit text/format equality classes with asserts; legitimate for finite model mapping. | None. | — |
| 4 | 104-175 | D9 | 29 scenarios in one string-switch loop. | Table of scenario functions. | L |
| 5 | 52 | C5 | Fixture factory exported from a harness file. | Move to shared notes fixture module. | L |

## Proposed end state
Harness imports the bundled editor/controller through `bundledSource` with no onLoad patch; the captured-save projection comes from the pending request (or an upstream getter).
Same 29 schedules, written as a table; fixtures in a shared module used by draft and mutation.
