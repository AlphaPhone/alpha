# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMailAttachmentsPlugin.java
- Lines: 191 | Role: Capacitor `AlphaMailAttachments` bridge: read a picked document or a permitted photo as exact bytes, open a reviewed copy read-only in a viewer, retain/open/reconcile Notes source references, and Save-to-Files of reviewed bytes. | Verdict: SIMPLIFY
- Importers: `MainActivity.java:342`; `AlphaMailPdfActivity.java:15` (`handoff(Context)`); androidTest `MailAttachmentInstrumentedTest` (`validate`). Renderer callers: `apps/app/src/prototype/{inbox-cloud-adapter.ts:15,inbox-drafts.ts:8,note-source-adapter.ts:18,selection-adapter.ts:5,camera-adapter.ts:102}`, `apps/app/src/runtime/native-recovery-backup.ts:14`, `apps/app/src/browser/simulated-inbox.ts:6`. Text/path pins: `test/note-source-references.test.mjs:28-35` (slices `@PluginMethod public void releaseSourceReferences(` … `private JSObject saveResult(` and `retainSourceReference(` … `openSourceReference(`, regex on `hash(bytes)`), `test/native-plugin-teardown.test.mjs`, `test/plugin-worker-guard.test.mjs` (`worker`), `test/support/feature-parity.mjs`, `specs/quint/native/manifest.json:1886`, `specs/quint/application/manifest.json:533`, `specs/quint/refinement/native/reviewed-copies.mjs:17`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33 | A7 | `static final int MAX_BYTES=DocumentBytes.MAX_BYTES;` — no reader (grep repo: only this declaration). | Delete. | none |
| 2 | 54-60 | D4 | Five one-line forwards to upstream `DocumentBytes`: `hash`, `validate`, `validateOpaque`, `opaqueMime`, `read`. `validateOpaque`/`opaqueMime`/`read` have no caller outside this file; `validate` is also called by `MailAttachmentInstrumentedTest:20-26`; `hash` is pinned by `note-source-references.test.mjs:33`. | Call `DocumentBytes.*` directly; delete the five forwards (7 lines); point the instrumented test at `DocumentBytes.validate`. | Low; update the test regex in the same change (or delete the source-text test per T1). |
| 3 | 103-105, 160-162 | C3 | Same decode block twice: `encoded==null||encoded.length()>7*1024*1024||!Boolean.TRUE.equals(call.getBoolean("reviewed"))` → `Base64.decode(...)`. `openReviewedAt` then validates + hashes as `reviewedBytes` does (except the opaque branch). | `openReviewedAt` calls `reviewedBytes(call)` (opaque is never set on open). Also name `7*1024*1024` (`MAX_BASE64_CHARS`). | none |
| 4 | 61, 141 | C3 | `DISPLAY_NAME` cursor query copied (also `AlphaNoteDocumentsPlugin.java:56`, `DailyAppsPlugin`). | `SelectedDocumentAccess.displayName(resolver, uri)` (or upstream helper if one exists). | none |
| 5 | 61 | D8, P4 | `readSelected` is one 1,269-character line (research P4 example). | Format; split into resolve → read → validate → result. | none (pins: none on this method) |
| 6 | 68, 114, 167 | P8 | Three inline foreground checks (`getActivity()==null||isFinishing()||isDestroyed()||!hasWindowFocus()` and `getActivity()==null||!getActivity().hasWindowFocus()`). | Use `OwnerSurface.check(activity,true)`. | low |
| 7 | 76, 93 | B1 | `catch(IOException ignored){}` when closing streams on timeout/cancel. Documented race (close on cancel). | Keep; comment once. | none |
| 8 | 190 | B1 | `try{cleanup();}catch(RuntimeException unavailable){/* load() removes leftovers on the next start. */}` | Keep (specified fallback). | none |
| 9 | 20-22 | D8 | Unused wildcard imports `java.nio.*`, `java.nio.charset.*`, `java.security.*` (no `ByteBuffer`, `Charset`, `MessageDigest` use). | Delete on formatter pass. | none |
| 10 | 95-97 | D4 | `revoke(File)` and `cleanup()` are one-line private forwards to `copies`. | Inline (`copies.revoke`, `copies.clear`). | none |
| 11 | 159 | C3 | `saveResult(status,message)` = same as `AlphaNoteDocumentsPlugin.result(status,message)` and `DocumentFolderTree.result`. | Use `DocumentFolderTree.result` (upstream) everywhere. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `MAX_BYTES` | const | 33 | `DocumentBytes.MAX_BYTES` | delete |
| `hash/validate/validateOpaque/opaqueMime/read` | helper | 54-60 | upstream `DocumentBytes` | delete (call upstream) |
| `work(call,task)` | helper | 47-49 | `AlphaHostedResultsPlugin.submit`, `AlphaGmailPlugin.submit` | base-plugin helper |
| `saveResult` | helper | 159 | `AlphaNoteDocumentsPlugin.result`, `DocumentFolderTree.result` | `DocumentFolderTree.result` |
| display-name query | inline | 61, 141 | `AlphaNoteDocumentsPlugin.java:56` | `SelectedDocumentAccess.displayName` |
| `"mail-attachments"` | const (literal) | 51, 53 | `AlphaMailFileProvider.java:9,11` | `FOLDER` const here |

## Proposed end state
~170 lines (pre-format): no forwards, one reviewed-bytes decoder, shared display-name and result helpers, formatted `readSelected`. Generation tokens, photo stream tracking, reviewed-copy lifecycle and all reject/resolve copy unchanged.

## Verification
`MailAttachmentInstrumentedTest`, `PdfViewerInstrumentedTest`, Quint `reviewed-copies.mjs`, `test/note-source-references.test.mjs` (update slice/regex), Inbox/Notes/Camera Playwright journeys, Android build.
