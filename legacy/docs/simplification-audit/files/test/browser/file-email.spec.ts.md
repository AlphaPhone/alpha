# test/browser/file-email.spec.ts
- Lines: 92 | Kind: Playwright, chromium. A user journey (Files → Use in email → Attach to email review → Save draft), but the setup patches `inboxLocalStore.read/compareExchange` (P3), `connectionController.getCloudClient/getSnapshot` (P2) and `Component.prototype.renderVals`, and navigates through `shell.openView('files')` (P2) (s10/r35) | Verdict: **MERGE into `journeys/inbox.spec.ts`**
- Covers: a selected file needs explicit attachment review (the checkbox gates Attach; Cancel is real). The local draft keeps the exact bytes (`dataBase64`) across a restart and sends nothing. The review refuses a changed account, changed bytes or a revoked file. The same bytes cannot be attached twice. Files before Inbox asks to "Open Inbox first". Duplicates: `photo-email.spec.ts` covers the same review for a photo source; `journey-core-loops.production.spec.ts` covers mail compose on the production lane. Callers: the chromium project. Helper: `inbox-draft-navigation.ts` (`localDraftRow`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | P3 | `inboxLocalStore` is replaced by a `sessionStorage` stand-in ("browser production intentionally has no Inbox secret slots"). | Give the harness bridge `AlphaConnection.secure*` slots (as `flag-off-android.ts` does), so the real `inboxLocalStore` runs. | Low |
| 2 | 18-19, 56 | P2 | Cloud client and snapshot are overridden on `connectionController`. | Serve the Gmail client through the harness Cloud fake (`harness/cloud.ts`), with a second session for the "account changed" case. | Low |
| 3 | 27-28, 71 | P2 / T6 | `VIEWS.inbox.fileEmailTarget().ready` is polled, and `shell.openView('files')` is called from the page. | Navigate with visible controls (Back → Files). Wait on the Compose button or the review dialog. | none |
| 4 | 60-62 | — | The "changed bytes" case edits the `alpha.browser.files.v1` IndexedDB entry directly. This is a browser-stand-in storage write. | Change the file through the Files bridge (`AlphaFiles` fake) instead. | Low |
| 5 | 37 | B5 | A screenshot is written with no assertion. | Drop it. | none |
| 6 | 53 | T7 | The account/bytes/revoke loop is fine. | Keep it parametrized. | none |
| 7 | 4-33 | T4 | `photo-email.spec.ts` repeats the review shape for photos. | Merge both into one "attach to email" block, parametrized by source (file, photo). | none |

## Proposed end state
An "attach to email" block in `journeys/inbox.spec.ts`: review gating with exact bytes across restart, three
refusals, duplicate refusal, and "Open Inbox first". It runs for both Files and Photos sources on the harness bridge
and Cloud fake, with visible navigation and no product patches.
