# Chunk specs-09

| File | Kind | Verdict | Target |
|---|---|---|---|
| `specs/quint/application/manifest.json` | Quint model registry (application family, 187 entries, 655 symbol pins) | KEEP, SIMPLIFY | drop 7 entries (PreviousNotesAvailability, PreviousNotesSourceOpening, NotesTrashReadPublication, NotesTrashSession, NoteSourceDialog, NoteWebSourceDialog, VoiceTurnReview); trim ~12 more; delete 59 fragment symbols and the unread `abstractions`/`stateMapping`/`profiles` fields |

Report: [`files/specs/quint/application/manifest.json.md`](../files/specs/quint/application/manifest.json.md).

## Urgent

`npm run quint:check` (and every Quint command) fails right now on this file: the C1 deletions removed
`legacy-notes-access.ts`, `notes-trash-adapter.ts`, `note-source-adapter.ts` and `note-web-source-adapter.ts`, but
7 `sources` rows and 28 `symbols` pins still name them (`quint-lib.ts:233,238-244`). The six matching `.qnt`
files still exist, so the manifest rows and the `.qnt` files, harnesses, wrapper tests and
`refinement/application/index.mjs` adapter entries must be removed together.

## Behaviours that lose coverage if the DELETEs happen

None that stays in the product. Each deleted entry models a deleted path: previous-notes legacy source (D1), the
legacy Notes Trash adapter (D1/C1), note import from file or web (D3), the test-only voice turn review policy (D8).
One thing to confirm: whether canonical Notes still has a Trash that uses `runtime/notes-trash.ts` /
`notes-trash-policy.ts`. If it does, NotesTrashSession's safety properties (no erase of a refused note, maintenance
does not race a restore) have no other model, and a journey `journeys/notes.spec.ts` case should cover it.

## Shared helpers worth keeping

`readModelFamily` in `scripts/quint-lib.ts` as the only manifest reader (normalise all four manifests to
`{models:[…]}`; `refinement/application/index.mjs:156-157` and `test/quint-native-refinement.test.mjs:14` re-read
them).

## Cross-file actions

- Each product deletion unit (C1, C2, C3, C4, C9, C10, C19, shim merges A62/A81/A82/A85/A86/A87/A89) must edit this
  manifest in the same commit, or the Quint toolchain breaks.
- `specs/quint/refinement/application/browser-tab-lifecycle.mjs` imports `createSessionSaver`; port it before D20
  deletes that function (BrowserSessionPersistence itself models the live `browser-adapter.ts` saver and stays).
- Ledger correction: delete-candidates C3 says `google-calendar-link-publication.md:18-22` calls the link
  publication test-only. It does not; it says the Settings Calendar row opens the panel through
  `googleConnectionController.openCalendar`. Keep `GoogleCalendarLinkPublication`; only the
  `google-calendar-selection` clear call inside `google-connection-ui.tsx` goes.
- Hot `sources` rows (`model.js` 19, `main.tsx` 17, `connection-ui.tsx` 17, `agent-adapter.ts` 16,
  `template.html` 15, `upstream.lock.json` 8) drive `check-changed-models.ts` selection; trimming them is the
  cheapest CI saving in the formal lane.
- `test/quint-checker.test.mjs` floors (`application >= 116`, scenarios `>= 1841` across families) stay satisfied
  after these deletions (179 application models), but scenario removals in NotesLifecycle and other D1-trimmed models
  must be checked against the 1,841 total.

## Owner questions

1. Does canonical Notes keep a Trash backed by `runtime/notes-trash.ts`? (Decides whether NotesTrashSession is
   ported to the canonical path or deleted.)
2. Is the voice `'review'` send policy (`reviewConversationTurn`) really test-only (D8)? If yes, VoiceTurnReview goes.
3. Should `abstractions` move into `.qnt` header comments, or is the manifest prose wanted as the reviewed record?
4. `PermissionChoices.profiles` is unread: delete it, or make `check-quint` simulate each declared init?
