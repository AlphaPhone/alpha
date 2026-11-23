# apps/app/src/prototype/canonical-notes-editor.ts
- Lines: 1 | Role: rename shim `export {NotesEditor as CanonicalNotesEditor} from '…/plugin-notes/src/client/notes-editor.ts'`. | Verdict: **DELETE**
- Importers (1): `canonical-notes-ui.ts:12` (uses `CanonicalNotesEditor` at :45 and :76). No test imports it.
- Text/path pins: `specs/quint/application/manifest.json:283,1640,1689` (listed as a source), `test/browser/notes-photos-list-focus.spec.ts:11` (path list), `test/support/feature-parity.mjs:360`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | Pure rename re-export with one importer (research P14, confirmed: `git grep canonical-notes-editor` → only `canonical-notes-ui.ts`, two manifests/lists). | In `canonical-notes-ui.ts` import `{NotesEditor}` from the upstream module and use `NotesEditor` at :45/:76; delete this file; drop the path from the manifest `sources` (3 entries), `notes-photos-list-focus.spec.ts:11` and `feature-parity.mjs:360` (replace with the upstream path if those lists must name the editor). | None. |

## Local types and helpers
None.

## Proposed end state
File deleted (0 lines).

## Verification
Notes Quint models using the manifest entries (`specs/quint/application` notes draft/view), `test/browser/canonical-notes.spec.ts`, `notes-photos-list-focus.spec.ts`; `npm run verify` manifest/source checks.
