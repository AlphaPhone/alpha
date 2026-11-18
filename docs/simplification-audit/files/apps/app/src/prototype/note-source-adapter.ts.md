# apps/app/src/prototype/note-source-adapter.ts
- Lines: 115 | Role: "Source document" dialog on a text note (link / replace / open / remove a picked file, verified by SHA-256), plus native source-reference grant release | Verdict: DELETE with legacy notes (owner decision); otherwise SIMPLIFY onto `openReview`
- Importers: `main.tsx:152` (install), `notes-trash-adapter.ts:13` (`releaseUnusedSourceReferences`), `selection-adapter.ts:4` and `summary-note-review.ts:3` (`type Source` only).
  Text/path pins: `test/note-source-references.test.mjs:39` reads the text (T1); `specs/quint/refinement/application/note-source-dialog.mjs:9` transplants the source (T2/T10); `specs/quint/application/manifest.json` pins 10 names (`closeCurrent, forgetSelected, installNoteSourceAdapter, openReviewed, openSourceReference, releaseSourceReferences, releaseUnusedSourceReferences, retainSourceReference, saveImportedNote, sourceDocument`); `test/quint-note-source-dialog.test.mjs`; `test/fixtures/notes-trash-read.mjs:45` stubs it; `test/support/feature-parity.mjs:393`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-115 | A1 (P10) | Reachable only for "Older notes": `canonical-notes-ui.ts:18-19` strips `documentSource` from every agent record ("Device-local handles (a recording, a picked document, a web source) belong to Older notes adapters"), so `out.canLinkSource` is false for canonical notes and the template button (`template.html:2480`) never shows. Agent Notes is the default source. | With the P10 decision, delete the file, the `installNoteSourceAdapter` call in `main.tsx:152`, the template trigger, its Quint model/manifest entries and tests; release native grants via a one-line call in whatever replaces Trash maintenance (or delete the native `AlphaMailAttachments.retainSourceReference/releaseSourceReferences/openSourceReference` methods if nothing else retains references). | Owner decision; check Android side for other callers of these plugin methods before deleting them. |
| 2 | 10, 33 | D4 | `export type Source=DocumentSourceLink;` and `export const sourceOf=documentSourceOf;` — pure aliases. `selection-adapter.ts:4` and `summary-note-review.ts:3` import `type Source` from here. | Import `DocumentSourceLink`/`documentSourceOf` from the upstream module directly in those two files. | None. |
| 3 | 11-18 | C2 | `AlphaMailAttachments` plugin interface typed at the call site (also registered in `runtime/inbox-attachment.ts` / mail code). | One typed plugin module for `AlphaMailAttachments`. | None. |
| 4 | 47-112 | C4/P12 | Hand-built modal `<dialog>` with focus return, `alpha-back` capture, pagehide, theme-token copy `document.querySelector('.os')…setProperty('--source-'+token…)` — the shared `openReview()` in `source-review-dialog.ts` already does this (13 more copies in the repo). | If kept: rebuild on `openReview` (~45 lines saved). | Medium: Quint `NoteSourceDialog` model pins `closeCurrent` etc. |
| 5 | 90 | C3 | Chunked `String.fromCharCode(...bytes.subarray(i,i+8192))` → `btoa`; twins `phone-adapter.ts:42`, `runtime/native-recovery-backup.ts:12`. | Shared `bytesToBase64` in `lib/`. | None. |
| 6 | 36 | C3 | `sizeLabel` byte formatter; no exact twin found in `apps` (files views format sizes in `model.js`). | `lib/format.ts` if a second user appears. | — |
| 7 | 74 | B2 | `void api.notesTrash?.maintain?.();` optional calls on our own api. | Direct call (or delete with #1). | None. |
| 8 | 63, 106 | B1 | `attachments.cancel().catch(()=>{})`, `forgetSelected(...).catch(()=>{status='Reopen Files'})`. Best-effort cleanup; fine. | Keep. | — |
| 9 | 8 | C1 | `type Bag`. | Shared types. | None. |
| 10 | 53, 59-61, 111 | D8 | 300-500-char lines of DOM construction. | Format / `el()` helper. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Source` | type alias | 10 | `DocumentSourceLink` upstream | delete |
| `sourceOf` | const alias | 33 | `documentSourceOf` upstream | delete |
| `attachments` plugin | const | 11-18 | AlphaMailAttachments elsewhere | `runtime/plugins/mail-attachments.ts` |
| `typeLabel`, `sizeLabel` | const/helper | 35-36 | none exact | stay or `lib/format.ts` |
| `button` | helper | 60 | `notes-query-review.ts:4`, `note-web-source-adapter.ts:18` | `prototype/dom.ts` |

## Proposed end state
Preferred: file deleted with legacy Older notes (0 lines). If the owner keeps Older notes: ~65 lines on `openReview`, no aliases, typed plugin import.

## Verification
`node --test test/note-source-references.test.mjs test/quint-note-source-dialog.test.mjs`, Quint application manifest check, Android build (native plugin methods), Playwright Notes journeys, feature-parity test.
