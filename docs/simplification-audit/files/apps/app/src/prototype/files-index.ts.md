# apps/app/src/prototype/files-index.ts
- Lines: 110 | Role: Device-local Files "Recent" index (`alpha.files.recent.v1`) and last-open selection (`alpha.files.open.v1`) in localStorage, plus file type labels, query matching and sort comparators. | Verdict: SIMPLIFY + MOVE to `apps/app/src/runtime/files-index.ts`
- Importers: `selection-adapter.ts:11` and `scan-pdf.ts:4` (both only `filesIndex`; methods used: `list`, `has`, `record`, `remove`, `open`, `setOpen`).
  Text/path pins: `specs/quint/application/manifest.json:7311-7333` (FilesRecentIndex.qnt pins `createFilesIndex`, `recentKey`, `record`, `revokeTree`, `RECENT_LIMIT` in this path); `specs/quint/refinement/application/files-recent-index.mjs` (drives `revokeTree` and `kind:'tree'`), `specs/quint/refinement/services/scan.mjs`, `specs/quint/refinement/services/system-picker-visibility.mjs`; `test/files-index.test.mjs` (strips types and evals, T2), `test/scan-document-drafts.test.mjs`, `test/scan-review-pdf-errors.test.mjs`, `test/selection-ask-readiness.test.mjs`, `test/quint-files-recent-index.test.mjs`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 73-110 | A7 | `words`, `typeLabel`, `matchesFileQuery`, `SortMode`, `SortableEntry`, `collator`, `compareFilesEntries`, `sortLabel` have no product importer: `git grep` finds them only in `test/files-index.test.mjs` (`model.js:3730 sortLabel` is an unrelated value key; `note-source-adapter.ts:35` has its own `typeLabel` map). They belonged to the Files tree view removed in `ba6fe9e70` | Delete lines 73-110 and the matching cases in `test/files-index.test.mjs` | None |
| 2 | 5, 9, 28, 47, 54-56, 57, 62-68 | A2 / A7 | The `'tree'` kind is never recorded: the only `record` callers are `scan-pdf.ts:40` (`'scan-pdf'`) and `selection-adapter.ts:118,198`, whose `accept(…, recent={kind:'selected'})` is always called with three arguments (`main.tsx:124`, `selection-adapter.ts:133,168`). `renameTree`, `revoke`, `revokeTree`, `treeId`, the tree branch of `recentKey` and of `same` (47) are unreachable. The tree writer (`files-tree-adapter.ts`) was deleted in `ba6fe9e70`, before the 2026-11-10 package rename, so no `alpha.files.recent.v1` row of kind `tree` can exist in the new package | Delete `'tree'` from `RecentKind`/`kinds`, `treeId`, `renameTree`, `revoke`, `revokeTree`, the tree branches at 28 and 47, and `selection-adapter.ts:194`'s `{kind:'tree';treeId:string}` alternative. Update FilesRecentIndex.qnt, its manifest symbols (`revokeTree`) and `files-recent-index.mjs` in the same change | Medium: formal model and harness change; persisted format for `selected`/`scan-pdf` rows is unchanged |
| 3 | 13-14 | A7 (export) | `filesIndexKey` exported only for tests/harness; `filesOpenKey` exported with no importer | Unexport `filesOpenKey`; keep `filesIndexKey` only if the harness keeps needing it | None |
| 4 | 27 | B2 / D7 | `defaultStore(){try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{…}}` and the `memory`/`openMemory` fallbacks exist so the singleton `filesIndex` (71) can be created when Node imports the file | Keep the try/catch (localStorage access can throw when site data is blocked — specified fallback). Drop the `typeof` once Node tests stop importing the module bare | Low |
| 5 | 33-36, 60-61 | B1 | `catch{return [];}` on parse, `catch{/* Recent is a convenience… */}` on write, `catch{return null;}` on open | Keep; they are documented convenience fallbacks for storage | None |
| 6 | 19-26 | B3 | `clean()` re-validates every row read from storage (key length, kinds, statuses, id regex) and is also applied to rows this module builds (`record` 43, `renameTree` 55) | Keep for reads (storage is a trust boundary); in `record` build the row directly — inputs come from typed in-process callers — and only clamp `name`/`mimeType` | Low |
| 7 | 24, 60 | C3 | Opaque-id regex `/^[A-Za-z0-9:_-]{1,100}$/` twice here, and similar in `context-selection.ts:13 OPAQUE` | One `isOpaqueId` helper | None |
| 8 | 1-110 | D11 | Pure storage/domain module under `prototype/` | Move to `apps/app/src/runtime/files-index.ts` (research §5 "Files in the wrong place"); update two importers, the manifest path and harness paths | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `RecentKind`, `RecentFile` | type | 5-11 | none | stays |
| `Store` | type | 12 | `Pick<Storage,…>` store types in other runtime stores (research C4 durable stores) | shared `StorageLike` type in `apps/app/src/lib/` |
| `clean` | helper | 19-26 | none | stays |
| `defaultStore` | helper | 27 | localStorage accessors with try/catch in many runtime stores | shared `safeLocalStorage()` |
| `typeLabel` | helper | 74-86 | `note-source-adapter.ts:35` `typeLabel` map (different labels) | delete (#1) |
| `collator`/`compareFilesEntries`/`matchesFileQuery`/`words`/`sortLabel` | helper | 73-110 | none live | delete (#1) |

## Proposed end state
~60 lines in `runtime/files-index.ts`: `RecentFile` (kinds `selected` and `scan-pdf`), `clean`, `recentKey`, `createFilesIndex` with `list/has/record/remove/open/setOpen`, and the `filesIndex` singleton. Keys `alpha.files.recent.v1` / `alpha.files.open.v1` and their JSON row shape stay byte-identical.

## Verification
`test/files-index.test.mjs` (trim), `test/quint-files-recent-index.test.mjs` + FilesRecentIndex.qnt (edit model for removed tree kind), `test/scan-document-drafts.test.mjs`, `test/scan-review-pdf-errors.test.mjs`, `test/selection-ask-readiness.test.mjs`, Quint services harnesses `scan.mjs`/`system-picker-visibility.mjs`, `npm run verify`.
