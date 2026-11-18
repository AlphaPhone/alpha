# test/browser/upstream-client-features.spec.ts
- Lines: 51 | Kind: Playwright chromium, 2 tests; module-in-page (T6), no user action (s1 r0). Test 1 imports upstream `plugin-files/src/browser/files.ts` through `/@fs`; test 2 imports `/src/browser/files.ts` | Verdict: DELETE
- Covers: two hosts of the upstream Files package get isolated databases and their own viewer, and rename invalidates a stale selection; a workflow attachment receipt prevents replay after the saved file is deleted and refuses changed content under the same operation id. Duplicates: Files journeys exercise the local browser Files stand-in through the UI. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-33 | T5 / D13 | Tests upstream code (`.eliza/client-features/plugins/plugin-files`) by file-system path. Upstream behaviour belongs to `vendor/eliza`'s own suite (D14). | Delete; list as upstream follow-up. | Low |
| 2 | 35-51 | T6 | `BrowserFiles.saveWorkflowAttachment` idempotency checked by direct calls on the browser stand-in. | Delete. If the owner wants it, one step in `journeys/workflows.spec.ts`: a workflow run that saves an attachment twice shows one file in Files → Receipts. | Medium: only check of receipt replay after delete. |

## Proposed end state
Delete the file. Add the upstream isolation test to the upstream follow-up list (`cross-file-actions.md` §6). Receipt replay is a workflow-engine guarantee; cover it, if at all, in the workflows journey through the visible Receipts folder.
