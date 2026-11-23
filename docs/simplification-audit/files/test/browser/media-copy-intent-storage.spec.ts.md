# test/browser/media-copy-intent-storage.spec.ts
- Lines: 32 | Kind: unit tests in a browser (T6, 9 `/src` imports) of `runtime/media-copy-intent.ts`, plus two recovery-dialog UI tests; projects `chromium`, `firefox`, `webkit` (listed in `scripts/storage-specs.ts:28`), 8 tests x 3 browsers | Verdict: **DELETE** (legacy case per D1; remaining cases test a dev-only browser storage path)
- Covers: the browser (IndexedDB document) store for a pending Photos copy request: empty read, two-tab admission race, stale acknowledgement, failed write retention, legacy `localStorage` token adoption, stale reset, and the "Saved-copy recovery" download/reset dialog. Duplicates: the generic `BrowserDomainDocument` races are also covered by the other storage specs in `storage-specs.ts`. Callers/importers: `scripts/storage-specs.ts` (pattern list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-22 | A1 | Tests adoption of a pre-envelope `localStorage` token and the `legacy`/`legacyChanged` fields of the domain-document envelope. That is the legacy-envelope reader D1 deletes. | Delete with the reader. | none |
| 2 | 4-25 | T6 | Six tests call `readMediaCopyIntent`/`admitMediaCopyIntent`/`acknowledgeMediaCopyIntent`/`mediaCopyIntentDocument().reset` directly; none involves a user action. | Delete. | Low |
| 3 | all | D5 | `mediaCopyIntentDocument()` throws on Android (`media-copy-intent.ts:13`); production stores the token in `localStorage` directly. The recovery dialog opens only when `browserMode && testMocksEnabled` (`camera-adapter.ts:1477`). Everything here runs on a path no production build reaches, and runs three times (Firefox, WebKit). | Delete; remove the entry from `scripts/storage-specs.ts`. | Low |
| 4 | 26-32 | C6 | "Download saved-copy request backup, then reset" is one of the per-domain recovery download dialogs the legacy-envelope cleanup (C6) removes or consolidates. | Goes with C6. | none |

## Proposed end state
File deleted and removed from `storage-specs.ts`. The Android path (`localStorage` compare-and-replace in
`media-copy-intent.ts:22-24`) has no Playwright coverage here or elsewhere. If the owner wants it, one step in
`journeys/camera-photos.spec.ts` on the flag-off Android composition: copy a photo, reload before completion, check
"Check pending save". See the owner question in the chunk summary.
