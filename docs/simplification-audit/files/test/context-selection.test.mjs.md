# test/context-selection.test.mjs
- Lines: 280 | Kind: mixed: unit (imports real `apps/app/src/prototype/context-selection.ts`, `runtime/phone-context.ts`, `runtime/reviewed-mail-context.ts`) + source-text (regex over `AlphaNotificationsPlugin.java`, `AlphaPhotosPlugin.java`, `camera-adapter.ts`, `inbox-cloud-adapter.ts` and three `vendor/eliza` Java files) + transplant (lines 258-280: slices `connection-ui.tsx`, upstream `single-flight-memo.ts` and the generated calendar contract into `vm`) | Verdict: DELETE (folder cases go with C19; the rest is covered by `test/browser/context-selection.spec.ts` or moves to integration)
- Covers: opaque folder/capture/settings/notice identities for the agent context, folder freshness checks, notice reviewability, capture questions, location MIME types, mail context validation, calendar source discovery coalescing. Duplicates: `test/browser/context-selection.spec.ts` (14 tests: notice review, mail attach/change refusal, Settings slugs, photo identity and revision, trashed photo). Callers/importers: `npm test` glob; `delete-candidates.md` B196 lists it as the test that goes with the folder-context deletion.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-81 | A3 (C19) | Folder scope, revisions, freshness and excerpt: the Files folder-context feature is decided deleted (RECOMMENDATIONS A3, delete-candidates C19; its only dispatcher was removed in `ba6fe9e70`). | Delete with `folderScope`/`createFolderRevisions`/`folderScopeCurrent`/`folderExcerpt`/`FOLDER_EXCERPT_LIMIT`. | Low |
| 2 | 92-97, 130-137, 164-169, 210-215, 226-235, 251-254 | T1 / T5 | Regex over Android Java, `vendor/eliza` Java (`NotificationsHostPlugin`, `PhotosPlugin`, `OwnedMediaLibrary`) and adapter TS to prove a string matches across languages. | Delete. A real cross-language contract (hidden notice title/text) belongs in an emulator instrumentation check or `verify-apks`; flag as owner question. | Medium |
| 3 | 82-122, 180-190, 217-224 | T4 | Notice reviewability, settings slug, capture question: covered end to end by `context-selection.spec.ts:30-81, 213, 222`. | Delete. | Low |
| 4 | 123-163, 192-209 | — | Capture identity never leaks the library revision; `captureUnchanged` refuses an in-place rewrite (API 29 same size/time). The rewrite case is not in the browser spec. | Add one step to `journeys/camera-photos.spec.ts`: rewrite the open photo's `contentRevision` in the bridge fake before Send, expect refusal. | Medium |
| 5 | 171-179 | T3 | `locationMimeTypes` table: unit of a constant map. | Delete; `journeys/files.spec.ts` picker step covers it. | Low |
| 6 | 237-255 | T4 | Mail context refusal: covered by `context-selection.spec.ts:183-203`. | Delete. | Low |
| 7 | 258-280 | T2 | Calendar agenda source discovery transplanted from `connection-ui.tsx` with upstream `SingleFlightMemo` evaluated from vendor text. | Delete; if kept, integration case over the extracted module in `test/integration/calendar.test.ts`. | Low |

## Proposed end state
File deleted. Folder-context code and tests leave together (C19). One photo-rewrite step moves to
`journeys/camera-photos.spec.ts`. The hidden-notification-title cross-language check is raised as an owner question
(instrumentation or nothing). `test/browser/context-selection.spec.ts` splits across `journeys/notifications`, `inbox`,
`settings`, `camera-photos`.
