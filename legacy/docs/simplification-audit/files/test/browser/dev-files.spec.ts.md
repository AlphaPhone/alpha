# test/browser/dev-files.spec.ts
- Lines: 61 (9 call sites, 10 tests) | Kind: Playwright `chromium`, default and dev builds; half UI, half module-in-page (11 `/src` imports) | Verdict: **MERGE** into `journeys/files.spec.ts` (5 cases)
- Covers: Files mutations (rename race, stale selection, duplicate and atomic folder import, binary read), PDF page rendering and preview release, folder creation in the renderer, mail attachment bridge hash check, sandboxed HTML preview, Ask Alpha source links (BOM, long file, over 5 MiB), rename preserving bytes without a Recent grant, failed rename retry. Duplicates: `dev-content-question.spec.ts:4-15` (Ask Alpha from a file), `files-preview-media.spec.ts`. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7 | T6 | Rename race, stale selection, duplicate path, folder import and binary read entirely through `AlphaFiles` calls. | Delete. | Medium: "two concurrent renames, one winner" and "no partial folder on duplicate paths" lose coverage. |
| 2 | 8-13 | T6, B5 | First half builds a PDF by hand and calls `pdfSelected` to count ink pixels; second half is a real viewer journey (Page 1 of 2, Next, Ask Alpha shows "pages.pdf · page 2"). Screenshot written to a fixed `test-results/dev-parity-ui/pdf.png`. | Carry the viewer half; import the PDF through the Files UI (generate it with `pdf-lib` in Node, as `dev-message-attachments` does). Drop the screenshot. | Low |
| 3 | 14-18 | — | New folder through Files options. | Carry. | none |
| 4 | 19-22 | T6 | `AlphaMailAttachments.readSelected/openReviewed` with a wrong hash. | Delete. | Low: sha256 mismatch refusal has no other e2e. |
| 5 | 23-26 | — | Imported HTML opens in a `sandbox=""` iframe and its script cannot touch the app origin. Security property. | Carry; import through the UI. | none |
| 6 | 27-44 | — | Ask Alpha source link for a BOM file, a file without preview text, and the 5 MiB limit message. | Carry the BOM case and the 5 MiB case; drop the 2.5 MB "long" arm. | none |
| 7 | 45-52 | — | Rename keeps bytes, the old selection goes stale, no Recent entry, survives reload. | Carry the visible part; drop the `storageSelect` probes. | none |
| 8 | 53-61 | P3 | Patches `BrowserFiles.prototype.storageRename` to throw. | Delete. | Low |
| 9 | 2, 9 | D8 | `beforeEach` goes to `/`; one test then navigates again to `/?mode=dev`. | One boot per test via the harness. | none |

## Proposed end state
`journeys/files.spec.ts` gets: create a folder; open a two-page PDF, page forward, Ask Alpha shows the page source; open an imported HTML file in the sandboxed viewer; Ask Alpha links a text source and refuses linking a file over 5 MiB; rename a file and see it after reload. Together with the `dev-content-question` case this is the Files "ask and manage" describe. Delete the file.
