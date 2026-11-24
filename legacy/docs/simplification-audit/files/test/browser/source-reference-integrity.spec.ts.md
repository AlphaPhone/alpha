# test/browser/source-reference-integrity.spec.ts
- Lines: 9 | Kind: Playwright chromium, 1 test; module-in-page (T6): `registerPlugin('AlphaFiles'/'AlphaMailAttachments')` browser stand-ins plus raw IndexedDB rewrite, no user action (s1 r1) | Verdict: DELETE
- Covers: a retained source reference (`b1:<uuid>`) refuses to open when the stored bytes changed. Duplicates: the user-visible source-reference flow (open linked source, rename, delete → "Source missing") is in `summary-source-note.spec.ts`. Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-8 | T6 / P2 | Whole test runs inside `page.evaluate`: import file, read, retain reference, forget, rewrite IndexedDB row, open. It exercises `browser/mail-attachments.ts`, the web stand-in for the Android `AlphaMailAttachments` plugin. | Delete. | Medium: only check of the stand-in's hash comparison. |
| 2 | 5 | T6 | Hand-written IndexedDB transaction against `alpha.browser.files.v1` pins the stand-in's private schema. | Gone with the file. | None |
| 3 | 8 | — | The only UI assertion is that a dialog did *not* open on a page where nothing could open it. | Gone with the file. | None |

## Proposed end state
Delete. The product path is the native plugin (Android), so the integrity rule belongs to the Android instrumentation suite. If the owner wants the browser-visible version, add one step to the Notes summary journey (`journeys/notes.spec.ts`): change the file's bytes through the Files UI (replace content) and expect "Source changed" on "Open linked source".
