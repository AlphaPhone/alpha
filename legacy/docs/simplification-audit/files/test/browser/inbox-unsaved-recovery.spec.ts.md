# test/browser/inbox-unsaved-recovery.spec.ts
- Lines: 68 | Kind: Playwright spec, `chromium` dev server (`/`, offline selection) **and** `firefox`/`webkit` (listed in `scripts/storage-specs.ts:12`), 8 tests; 1 is module-in-page (T6), 7 drive the Inbox UI over a patched provider | Verdict: MERGE into `journeys/inbox.spec.ts` ("unsaved edits" describe, also in the storage list)
- Covers: unsent Inbox compose edits (body, half-typed To, Cc) are retained across reload, isolated by Cloud owner, never replace a newer explicit save, conflict across windows needs review, Discard is a focused modal, and a damaged recovery copy can be reset without losing the saved draft; no provider write happens. Duplicates: `journey-f-email-notifications.spec.ts` (local draft survives reload; same provider patch), `inbox-folders-drafts.spec.ts`, `inbox-read-cancel-draft.spec.ts` (draft lifecycle), `journey-f-reviewed-send.spec.ts` (provider boundary). Callers/importers: none; imports `inbox-draft-navigation.ts` (`localDraftRow`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-40 | T6 | First test never touches the UI: it imports `/src/prototype/inbox-unsaved.ts`, calls `edit`, `retire`, `flushForAppUpdate` and `peek` directly. A unit test in a browser. | Delete. The app-update flush is reachable only from `inbox-cloud-adapter.ts:344`; if it needs coverage, it is one step in the inbox journey that triggers the update path through the UI, not a module call. | Low |
| 2 | 14-21 | T6/P3/C5 | `setup` overwrites `inboxLocalStore.read/compareExchange` with a localStorage fake and swaps `connectionController.getCloudClient/getSnapshot` in-page. The same patch is hand-written in at least 9 specs (`journey-f-email-notifications`, `journey-f-reviewed-send`, `inbox-folders-drafts`, `gmail-mvp-scope`, `inbox-owner-fence`, `file-email`, `photo-email`, `use-in-email`, `owner-gmail-read-state-absent`). | Use one typed `helpers/mail-provider.ts` fixture (options: capabilities, owner, failure modes) shared by every inbox case. | Medium: the fake must keep the conflict semantics of `compareExchange`. |
| 3 | 4-13, 67 | T6 | `retained()` recomputes the SHA-256 storage binding and reads `BrowserJsonDomainDocument('alpha.browser.inbox-drafts:v1:unsaved:'+hash)` by importing the module; test 8 corrupts that document the same way. Pins the internal key derivation. | Wait on the visible "Unsaved edits"/recovery state instead of polling storage. To make the damaged copy, write raw bytes to the persisted key through one helper that does not import `/src` (the key name is a persisted identity, G5). | Low |
| 4 | 49, 46, 64 | T4 | `Resume unsaved email` is asserted absent (`toHaveCount(0)`) three times, but that label does not appear anywhere in `apps/app/src` (grep). The assertion cannot fail. | Assert on the control that exists (the `Local draft, Recover email edits` row or `localDraftRow`) or drop. | Low |
| 5 | 55 | — | `Restore my saved edits` is clicked, yet grep finds no such label in `apps/app/src` (only "Restore saved edits" for Calendar). Either it is built dynamically somewhere grep missed or this test fails today. | Check the current CI result before carrying the case; fix the label in the journey. | Medium |
| 6 | 52 | T6 | "Newer explicitly saved draft" is produced by editing the fake store's JSON directly. | Produce it with a second page that saves (as test 7 does with `context.newPage()`). | Low |
| 7 | 43-67 | D8 | Single-line tests of 400+ characters. | Formatter; one step per line in the journey. | none |

Cases worth carrying (each one step in the inbox journey, no `/src` imports): reload keeps body + incomplete To + Cc with zero provider mutations; edits after Save recover and clear after the next save; owner B sees nothing of owner A; stale base offers "Use latest saved draft" and keeps the newer save; two windows require review; Discard dialog (modal, focus on Keep, Escape returns focus, confirm removes copy); damaged copy reset keeps the explicit draft.

## Proposed end state
- Delete the file; seven short steps in `journeys/inbox.spec.ts` under "unsaved edits".
- Keep that describe in the firefox/webkit storage list (rename the entry in `scripts/storage-specs.ts`).
- Shared `helpers/mail-provider.ts` replaces the in-page patch here and in eight other specs.
- Drop the module-level `flushForAppUpdate` case and the absent-label assertions.
- Expected size ~45 lines in the journey.
