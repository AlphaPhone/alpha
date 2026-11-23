# apps/app/src/prototype/selection-adapter.ts
- Lines: 241 | Role: "Selected document" adapter: accepts native picker grants (Files/Photos), restores the open selection, renders text/PDF/media previews into the Files and Photos views, rename/share/open/forget, Ask Alpha (content question with optional source link) and attach-to-email; also installs the upstream Files browser adapter and decorates Files sort menu/media collection. | Verdict: SPLIT (selected-document preview vs Files view decoration) + SIMPLIFY
- Importers: `apps/app/src/main.tsx:61,124-127` (`installSelectedDocumentAdapter`, its return value forwarded as `onSelection` via a forward-declared `let selected`), `data-adapter.ts` (comment/order). Bundled by `test/selection-ask-readiness.test.mjs:19`.
- Text/path pins: `specs/quint/refinement/application/files-recent-index.mjs:12-22` asserts the adapter still contains two exact source strings: `if (forget) { const row = filesIndex.list().find(item => item.selectionId === id); if (row) filesIndex.remove(row.key); }`, `if (forget || !filesIndex.has(id)) release(id);`, plus the `if (recent) for (const evicted of filesIndex.record({ ...recent, name: result.name || 'Selected document', mimeType: result.mimeType || 'application/octet-stream', selectionId: result.selectionId })) if (evicted !== result.selectionId) release(evicted);` and `filesIndex.setOpen(result.selectionId);` sequences (T10 — any reformat breaks it); `specs/quint/application/manifest.json:961,1739,1810,7312-7345` symbols `filesIndex, forgetSelected, accept`; `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs:309`; `test/support/feature-parity.mjs:420`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 221, 236 | C2 | Native plugins typed at call sites: `registerPlugin<{readSelected…;retainSourceReference…}>('AlphaMailAttachments')` (line 5, sitting between imports), `registerPlugin<FilesStoragePort<NativeResult>>('AlphaFiles')` (221) and again `registerPlugin<{storageSaveMedia…}>('AlphaFiles')` inside a render callback (236) with a different type. `AlphaMailAttachments` is also typed separately in `inbox-cloud-adapter.ts:15`, `inbox-drafts.ts:8`, `note-source-adapter.ts:18`, `camera-adapter.ts:102`, `runtime/native-recovery-backup.ts:14`, `browser/simulated-*.ts`; `AlphaFiles` in `browser/storage-usage.ts:2`, `startup-permissions.tsx:26`. | One typed module per plugin (`plugins/alpha-files.ts`, `plugins/mail-attachments.ts`); import them. | None (registerPlugin is cached). |
| 2 | 18-19, 90, 140 | C3 | Allowed-URI rule written three times: `native?uri.startsWith('content://'):uri.startsWith('blob:')` (19), `imageUri?.startsWith('file://') || (!native && …startsWith('blob:'))` (90), `uri?.startsWith('content://') || (!native && uri?.startsWith('blob:'))` (140). | `const grantedUri=(uri?:string)=>…` used by `previewMedia`, image and PDF paths (PDF keeps its `file://` case explicitly). | Low. |
| 3 | 148, 169 | C6 | MIME allow-list `['text/plain','application/pdf','image/png','image/jpeg','image/webp']` twice (source link, email). | `const SOURCE_MIME_TYPES=…` (owner in `runtime/inbox-attachment.ts` if it is the attachment rule). | None. |
| 4 | 57, 109, 117 | C3 | `filesIndex.list().find(row=>row.selectionId===id)` three times. | `filesIndex.findBySelection(id)` in `files-index.ts`. **Line 57's exact text is pinned by the Quint driver** — change the driver's sequence list in the same commit. | Medium (pin). |
| 5 | 118, 198 (+`scan-pdf.ts:40`) | C3 | "record in Recent and release evicted grants" loop written 3× across files. | `filesIndex.recordAndRelease(input, release)` or a helper in `files-index.ts`. Line 198 text is pinned by the Quint driver. | Medium (pin). |
| 6 | 55, 62, 107 | D3 | `window.dispatchEvent(new CustomEvent('alpha-selected-context', …))` ×3 (global event bus). | One `publishSelectedContext(detail|null)` function (and later a typed store). | Low. |
| 7 | 129-190 | D9 | The Files/Photos render wrapper is 60 lines: restore side effect (131-134, a native call started from render), preview building for Files (159-183, ~25 fields), Photos viewer (184-188). | Move restore into a mount/visibility hook; extract `filesPreview(selected, api)` and `photosViewer(selected, api)` builders. | Medium; `selection-ask-readiness.test.mjs`, Files browser specs. |
| 8 | 171, 177-178, 186-187 | A5 / D12 | Template-compat placeholders: `paper:'#FFFFFF'` (hex in TS), `photoSun:'none'`, `isReceipt:false,isAudio:false,isArchive:false,receipt:null,contents:[]`, `asking:false,asked:false`, and viewer stubs `tap:()=>{},down:()=>{},up:()=>{}`, `tf:'',flt:'',slide:''`, `chromeOp:1`. | Provide these defaults once in the Files/Photos view's base render (the template's default values), then pass only real fields. | Low. |
| 9 | 45, 133, 168 | B1 | `.catch(()=>{})` on restore describe (133); `catch{api.toast('Picker failed')}` (168); `release` toasts 'Reopen Files' on failure (45, specified). | 133: comment that a failed restore leaves Files closed (specified) or surface it; others keep. | Low. |
| 10 | 234 | B1 | `items.every(row=>{try{return /^Photos\/(Images|Videos)\//.test(JSON.parse(row.id)[1]);}catch{return false;}})` then `JSON.parse(row.id)[1]` again at 236. | Parse ids once into a typed path (`rowPath(row)`); the upstream Files adapter owns the id format — ideally it exposes `path`. | Low. |
| 11 | 226-239 | D11 | Files sort-menu rebuild and browser media-collection save are Files view decoration, unrelated to the selected document. | Move to a `files-view-adapter.ts` (or the upstream Files browser adapter options). | Low. |
| 12 | 14-15 | C1 | `type Bag = Record<string, any>`; `type Selection = {…}` (one of the re-declared `Selection` names). | Shell types; rename `SelectedDocument`. | None. |
| 13 | 25-28 | D2 / A8 | Install-order comment "Install after installPrototypeNativeAdapters…Forward its returned callback through the onSelection option" documents the `main.tsx:124-127` forward-reference cycle (research P3). | Resolve with the declarative adapter list (D2); then drop the comment. | — |
| 14 | 182 | — | `move: () => api.toast('Can’t move here')`, `del: () => api.toast('Delete in Android')` — user-visible copy, keep. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 14 | 45+ copies (C1) | `prototype/shell-types.ts` |
| `Selection` | type | 15 | other local `Selection` types (C1) | rename `SelectedDocument`, here |
| `previewMedia` | helper | 17-23 | URI rules at 90, 140; `camera-adapter.ts` media preview | here, built on `grantedUri` |
| `mediaRef` | helper | 38-42 | `local-speech-playback.ts` media element handling | here |
| `release` | helper | 45 | `scan-pdf.ts:40`, `scan-document.ts:31` forgetSelected best-effort | `files-index.ts` / grants helper |
| `publish` | helper | 62 | `alpha-selected-context` dispatch at 55, 107 | `publishSelectedContext` |
| `sourceFiles` plugin | const | 5 | `AlphaMailAttachments` elsewhere (`runtime/inbox-attachment.ts`?) | typed plugin module |
| sort `modes` | const | 231 | upstream Files adapter sort ids | Files view module |
| MIME allow-list | const | 148, 169 | — | `SOURCE_MIME_TYPES` |

## Proposed end state
Two files: `selected-document-adapter.ts` (~170 lines: accept/clear/restore/rename/share/PDF paging, preview builders, Ask/Email) and `files-view-adapter.ts` (~30 lines: upstream Files browser install, sort menu, media collection). Typed plugin modules, one URI rule, one MIME list, Recent helpers in `files-index.ts`, template defaults in the base view. Quint driver sequences updated with the moved/renamed text. Total ~200 lines (from 241).

## Verification
`node --test test/selection-ask-readiness.test.mjs test/files-index.test.mjs test/quint-files-recent-index.test.mjs`; Quint `files-recent-index` (sequence pins) and legacy `files-browser` refinement; `npm run test:browser` Files and Photos selection journeys; Android Files picker instrumented tests unaffected (bridge unchanged).
