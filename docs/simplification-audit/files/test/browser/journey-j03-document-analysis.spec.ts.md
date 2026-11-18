# test/browser/journey-j03-document-analysis.spec.ts
- Lines: 202 | Kind: Playwright journey, `chromium` (`/?mode=dev&tools=1`), 1 test; dev incoming-email simulator → Inbox attachment → Save to Files → Ask Alpha → dev agent reply → reviewed summary note → source link fails closed | Verdict: KEEP (J03 section of `journeys/files.spec.ts`), ported off the legacy Notes source
- Covers: a mail attachment saved to Files can be asked about with a trimmed excerpt, saved as one reviewed note whose source reference opens the file and fails closed when bytes change or the file is deleted. Duplicates: `journey-core-loops.production.spec.ts:576` (J03 web build, only the no-agent path), `inbox-save-attachment.spec.ts` (provider Save to Files), `source-reference-integrity.spec.ts` (byte change). Callers/importers: none; imports `openConnectionDiagnostics`, `openLegacyNotes` (`helpers/legacy-notes.ts`), `returnToApps`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 56, 72, 156 | A1 | Notes are opened through `openLegacyNotes` ("Previous notes" source), which D1 deletes; the summary note is read back from `browser-notes-document.ts` (`readBrowserNotesRaw`, legacy store). | Open the current Notes collection (`helpers/canonical-notes.ts`) and assert the note through the Notes UI; drop the legacy read. Confirm with the Notes owner which store "Save reviewed note" writes to after A2. | Medium: the summary-note save path must target the canonical store once the legacy one is gone. |
| 2 | 49-51 | T6 | Reads notes, files and dev-agent messages through `/src` imports (`browser-notes-document`, `platform-plugins` `AlphaFiles.list`, `development-agent-document`). | Keep the agent-message check (proves the private line was not sent) through one harness helper; replace notes/files reads with UI assertions where the UI shows the same fact. | Low. |
| 3 | 174 | - | Byte change done directly in IndexedDB `alpha.browser.files.v1`; documented as an external-change simulation. | Keep, as a named harness helper. | Low. |
| 4 | 41 | T8 | 300 s timeout. | Project default should suffice (no OCR here). | Low. |

## Proposed end state
J03 test in `journeys/files.spec.ts`, on the dev project (needs the incoming-email simulator and dev agent profile, D6). Same six steps; notes opened via the canonical Notes helper; storage reads reduced to the agent-message privacy check and the IndexedDB byte mutation helper.
