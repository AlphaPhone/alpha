# test/browser/files-bulk.spec.ts
- Lines: 84 | Kind: Playwright, chromium, dev mode. Mostly a real UI journey (select mode, Move to, Trash, Restore, Empty, Share) seeded through in-page `registerPlugin('AlphaFiles')` (P2). 2 tests are module-in-page on `BrowserFiles` / `fileArchive` (T6) (s11/r62). It spawns `python3` to read zips | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: bulk select → move together → delete to Trash → restore → Empty only after confirming, persisting across reload. A move into a folder with the same name keeps both (`a (1).txt`). A file saved by another flow appears in the open folder. Batch rollback on stale revision, collision or nonempty folder. Saving a folder keeps nested Unicode paths and empty directories in the downloaded zip. Dot-path names are rejected. Share never silently downloads (supported, unsupported, cancelled), and a pending share chooser keeps the selection busy and dispatches once. Duplicates: `dev-files.spec.ts` (file mutation races). Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 44, 73 | C3 / A7 | `zipJson` is declared and never used; the same `python3 -c 'import zipfile…'` one-liner is inlined twice instead. | One helper `readZip(bytesOrPath)` in `harness/files.ts`. Prefer a Node zip reader already in `devDependencies` over a `python3` spawn (a hidden CI dependency). | none |
| 2 | 4 | A8 | "Files browser (PLAN section 4)" points at a non-existent PLAN. | Delete the reference; say what the block covers. | none |
| 3 | 39-41 | T6 | "stale revisions, collisions and nonempty folders roll back the entire batch" calls `AlphaFiles.changeMany` directly. It tests the browser stand-in (`browser/files.ts`), not the Android storage plugin. | Delete, unless the browser Files implementation is a product path (it is registered by `browser/register.ts`; owner question Q-12-3). | Low |
| 4 | 46-54 | T6 | Dot-path rejection constructs `BrowserFiles` and calls `fileArchive` directly. | Delete the `BrowserFiles` half. The archive-path guard (`../`, absolute, drive, backslash, `//`) is a real safety rule of `file-archive.ts`: keep it as one case in `test/browser/storage-contract.spec.ts`, or as a host integration test that imports the module. | Medium. It is the only check of zip path traversal. |
| 5 | 60-61, 79 | — | `navigator.share/canShare` are stubbed. That is the platform boundary, so it is acceptable. | Keep, through a `harness.share` fake. | none |
| 6 | 9, 28, 36 | P2 | Seeding through `registerPlugin` in the page. | Use the harness file seed. | none |

## Proposed end state
A "bulk and share" block in `journeys/files.spec.ts`: the select/move/Trash/restore/Empty journey, same-name move,
live folder update, nested-folder zip save, three share modes and a pending share. Seeding goes through the harness
and one zip-reading helper is shared. The two module-level tests go (the archive path guard moves to the storage
contract spec).
