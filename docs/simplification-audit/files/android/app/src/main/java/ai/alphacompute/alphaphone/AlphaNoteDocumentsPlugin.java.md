# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteDocumentsPlugin.java
- Lines: 69 | Role: Capacitor `AlphaNoteDocuments` bridge for SAF text export, scanned-PDF export and (test-mocks only) text import, over upstream `DocumentExport`/`DocumentDestinations`. | Verdict: SIMPLIFY (small)
- Importers: `MainActivity.java:351`. Renderer: `apps/app/src/prototype/notes-document-adapter.ts:5,22` (import gated `if(!testMocksEnabled)return`), `apps/app/src/prototype/scan-pdf.ts:6`, `apps/app/src/runtime/browser-note-documents.ts`. Text/path pins: `test/native-plugin-teardown.test.mjs`, `test/plugin-worker-guard.test.mjs:30` (`worker`), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-42, 45, 62 | C3 | `write(call,uri,content,exported,unverified)` is always called with the same two strings: `"Saved."`, `"Save not confirmed. Check the file before trying again."`. | Drop the two parameters; `write` owns its copy (unchanged text). | none |
| 2 | 21 | C3 | `result(status,message)` = `AlphaMailAttachmentsPlugin.saveResult` = upstream `DocumentFolderTree.result`. | Use `DocumentFolderTree.result`. | none |
| 3 | 56 | C3 | `DISPLAY_NAME` cursor query (twin `AlphaMailAttachmentsPlugin.java:61,141`). | `SelectedDocumentAccess.displayName(...)`. | none |
| 4 | 26, 53-59 | D6, D5 | `importText` refuses unless `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`; the `imported` callback (7 lines) is reachable only in test-mocks builds; renderer hides the button outside test mocks. | Acceptable as is (compile-time constant, R8 can drop the branch). If the owner wants zero dev code in main, move import to a test-mocks subclass. | none |
| 5 | 28 | D3, P8 | `AlphaDevicePlugin.shareForeground(getActivity())` — cross-plugin static call for a foreground predicate. | `OwnerSurface.check(...)` (shared util). | low |
| 6 | 20 | D8 | Three field declarations on one line. | Formatter. | none |
| 7 | 29-30, 34-35 | B1 | Validation by `catch(Exception)` around `DocumentExport.utf8`/`DocumentBytes.pdf`; maps to specified copy. | Keep (boundary validation with product copy). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `result` | helper | 21 | `AlphaMailAttachmentsPlugin.saveResult`, `DocumentFolderTree.result` | `DocumentFolderTree.result` |
| `run(call,operation)` | helper | 52 | `PluginWorkers` wrappers in other plugins | base-plugin helper |
| display-name query | inline | 56 | `AlphaMailAttachmentsPlugin` | `SelectedDocumentAccess.displayName` |

## Proposed end state
~62 lines: `write` without copy parameters, shared result/display-name helpers, `OwnerSurface` check. Behaviour and copy unchanged.

## Verification
Notes export/scan-PDF Playwright journeys, `test/plugin-worker-guard.test.mjs`, `test/native-plugin-teardown.test.mjs`, Android build; manual SAF export on an emulator (picker flows are not covered by host tests).
