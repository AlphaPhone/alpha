# apps/app/src/prototype/canonical-notes-controller.ts
- Lines: 33 | Role: subclass of upstream `NotesController` that routes the shared Notes client over Alpha's private resident `AppRecordPort`, fences every request on the port binding, and refreshes on same-session `alpha:canonical-notes-invalidated` window events. | Verdict: **SIMPLIFY** (small); could MOVE to `apps/app/src/runtime/canonical-notes-controller.ts` (it is a transport adapter, not prototype UI — D11)
- Importers (1 product): `canonical-notes-ui.ts:11`. Others: `test/browser/helpers/canonical-notes.ts:15,21` (dynamic import by URL path), `test/canonical-notes-webview-abort.test.mjs:20`, `specs/quint/refinement/application/canonical-notes-draft.mjs:30` (re-exports `CanonicalNotesController, CANONICAL_NOTES_INVALIDATED_EVENT` by path).
- Text/path pins: `specs/quint/application/manifest.json:282,1615,1665,1716`, `specs/quint/refinement/application/canonical-notes-controller.mjs:7` (`product` path; reads `module.exports.CANONICAL_NOTES_INVALIDATED_EVENT` :59), `test/quint-canonical-notes-controller.test.mjs`, `test/browser/notes-photos-list-focus.spec.ts:11`, `test/support/feature-parity.mjs:359`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C6 | `export const CANONICAL_NOTES_INVALIDATED_EVENT='alpha:canonical-notes-invalidated'` duplicates `runtime/app-record-completion.ts:3` `export const NOTES_INVALIDATED_EVENT = 'alpha:canonical-notes-invalidated'` (the dispatcher). | Import `NOTES_INVALIDATED_EVENT` from `runtime/app-record-completion.ts`; keep re-export under the old name only while `canonical-notes-controller.mjs`/`canonical-notes-draft.mjs` read it, or update those two harnesses. | None (same string). |
| 2 | 5, 12 | D4/C1 | `export type CanonicalNotesViewHooks=NotesControllerHooks;` — rename alias with one use (line 12); no importer (`git grep CanonicalNotesViewHooks`: this file only). | Use `NotesControllerHooks` directly; delete alias. | None. |
| 3 | 4 | D4 | `export type {NotesPhase}` re-export from upstream exists so `canonical-notes-ui.ts:11` imports it from here. | `canonical-notes-ui.ts` imports `NotesPhase` from the upstream module (or `@eliza/*` alias, D13); delete re-export. | None. |
| 4 | 7 | C3 | Session identity tuple `JSON.stringify([port.sessionId,port.scope??null,port.identity.ownerId,…])` — the `JSON.stringify([...session fields])` family (research P13: `main.tsx:102,430`, `agent-adapter.ts:443,1429,1694`, `agent-calendar-adapter.ts:142`). | `runtime/session-key.ts` `appRecordPortKey(port)`. | None. |
| 5 | 18-20 | B3 | `if(method!=='GET'&&method!=='POST')throw …; if(options.body!==undefined&&typeof options.body!=='string')throw …; JSON.parse(options.body)` — validates what the in-process upstream `createNotesClient` produces (it always sends GET/POST with a JSON string body). | Keep as a narrow type adapter but drop the two throws; or ask upstream `createNotesClient` to accept a `request(path, method, body, signal)` transport so no stringify/parse round-trip is needed (upstream follow-up, D14). | Low. |
| 6 | 28 | B3 | `typeof detail.revision==='number'&&Number.isSafeInteger(detail.revision)&&detail.revision>=0` — the event comes from `runtime/app-record-completion.ts`, same renderer; `Number.isSafeInteger` already implies number. | `Number.isSafeInteger(detail.revision)&&detail.revision>=0?…:undefined`. Keep the `sessionId` match (real filter). | None. |
| 7 | 9-33 | D11 | Lives in `prototype/` but has no UI; it is the Notes transport binding. | Move to `runtime/` next to `app-record-route-policy.ts` (update the pins listed above). | Low; path pins. |
| 8 | 1-2 | D13 | Deep relative imports into `.eliza/client-features/...`. | `@eliza/*` alias when introduced. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CanonicalNotesViewHooks` | type alias | 5 | = upstream `NotesControllerHooks` | delete |
| `CANONICAL_NOTES_INVALIDATED_EVENT` | const | 6 | `runtime/app-record-completion.ts:3` `NOTES_INVALIDATED_EVENT` | `runtime/app-record-completion.ts` |
| `binding` | helper | 7 | session-key tuples (see #4) | `runtime/session-key.ts` |

## Proposed end state
≈28 lines: one class, imports the event constant and hooks type, uses a shared session-key helper, no alias/re-exports; optionally at `runtime/canonical-notes-controller.ts`.

## Verification
`test/quint-canonical-notes-controller.test.mjs` (drives `specs/quint/refinement/application/canonical-notes-controller.mjs`), `canonical-notes-draft.mjs`, `test/canonical-notes-webview-abort.test.mjs`, `test/browser/canonical-notes.spec.ts` (dispatches the event literal), `notes-photos-list-focus.spec.ts`.
