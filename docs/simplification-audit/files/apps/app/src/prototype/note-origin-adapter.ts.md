# apps/app/src/prototype/note-origin-adapter.ts
- Lines: 125 | Role: stores "this reminder/event came from note X" links in a durable slot and decorates the Calendar event view with "From note" + open-note | Verdict: SIMPLIFY
- Importers: `main.tsx:135` (install), `calendar-adapter.ts:13`, `reminder-adapter.ts:11`, `agent-calendar-adapter.ts:23`, `runtime/deletion-undo.tsx:2`.
  Text/path pins: `test/note-origin.test.mjs:137` reads the source text (T1); `test/browser/note-calendar-handoff.spec.ts:20` dynamically imports the file and calls `readNoteOrigins()` (keep that export or change the spec); stand-ins in `scripts/fixtures/calendar-adapter.ts:88-89`, `scripts/test-calendar-crud-review.ts:62-63`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:105`, `test/calendar-delete-latch.test.mjs:34`; `test/support/feature-parity.mjs:391`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43, 52-90, 93-103 | A1 | Version-1 "Older notes" links: `olderNotesOpen()` reads `shell.notesSourceMode==='legacy'&&!!shell.notesLegacySource`, `openOlderNotes` chooses the `'legacy'` source, `olderNotes()` reads legacy `notesStore`, `voiceNoteChanged` revision check; `openCanonicalNotes` switches away from legacy. A fresh `ai.alphacompute.alphaphone` install cannot hold v1 links (research P10). | With the legacy-notes decision: delete lines 52-62, 69-90 and the legacy switch in `openCanonicalNotes` (97-101 reduce to `return 'open'`), and drop `NoteOrigin`, `resolveNoteOrigin`, `voiceNoteChanged` imports. A stored v1 link then renders nothing (same as "no origin"). ~40 lines. | Owner decision P10; `runtime/note-origin.ts` v1 types follow. |
| 2 | 48-51 | D6/D3 | `shell` captured into a module-level `let` from `componentDidMount` (`shell=this`), declared on line 51 **after** the mount function that assigns it. | Pass `shell` through the render `api` (or a WeakMap) once on the hook registry; at minimum move the `let` above its first use. | Low. |
| 3 | 12, 21 | A7/D7 | `readNoteOrigins`/`loadNoteOrigins` exported; no product importer outside this file. `readNoteOrigins` is used by `test/browser/note-calendar-handoff.spec.ts:20` (in-page import, T6). | Unexport `loadNoteOrigins`; keep `readNoteOrigins` only while that spec needs it, or have the spec read the slot through the UI. | None. |
| 4 | 5, 8-10, 12-18 | C4 | Hand-rolled "Android secure slot vs browser JSON document" dual store with compare-exchange (`secureConnectionStore.read/compareExchange` vs `BrowserJsonDomainDocument.editJson`). Same mechanism exists in `runtime/notes-folders.ts`, `runtime/notes-trash.ts` and 6+ others (research C4). | Use the shared durable-document helper once it exists. Persisted slot `'note-origins:v1:device'` and browser key `'alpha.browser.note-origins:v1:device'` must stay byte-for-byte. | Low if key strings preserved. |
| 5 | 28 | C3 | `CREATION_ID` UUID-v4 regex; twin `browser/calendar.ts:240`. | Shared `isUuidV4` in `lib/`. | None. |
| 6 | 40 | B3 | `JSON.stringify(savedNoteOrigin(kind,id))===JSON.stringify(origin)` re-reads what `change()` just wrote. | Keep: it is the documented "resolves false when not stored" result after a CAS race; comment it. | — |
| 7 | 41-42 | B1 | `catch{return false;}` and `catch{/* An orphaned link names no existing record. */}` — fallback is the specified behaviour. | Keep. | — |
| 8 | 4, 47 | C1 | `type Bag`, `Component:Bag`. | Shared shell types. | None. |
| 9 | 63-66 | D9 | Origin lookup is one 300-char ternary over `alphaReminderId / alphaCalendarId / canonicalEventKey`. | Extract `originOf(selected)` with early returns. | None. |
| 10 | 10, 33 | NEW (platform test drift) | `native()` = `Capacitor.getPlatform()==='android'` but `eventNoteOriginId` uses `Capacitor.isNativePlatform()`. Same intent, two predicates. | Use one platform predicate. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 4 | 60× | shared shell types |
| `slot` | const | 5 | slot-name constants in notes-folders/notes-trash runtime | stays (persisted) |
| `browser()` / `native()` / `change()` | helper | 9-19 | durable slot/doc wrappers ×8 (C4) | shared durable document |
| `CREATION_ID` | const | 28 | `browser/calendar.ts:240` | `lib/ids.ts` |
| `noteOriginSupported` | helper | 27 | stubbed in 3 fixtures | stays |

## Proposed end state
Store helpers (read/remember/forget/saved) over the shared durable document (~25 lines), `eventNoteOriginId`, and one calendar render decorator that resolves only version-2 canonical links. No legacy source switching. Est. ~70 lines.

## Verification
`node --test test/note-origin.test.mjs test/calendar-delete-latch.test.mjs`, `scripts/test-calendar-crud-review.ts`, Playwright `test/browser/note-calendar-handoff.spec.ts`, Quint calendar-adapter fixture replays, feature-parity test.
