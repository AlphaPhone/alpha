# Chunk app-16 — prototype: phone/prototype/scan CSS, Photos, reminders, scan dialogs, selection

Per-file reports: `docs/simplification-audit/files/apps/app/src/prototype/<file>.md`.

## Files
| File | Verdict | Lines now | Est. lines after |
|---|---|---|---|
| apps/app/src/prototype/phone.css | SIMPLIFY, then SPLIT per view | 995 | ~900 (before split) |
| apps/app/src/prototype/photo-library-adapter.ts | SIMPLIFY (small) | 187 | ~170 |
| apps/app/src/prototype/photo-viewport.ts | KEEP (tiny cleanup), MOVE with Photos | 87 | ~84 |
| apps/app/src/prototype/prototype.css | SIMPLIFY | 201 | ~90 |
| apps/app/src/prototype/reminder-adapter.ts | SIMPLIFY (one operation runner) | 497 | ~400 |
| apps/app/src/prototype/scan-correction-review.ts | SIMPLIFY (shared scan dialog shell) | 31 | ~25 logical |
| apps/app/src/prototype/scan-dialog.css | SPLIT (video editor out) + SIMPLIFY | 105 | ~70 (+25 moved) |
| apps/app/src/prototype/scan-document.ts | SIMPLIFY | 131 | ~115 |
| apps/app/src/prototype/scan-event-review.ts | SIMPLIFY + absorbs scan-event.ts | 32 | ~45 (incl. merged code) |
| apps/app/src/prototype/scan-event.ts | MERGE into scan-event-review.ts | 19 | 0 |
| apps/app/src/prototype/scan-link-review.ts | KEEP (minor) | 28 | ~26 |
| apps/app/src/prototype/scan-page-camera.ts | SIMPLIFY | 73 | ~65 |
| apps/app/src/prototype/scan-pdf.ts | SIMPLIFY (picker counter out) | 42 | ~32 (+6 moved) |
| apps/app/src/prototype/scan-review.ts | SIMPLIFY | 63 | ~58 |
| apps/app/src/prototype/scan-searchable-review.ts | SIMPLIFY | 30 | ~27 |
| apps/app/src/prototype/scan-text-layer.ts | DELETE | 1 | 0 |
| apps/app/src/prototype/selection-adapter.ts | SPLIT + SIMPLIFY | 241 | ~200 (two files) |
| **Total** | | **2,763** | **~2,310** |

Physical line counts for the scan `.ts` files will rise after the formatter (D8); estimates are statement-dense lines.

## Local types and helpers
| Name | Kind | File:line | Twins | Proposed home |
|---|---|---|---|---|
| `button(label,action)` | helper | scan-correction-review.ts:14, scan-document.ts:38, scan-page-camera.ts:24 and :59, scan-searchable-review.ts:15, scan-review.ts:27 | video-edit-review.ts:17, browser/calendar-editor-draft.ts:20 | `prototype/scan-dialog.ts` `scanButton(short,action,{label,icon,primary})` |
| dialog lifecycle (`finish`, back/pagehide/visibility listeners, previous focus, `.os` append, content region "Review details") | helper | scan-correction-review.ts:23, scan-document.ts:95, scan-page-camera.ts:25,60, scan-review.ts:44, scan-searchable-review.ts:17 | source-review-dialog.ts:4 `openReview`, video-edit-review.ts, browser-camera.ts | `openScanDialog()` in `prototype/scan-dialog.ts` (or generalise `openReview`) |
| `error instanceof Error?error.message:fallback` | helper (inline) | scan-correction-review.ts:25,27; scan-document.ts:51,67; scan-searchable-review.ts:19-20,28; scan-review.ts:61; scan-page-camera.ts:42 | camera-adapter.ts (8), agent-adapter.ts (6), workflow-authoring.ts (4), sms-adapter.ts (3) … | `apps/app/src/lib/error-text.ts` |
| export failure mapping | helper | scan-pdf.ts:20 `scanPdfFailure` | inline copies scan-searchable-review.ts:19, scan-document.ts:110 | scan-pdf.ts |
| amber "warn" dot | const (inline style, `#f5a524`) | scan-document.ts:92, scan-event-review.ts:7,13 | phone.css:33-35 `.settings-dot[data-dot=warn]` | `.alpha-status-dot` CSS class |
| "On device" chip | const (inline style) | scan-review.ts:23, scan-searchable-review.ts:13 | — | shared builder + `.scan-on-device` |
| object-URL bookkeeping | helper | scan-document.ts:40-42 | scan-searchable-review.ts:14,17; scan-review.ts:41; scan-correction-review.ts:10,15 | `objectUrls()` in scan dialog module |
| `ReviewResult` | type | scan-searchable-review.ts:9 | `{status;message}` scan-pdf.ts:39 | `ScanExportResult` in scan-pdf.ts |
| `ScanEventDraft`, `calendarDraft` | type/helper | scan-event.ts:5,7 | calendar form literal reminder-adapter.ts:22, calendar draft adapters | scan-event-review.ts now; `CalendarFormDraft` later |
| SHA-256 hex (`bindingHash`) | helper (inline ×3) | reminder-adapter.ts:256,378,428 | browser/calendar.ts:50,242; browser/deletions.ts:20; browser/hosted-results.ts:15; browser/workflow-notices.ts:13; browser/workflow-trigger-runtime.ts:15 | `apps/app/src/lib/sha256.ts` `sha256Hex` |
| journaled reminder operation flow | helper (inline ×3) | reminder-adapter.ts:234-279, 360-401, 404-453 | delete flow 458-493 | `runReminderOperation` (adapter-local or `runtime/reminder-operations.ts`) |
| pending-operation-by-target lookup | helper (inline ×4) | reminder-adapter.ts:246,371,421,466 | — | `runtime/reminder-deletions.ts` `pendingFor(target)` |
| `Bag` | type | reminder-adapter.ts:13 (`any`), selection-adapter.ts:14, photo-library-adapter.ts:14 (unused) | 45+ files (C1) | `prototype/shell-types.ts` |
| `Selection` | type | selection-adapter.ts:15 | other local `Selection` types (C1) | rename `SelectedDocument` |
| `Binding`, `Point` | type | photo-viewport.ts:1-5 | other `Binding` types (C1) | export `PhotoViewportBinding` |
| numeric clamp | helper (inline) | photo-viewport.ts:21,27,51; scan-correction-review.ts:21 | — | local or `lib/math.ts` |
| granted-URI rule | helper (inline ×3) | selection-adapter.ts:19,90,140 | camera-adapter.ts media preview | `grantedUri()` in selection module |
| source MIME allow-list | const ×2 | selection-adapter.ts:148,169 | runtime/inbox-attachment.ts rules | `SOURCE_MIME_TYPES` |
| Recent record + release evicted | helper ×3 | selection-adapter.ts:118,198; scan-pdf.ts:40 | — | `files-index.ts` |
| `filesIndex.list().find(selectionId)` | helper ×3 | selection-adapter.ts:57,109,117 | — | `files-index.ts` `findBySelection` |
| `alpha-selected-context` dispatch | helper ×3 | selection-adapter.ts:55,62,107 | listeners elsewhere | `publishSelectedContext` |
| plugin typings `AlphaMailAttachments`, `AlphaFiles`, `AlphaNoteDocuments` | type (C2) | selection-adapter.ts:5,221,236; scan-pdf.ts:6 | inbox-cloud-adapter.ts:15, inbox-drafts.ts:8, note-source-adapter.ts:18, camera-adapter.ts:102, notes-document-adapter.ts:5, runtime/native-recovery-backup.ts:14, browser/storage-usage.ts:2, startup-permissions.tsx:26 | one typed module per plugin |
| `(e as {code?:string})?.code` | helper ×2 | photo-library-adapter.ts:113,145 | selection-adapter.ts:148 and other adapters | `runtime/plugin-error.ts` |
| system-picker counter | const/helpers | scan-pdf.ts:27-32 | — | `runtime/system-picker.ts` |
| visually-hidden CSS | const ×4 | phone.css:38,744,935,995 | — | one `.sr-only` |
| mask-icon CSS | const ×6 | phone.css:48,589,676,905,980; scan-dialog.css:57 | — | `.alpha-mask-icon` |
| dialog skin CSS | const ×5 | scan-dialog.css:1-16; phone.css:173,203(dead),213,779 | — | `.alpha-dialog` base |
| spinner keyframes | const ×2 | phone.css:170 `note-transcribing`, 936 `alpha-voice-connect-spin` | — | one `alpha-spin` |
| Public Sans `@font-face` ×15 | const | prototype.css:48-183 | — | 3 range blocks |
| `.os` theme tokens | const | prototype.css:3 | product/alpha-product.ts `mobileShellThemeVariables` | product record only |

## Delete candidates
| Item | Evidence | Confidence |
|---|---|---|
| `scan-text-layer.ts` (1-line `export *` shim) | 3 importers, all `import type {ScanTextLine}` | High |
| `scan-event.ts` re-exports `suggestScanEvent`, `ScanEventContext` | `ScanEventContext` 0 importers; `suggestScanEvent` only `test/scan-event.test.mjs` identity check | High |
| phone.css 841-857 (two pasted copies of `.maps-chat-card`/`.maps-chat-choice`) | byte-identical to 802-808 | High |
| phone.css 26-30 `.voice-overlay` | `git grep voice-overlay\|dialog-backdrop`: 0 outside file (apps, test, specs, android, `.eliza/client-features`) | High |
| phone.css 202-211 `.alpha-map-share*` | `git grep map-share`: 0 | High |
| phone.css 332-337 `.app-header-action-*`, `[data-alpha-header-icon-action]`, `.app-header-context` | `header-action`, `alphaHeaderIconAction`, `header-context`: 0 | High |
| phone.css 341-345 `[data-alpha-notes-rec-clock]` | `notes-rec-clock`/`alphaNotesRecClock`: 0 | High |
| phone.css 558-564 `.alpha-camera-tools` | `camera-tools`: 0 | High |
| phone.css 573-578 `[data-alpha-notes-cards]`, `.note-card`, `.note-card-item` | `notes-cards`, `alphaNotesCards`, `note-card`: 0 | High |
| phone.css 389-392 duplicate of line 382 | identical rule text | High |
| phone.css 7 cutout rule | subsumed by line 258 | High |
| prototype.css 4 `.al` | no `al` class in template/model/TS/upstream | High |
| prototype.css 45 `#stage` | no `stage` id anywhere | High |
| prototype.css 200-201 `.alpha-note-speech-control` | `note-speech-control`: 0 | High |
| prototype.css 2, 44 `body`/`html,body` rules | fully overridden by `phone.css:1` (imported later, same specificity) | High (only in-page test harnesses that import prototype.css alone see a difference) |
| photo-library-adapter.ts:14 `type Bag` | single occurrence | High |
| photo-library-adapter.ts exports `describeLibraryChange`, `deviceLibraryAvailable` (export keyword only) | no importer outside file | High |
| scan-review.ts:42,56 `pdfDisclosure` | created hidden, never shown/filled | High |
| scan-correction-review.ts:9,29 `help` paragraph | created hidden, never shown/filled | High |
| reminder-adapter.ts:27 `events` alias, :486 count refresh duplicated by :490 | pass-through / immediate repeat | High |
| scan-pdf.ts `export` on `createScanPdf` | no product importer; Quint drivers and specs only | Medium |

## Cross-file actions
1. **Shared scan dialog shell** (`prototype/scan-dialog.ts`: `openScanDialog`, `scanButton`, `errorText`, on-device chip, object-URL helper, `data-scan-child` marker): `scan-correction-review.ts`, `scan-document.ts`, `scan-page-camera.ts`, `scan-review.ts`, `scan-searchable-review.ts` (+ optionally `video-edit-review.ts`, `browser-camera.ts`); replaces aria-label lookups in `scan-document.ts:106` and `scan-review.ts:45`. Update `specs/quint/services/manifest.json` symbol entries (`visibilitychange`, `systemPickerActive`, `busy`, `corrected`, `clearPreview`, `retake`…) if text moves, the Quint anchors in `specs/quint/refinement/services/scan-review-dialogs.mjs` (`  return dispose;`, `if(attempted||!field.value.trim())return;`, `  void(async()=>{for`), and the source transplant `test/scan-page-camera.test.mjs`.
2. **Merge `scan-event.ts` into `scan-event-review.ts`**: `scan-review.ts:4`, `test/scan-event.test.mjs`, `test/scan-all-day-draft.test.mjs`, `test/support/feature-parity.mjs:413`.
3. **Delete `scan-text-layer.ts`**: `scan-document.ts:4`, `scan-pdf.ts:2`, `scan-searchable-review.ts:7`, `specs/quint/services/manifest.json:909`, `test/support/feature-parity.mjs:419`.
4. **Move system-picker counter to `runtime/system-picker.ts`**: `scan-pdf.ts`, `scan-document.ts`, `scan-review.ts`, `scan-searchable-review.ts`, `camera-adapter.ts`; `specs/quint/services/manifest.json` symbol paths (`systemPickers`, `systemPickerActive`, `duringSystemPicker`), `specs/quint/refinement/services/system-picker-visibility.mjs`, `test/quint-system-picker-visibility.test.mjs` (rewrites `prototype/scan-pdf.ts` text), `specs/quint/refinement/application/photos-window.mjs`, `specs/quint/services/scan-source-conformance.mjs`, `test/camera-preview-recovery.test.mjs`.
5. **Use `scanPdfFailure` everywhere**: `scan-pdf.ts`, `scan-searchable-review.ts:19`, `scan-document.ts:110`.
6. **`sha256Hex` helper**: `reminder-adapter.ts` (×3), `browser/calendar.ts`, `browser/deletions.ts`, `browser/hosted-results.ts`, `browser/workflow-notices.ts`, `browser/workflow-trigger-runtime.ts`; vm-transplant harnesses `scripts/test-reminder-time-flow.ts`, `test/scanned-calendar-handoff.test.mjs`, `test/calendar-view-rules.test.mjs` strip imports and must inject it (or be retired, T2).
7. **Reminder operation runner + `pendingFor`**: `reminder-adapter.ts`, `runtime/reminder-deletions.ts`; Quint `reminder-adapter-fixture.mjs` (literal `let tapBusy = false, tapRequested = false, tapInteraction = 0;`), `test/quint-reminder-decision.test.mjs` (`if (createdInput && !dispatched)`), `test/quint-reminder-intents.test.mjs` (`if (created && !dispatched)`), `test/quint-reminder-refresh.test.mjs`, `specs/quint/application/manifest.json` symbol names.
8. **Rename reminder "deletion" journal to "operation" journal**: `runtime/reminder-deletions.ts`, `reminder-adapter.ts`, `agent-adapter.ts:851-855`, `browser/development-actions.ts`, manifest symbols `acknowledgeReminderDeletion`, `discardUndispatchedReminderDeletion`.
9. **Locale-time in reminder-adapter**: `reminder-adapter.ts:183,358,412` + remove `'prototype/reminder-adapter.ts'` from `test/locale-time-usage.test.mjs` pending set in the same commit.
10. **`surfaceInfo` type**: add `reminderTodoVersion?:1` in `apps/app/src/daily.ts:58`; drop the cast at `reminder-adapter.ts:117`.
11. **Drop `?.()` on always-installed calendar form hooks**: `reminder-adapter.ts:225,231,277,330`; installers `canonical-calendar-drafts.ts:88-105`; vm harness stubs in `scripts/test-reminder-time-flow.ts`, `test/scanned-calendar-handoff.test.mjs`.
12. **Typed plugin modules**: `AlphaMailAttachments` (selection-adapter.ts:5, inbox-cloud-adapter.ts:15, inbox-drafts.ts:8, note-source-adapter.ts:18, camera-adapter.ts:102, runtime/native-recovery-backup.ts:14, browser/simulated-inbox.ts, browser/simulated-messages.ts), `AlphaFiles` (selection-adapter.ts:221,236, browser/storage-usage.ts:2, startup-permissions.tsx:26, browser/register.ts:27), `AlphaNoteDocuments` (scan-pdf.ts:6, notes-document-adapter.ts:5).
13. **Files Recent helpers** (`findBySelection`, `recordAndRelease`): `files-index.ts`, `selection-adapter.ts`, `scan-pdf.ts`; update the exact-text sequences in `specs/quint/refinement/application/files-recent-index.mjs:12-15`.
14. **Split selection-adapter** (Files view decoration out): `selection-adapter.ts`, `main.tsx:124-127`, `test/selection-ask-readiness.test.mjs`, `specs/quint/application/manifest.json` (selection-adapter source/symbols), `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs:309`, `test/support/feature-parity.mjs:420`.
15. **CSS utilities and dead rules**: `phone.css`, `prototype.css`, `scan-dialog.css`, `media-review-controls.ts` (`.media-review-icon` → `.alpha-mask-icon`), `settings-adapter.ts`/voice files (`.settings-sr-only`, `.alpha-voice-status-hidden` → `.sr-only`), `scan-document.ts`/`scan-event-review.ts` (`.alpha-status-dot`); move video editor CSS to `video-edit-review.css` imported by `video-edit-review.ts`.
16. **Public Sans font-face collapse**: `prototype.css`; check `test/font-license.test.mjs` (Denton and Fraunces texts unchanged) and `scripts/prototype-capture.ts:156`.
17. **Splitting phone.css** changes the pinned path in `test/accessibility-coverage.test.mjs`, `test/home-inset-layout.test.mjs`, `test/auth-copy-native-cutout.test.mjs`, `test/theme-palette.test.mjs`, `test/font-license.test.mjs`, `test/product-identity.test.mjs`, `test/fixtures/modal-scrim-chromium.mjs`, `specs/quint/application/manifest.json:2781`, `specs/quint/legacy/manifest.json:609`.

## Text/path pins
- `phone.css`: `test/accessibility-coverage.test.mjs:227-262` (regex on 6 exact rules), `test/home-inset-layout.test.mjs:23` (single-line `[data-alpha-home-layout] {` + `padding-bottom`), `test/auth-copy-native-cutout.test.mjs:29` (JSDOM computed style), `test/theme-palette.test.mjs:10` (no hex), `test/font-license.test.mjs:290`, `test/product-identity.test.mjs:147`, `test/fixtures/modal-scrim-chromium.mjs:21`, `specs/quint/application/manifest.json:2781`, `specs/quint/legacy/manifest.json:609`.
- `prototype.css`: `test/font-license.test.mjs:290-310` (exact Denton `@font-face{…}` string, Fraunces blocks), `test/product-identity.test.mjs:147`; in-page imports `test/browser/helpers/native-cloud-signin.ts:16`, `test/browser/native-cloud-subscription.spec.ts:21`, `test/browser/startup-access.spec.ts:11`.
- `scan-dialog.css`: `test/theme-palette.test.mjs:10`, `test/font-license.test.mjs:290` (Denton stack), `test/browser-camera-storage.test.mjs`.
- `photo-library-adapter.ts`: `test/photo-library.test.mjs:15,170-172,217,235-236` (source slices between `'async function confirmReview'`/`'const visibleHost'` and `'const agent: LibraryAgent'`/`'mountedAgent = agent;'`, count of `port.(share|requestChange)(` = 2), `test/fixtures/photo-library-adapter.mjs` (Node import), `specs/quint/application/manifest.json:7403-7431`, `specs/quint/legacy/manifest.json:967`, `specs/quint/native/manifest.json:442`, `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs:20`, `test/support/feature-parity.mjs:21,36,407`.
- `photo-viewport.ts`: `test/photo-viewport.test.mjs:3`, `test/support/feature-parity.mjs:36,408`, legacy photos-library refinement.
- `reminder-adapter.ts`: Quint fixture literal `let tapBusy = false, tapRequested = false, tapInteraction = 0;`; mutation anchors `if (createdInput && !dispatched)`, `if (created && !dispatched)`, `generation !== this.reminderRefreshGeneration`, todo-attempt `reuse`; ~45 manifest symbol names; vm transplants `scripts/test-reminder-time-flow.ts:25`, `test/scanned-calendar-handoff.test.mjs:182`, `test/calendar-view-rules.test.mjs:73-82`; regex `test/native-deletion-admission.test.mjs:47`; `test/locale-time-usage.test.mjs:17` pending list; fixtures `reminder-open-intent.mjs`, `retained-reminder-tap.mjs`; `test/support/feature-parity.mjs:409`.
- `scan-*.ts`: `specs/quint/services/manifest.json:905-909, 4592-4762` (symbols per file), `specs/quint/refinement/services/scan-review-dialogs.mjs:13-36` (anchors), `specs/quint/refinement/services/scan.mjs:20-29`, `specs/quint/services/scan-source-conformance.mjs:8,29`, `specs/quint/refinement/services/system-picker-visibility.mjs:11`, `specs/quint/refinement/application/files-recent-index.mjs:26`, `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs:13`, `specs/quint/refinement/legacy/camera-session.mjs:14-15`, `test/scan-review-pdf-errors.test.mjs:4-8,59` (import-specifier string replacement), `test/scan-page-camera.test.mjs:21` (transplant), `test/scan-document-drafts.test.mjs:14`, `test/quint-files-recent-index.test.mjs:12,16`, `test/quint-system-picker-visibility.test.mjs:16`, `test/scan-event.test.mjs`, `test/scan-all-day-draft.test.mjs`, `scripts/prepare-client-features.ts` + `test/client-feature-preparation.test.mjs` (plugin-native-camera scan-document path), `test/support/feature-parity.mjs:410-419`, ~12 `test/browser/scan-*.spec.ts`.
- `selection-adapter.ts`: `specs/quint/refinement/application/files-recent-index.mjs:12-22` (four exact source sequences), `specs/quint/application/manifest.json:961,1739,1810,7312-7345`, `specs/quint/legacy/files-browser/check-files-browser-refinement.mjs:309`, `test/selection-ask-readiness.test.mjs:19` (bundle with stubs), `test/support/feature-parity.mjs:420`.

## New patterns
- **NEW-a: Label-text lookups for nested dialogs.** Behaviour keyed on a visible aria-label string (`dialog[aria-label="Capture document page"]`, `"Review scan document"`) — a variant of D10 for DOM queries; renaming copy silently breaks Back handling. Treatment: data attribute set by the dialog factory.
- **NEW-b: Inline-style hex fallbacks escape the palette test.** `var(--acc,#0000ff)`, `#f5a524`, `#d70015`, `#eee`, `#aaa`, `#111`, `paper:'#FFFFFF'` in TS files; `test/theme-palette.test.mjs` only scans CSS/HTML/model.js, and `prototype.css` is not in its list. Treatment: move to CSS classes; extend the test FILES list (or audit bundle) once moved.
- **NEW-c: Bare locale time formatting tracked by a "pending" allow-list** (`test/locale-time-usage.test.mjs`): converting a file requires editing the test's list in the same commit.
- **NEW-d: Dead CSS for removed markup.** ~45 lines of selectors with no element/attribute anywhere (voice overlay, map share, camera tools, notes cards, header icon actions). Treatment: periodic selector-usage check (grep every class/`data-*` selector against apps + `.eliza/client-features`).

## Owner questions
1. `scan-page-camera.ts:41` status reads "Captured Nothing is saved to Photos." — change to "Captured. Nothing is saved to Photos."?
2. `phone.css` 538 vs 831: two conflicting rule sets for camera modes at large text in portrait (padding 16px vs 8px, button padding) — which values are intended?
3. `prototype.css:3` `.os{--bg:#FFFFFF;…--acc:#0000FF…}` hard-coded tokens: does the runtime always set theme variables on `.os` before first paint (so these can go and the file can join the theme-palette test)?
4. Rename the reminder "deletion" journal (`retainReminderDeletion` etc.) to an "operation" journal, given it carries update/complete/snooze too? It touches Quint manifest symbol names.
5. `reminder-adapter.ts:116` `Capacitor.getPlatform()==='web' && !Capacitor.isPluginAvailable('DailyApps')` and `.catch(()=>null)` on `DailyApps.addListener`: which web/dev builds lack DailyApps — can these guards go?
6. Scan link cap (`links.length===10`) is re-stated in Alpha: should plugin-files export the limit (upstream change)?
7. Keep the Node-only `test/fixtures/photo-library-adapter.mjs` (forces `typeof document` guards in product code) or move that coverage to a browser spec?
