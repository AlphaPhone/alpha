# android/app/src/androidTest/java/ai/alphacompute/alphaphone/StorageCategoriesInstrumentedTest.java
- Lines: 54 | Role: every Files Browse category id is answered by upstream `StorageCatalog.category`/`count`; Downloads lists direct files newest first. | Verdict: SIMPLIFY (or move upstream)
- Importers: none. Registry `StorageCategories: { secondaryUser: true }` (`scripts/android-instrumentation.ts:249`); `scripts/owner/emulator-campaign-check.ts:47,57`. Text/path pins: **`test/files-browser.test.mjs:261-262` reads this file and asserts the text `for(String id:StorageCatalog.CATEGORY_IDS)` (T1)**.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 26-53 | T5 | Only upstream `ai.eliza.plugins.filesystem.browser.StorageCatalog`/`StorageBrowser` are called, with a temp root; Alpha's `AlphaFilesPlugin` wiring is not exercised. | Owner question: move to the upstream filesystem plugin; if kept, call through `AlphaFilesPlugin` (`StorageCatalog.category(resolver(),primaryBrowser(),…)`) so the test covers Alpha's root/trash choice. | Low. |
| 2 | — | T1 | `test/files-browser.test.mjs:261-262` regex-pins line 29's loop text. | Delete that assertion (the instrumentation itself proves the loop). | None. |
| 3 | 24 | NEW (minor) | `getBytes("UTF-8")` string charset. | `StandardCharsets.UTF_8`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `tempRoot`, `file` | helper | 23-24 | many temp-file helpers in androidTest | keep |
| `TRASH_FOLDER` | const | 22 | `StorageLegacyAccessInstrumentedTest:39` uses `".Trash-alpha"` | keep |

## Proposed end state
~50 lines unchanged in behaviour (or deleted here and run upstream); the host text pin removed.

## Verification
`node scripts/android-instrumentation.ts --classes StorageCategories` (disposable user); `node --test test/files-browser.test.mjs` after removing the pin.
