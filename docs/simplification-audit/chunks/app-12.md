# Chunk app-12 summary

Reports: `docs/simplification-audit/files/apps/app/src/prototype/<file>.md` for each file below.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/contacts-adapter.ts | SIMPLIFY | 159 | 150 (135 after fixture decision Q1) |
| apps/app/src/prototype/context-selection.ts | SIMPLIFY (delete dead folder-context half) | 277 | 165 |
| apps/app/src/prototype/data-adapter.ts | SPLIT + SIMPLIFY | 251 | 200 (170 after Q1) |
| apps/app/src/prototype/dc-lite.js | SIMPLIFY (keep as renderer) | 195 | 170 |
| apps/app/src/prototype/development-rail.html | MOVE to `apps/app/src/dev/` | 60 | 58 |
| apps/app/src/prototype/development-system-surfaces.html | MOVE to `apps/app/src/dev/` | 39 | 39 |
| apps/app/src/prototype/file-email-review.ts | SIMPLIFY (rebuild on `openReview`) | 47 | 35 |
| apps/app/src/prototype/files-index.ts | SIMPLIFY + MOVE to `runtime/` | 110 | 60 |
| apps/app/src/prototype/fixtures.empty.js | SIMPLIFY + MOVE (delete if Q1) | 77 | 70 (0 if fixtures leave model.js) |
| apps/app/src/prototype/fixtures.js | MOVE to `dev/fixtures/` + SIMPLIFY | 671 | 620 (with Wallet removal) |
| apps/app/src/prototype/home-cards.ts | SIMPLIFY + MOVE to `home/` | 161 | 110 |
| apps/app/src/prototype/home-overview-cards.ts | SIMPLIFY | 125 | 105 |
| apps/app/src/prototype/home-shell.ts | SIMPLIFY | 306 | 280 |
| **Total** | | **2,478** | **~2,062** (≈416 removable now/with decisions) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag = Record<string,any>` | type | contacts-adapter.ts:6, context-selection.ts:10, data-adapter.ts:8, home-overview-cards.ts:3, home-shell.ts:8 | ~60 files (research P4) | `prototype/shell-types.ts` (`ShellHost`, `ViewApi`, `ViewState`, `HomeValues`) |
| `contacts` (`registerPlugin<any>('AlphaContacts')`) | const | contacts-adapter.ts:7 | agent-adapter.ts:915 | typed `runtime/contacts-plugin.ts` |
| `PHONE`, `BUBBLE`, mail SVG path literal | const | contacts-adapter.ts:8,139,140 | model.js:41,76,77 `IC.phone/bubble/mail` | `IC` (export it) or icon names |
| `OPAQUE` regex | const | context-selection.ts:13 | files-index.ts:24,60 `/^[A-Za-z0-9:_-]{1,100}$/`; runtime/phone-context.ts | `apps/app/src/lib/opaque-id.ts` |
| `sessionMarker` (bytes→hex) | helper | context-selection.ts:52 | ~28 hex helpers in renderer (research C3) | shared hex helper |
| `createFolderRevisions` / `createCaptureRevisions` | helper | context-selection.ts:59 / :176 | each other | delete folder variant |
| `installed` WeakSet guard | const | data-adapter.ts:9 | native-adapter.ts:137-138 | delete |
| `empty` view-state table | const | data-adapter.ts:23 | per-view `state:` in model.js | view owner / dev side |
| `HOME_SOURCES_CHANGED` + direct dispatches | const | data-adapter.ts:186 | main.tsx:161,171 dispatch it themselves | `notifyHomeSourcesChanged()` in a `home/home-sources.ts` |
| `'alpha.appearance.v1'` literal | const | data-adapter.ts:183 | settings-adapter.ts (owner) | import the owner's constant |
| `NEUTRAL_HOME` | const | data-adapter.ts:211 | fixtures.js:569 `HOME_DEFAULTS` | Home owner |
| `storageAccessible`/`createStorageAccessCheck` | helper | data-adapter.ts:183 / home-cards.ts:150 | none | `runtime/` |
| `EVENTS` + 17-branch attribute renames | const/helper | dc-lite.js:7,73-89 | none | one lookup table |
| dialog scaffold (focus return, inert, theme tokens, back/visibility/pagehide) | helper (inline) | file-email-review.ts:12-28 | source-review-dialog.ts `openReview` (canonical), summary-note-review.ts:9, note-web-source-adapter.ts:14, note-source-adapter.ts:53, runtime/calendar-sync-settings.ts:205, browser/content-question.ts:9 | `openReview` |
| `SelectedFile` | type | file-email-review.ts:5 | runtime/inbox-attachment.ts review shape | `runtime/inbox-attachment.ts` |
| `Store` (`Pick<Storage,…>`), `defaultStore` | type/helper | files-index.ts:12,27 | localStorage try/catch accessors across runtime stores (research C4) | `apps/app/src/lib/storage.ts` |
| `typeLabel` | helper | files-index.ts:74 | note-source-adapter.ts:35 (different map) | delete (unused) |
| `ctIni` | helper | fixtures.js:361 | telephony-presenters.ts `initials`, upstream `overviewAttendeeInitials` | stays (dev data) |
| `presentHome*` wrappers / `Home*` type aliases | helper/type | home-cards.ts:45-74,158-161 | upstream `presentOverview*` / `Overview*` | one bound presenter object; upstream type names |
| `maskIcon` | helper | home-overview-cards.ts:6 | icon-style.ts `iconStyle`, home-shell.ts:13 `glyph`, media-review-controls.ts:5, workflow-filters.ts:19, runtime/calendar-sync-settings.ts:10, runtime/google-connection-ui.tsx:19, camera-adapter.ts:831 | `iconStyle` |
| `glyph` + inline mask string | helper | home-shell.ts:13, :296 | same as `maskIcon` | shared `maskStyle(url,size)` beside `iconStyle` |
| `INBOX_STATES` | const | home-overview-cards.ts:53 | upstream inbox card state union | import upstream |
| `HOME_EDIT_CSS` | const | home-shell.ts:17 | none | `phone.css` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Folder context path in `context-selection.ts` (14, 16-103, folder half of 248-273) + `agent-adapter.ts:682` | Only dispatcher of `alpha-folder-context` was `files-tree-adapter.ts`, deleted in `ba6fe9e70`; `git grep FOLDER_CONTEXT_EVENT\|alpha-folder-context` → this file only; `__native_tree` set nowhere; exports used only by `test/context-selection.test.mjs` | Confirmed |
| `installContextSelection` (after the above) | Only adds `p.settingsSelection`, read once at `agent-adapter.ts:683` | Confirmed (mechanical) |
| `files-index.ts:73-110` (`typeLabel`, `matchesFileQuery`, `compareFilesEntries`, `sortLabel`, `words`, `collator`, `SortMode`, `SortableEntry`) | No product importer; only `test/files-index.test.mjs` (`model.js:3730 sortLabel` is an unrelated value key) | Confirmed |
| `'tree'` kind in files-index (`treeId`, `renameTree`, `revoke`, `revokeTree`, tree branches at 28/47) + `selection-adapter.ts:194` tree param | `accept()` is always called with 3 args (default `{kind:'selected'}`); tree writer deleted before the package rename | Confirmed (needs FilesRecentIndex.qnt + harness edit) |
| `dc-lite.js:71-72` notes special cases | `primaryLabel`/`primaryIcon` produced nowhere | Confirmed |
| `data-adapter.ts:9,15-16` WeakSet guard | single call site `main.tsx:136` | Confirmed |
| `installHomeCardVisibility` + 3 `home-date-line` template blocks + `connectGoogle` + `homeShow*` checks | constants only; `homeShowDate` never true | Confirmed |
| `views.contacts.reply=()=>null` (contacts-adapter.ts:123) | `p.reply` replaced globally at `agent-adapter.ts:1939` | Confirmed |
| `home-cards.ts` aliases `CalendarCardState`, `HomeAgenda`, `briefOutcome`, `presentHomeNext`, `homeAgendaHeader`, `calendarCardState`, `presentHomeCalendar`, `attendeeInitials` | no product importer; test-only | Confirmed |
| `homeCalendarPeople`, `homeCalendarItemDescription` values (home-cards.ts:100-102, data-adapter.ts:213) | no reader | Confirmed |
| `HOME_EDIT_CSS`/`homeEditStyle` (move to CSS, not behaviour delete) | static CSS rendered as a React `<style>` each render | Confirmed |
| `LOCK_SUM` (fixtures.js:550, fixtures.empty.js:69, model.js import) | imported, never used | Confirmed |
| `HEADS` fixture + dev-rail "Incoming text" button (development-rail.html:46) | `showHeads()` is an empty stub; no template binding of heads values | Confirmed |
| `contactActs` export, `filesOpenKey` export, home-overview card builder exports | no importer outside file (tests only for the latter) | Confirmed |
| `locationMimeTypes` self-validation (`MIME_TYPE` + `every`) | validates its own literals | Confirmed |
| `data-adapter.ts:23-40,62-64` empty table and phone/messages/inbox wraps | redundant in production (fixtures already empty, views replaced); only effective in test-mocks live mode | Depends on Q1 |
| Wallet: `data-adapter.ts:30,65-69`, `WAL_*` + `COPY.wallet` in fixtures, `fixtures.empty.js:51-54` | PRD AP-13 deferred; view registered only in test-mocks | Owner decision |
| `fixtures.empty.js` as a whole | only needed while `model.js` imports seeds | Depends on Q1 |
| `mock-attention.ts` shim (imported by data-adapter.ts:2) | re-export of `model.js` | Confirmed (research P14) |

## Cross-file actions
1. **Folder context removal**: `context-selection.ts` (delete folder half + installer), `agent-adapter.ts:682-683` (drop `folderSelection`, call `settingsSelection()` directly), `main.tsx` (drop `installContextSelection` import/call), `test/context-selection.test.mjs` (drop folder tests), optionally `runtime/phone-context.ts:16,54` (`'folder'` kind, owner question), `specs/quint/application/manifest.json` source lists unchanged (file stays).
2. **Files Recent tree kind removal**: `files-index.ts`, `selection-adapter.ts:194`, `specs/quint/application/FilesRecentIndex.qnt`, `specs/quint/application/manifest.json:7311-7333` (`revokeTree` symbol), `specs/quint/refinement/application/files-recent-index.mjs`, `test/files-index.test.mjs`, `test/quint-files-recent-index.test.mjs`.
3. **Move files-index to runtime/**: importers `selection-adapter.ts`, `scan-pdf.ts`; manifest path; `specs/quint/refinement/{application/files-recent-index.mjs,services/scan.mjs,services/system-picker-visibility.mjs}`; tests `files-index`, `scan-document-drafts`, `scan-review-pdf-errors`, `selection-ask-readiness`; `test/support/feature-parity.mjs`.
4. **Home visibility constants**: delete `installHomeCardVisibility` (data-adapter.ts), `main.tsx:183` call, `template.html:35,105,4522` `home-date-line` blocks, `home-overview-cards.ts:11,60,121` checks, `inbox-cloud-adapter.ts:780` comment, `test/final-ui-lifecycle.test.mjs:14-18`.
5. **Home people visibility key**: `home-cards.ts:102` (`homePeopleVisibility`), `home-overview-cards.ts:74`, `data-adapter.ts:149,236` (`homeAttentionPeopleVisibility`), `test/home-overview-cards.test.mjs:109,131`.
6. **Heads-up and LOCK_SUM**: `fixtures.js:550-559`, `fixtures.empty.js:69,72`, `model.js` import list + `showHeads/fireHeads/heads*`, `development-rail.html:46`, `agent-adapter.ts:1538` (`headsOk`), `test/home-cards.test.mjs:103`.
7. **Dev assets move to `apps/app/src/dev/`**: `development-rail.html`, `development-system-surfaces.html`, `fixtures.js`, `fixtures.empty.js`, `fixtures/img/`; update `template-source.ts:3-4`, `vite.config.ts:20-22`, `model.js:8-16` import specifier, `model.d.ts`, `README.md`, `specs/quint/application/manifest.json:8060-8064` (ShellScreen), tests `quint-shell-screen`, `aosp-secure-camera-policy`, `theme-palette`, `voice-in-chat-only`, `browser/fixtures-empty-runtime.spec.ts`, `browser/shaw-ui-fixtures.spec.ts`, `test/support/feature-parity.mjs:370-371`.
8. **Dev-only render values**: `model.js renderVals` (`jumps`, `subJumps`, `modes`, `legend`, `themes`, `fs`, `notFs`, `toggleFs`, lock/boot/status values) move to a dev installer that owns the two dev HTML files.
9. **dc-lite special case**: `dc-lite.js:70` + `template.html` attribute `"{{name}}: summarize this file"` → `{{pv.askLabel}}` (or equivalent) + `selection-adapter.ts:180`.
10. **file-email-review on openReview**: `file-email-review.ts`, `source-review-dialog.ts` (maybe accept extra close triggers), callers `camera-adapter.ts:1194`, `selection-adapter.ts:152`, `specs/quint/refinement/application/boundaries.mjs`.
11. **Typed AlphaContacts plugin**: new `runtime/contacts-plugin.ts`, `contacts-adapter.ts:7`, `agent-adapter.ts:915`, stubs in `test/contacts-adapter.test.mjs:5`, `test/comms-settings.test.mjs:48`, `specs/quint/refinement/services/contacts-session-replay.mjs`.
12. **home-cards rename layer**: `home-cards.ts` + importers `data-adapter.ts`, `agent-calendar-adapter.ts`, `automations-adapter.ts`, `inbox-cloud-adapter.ts`, `workflow-adapter.ts`, `scripts/test-inbox-cloud-flow.ts`, `test/browser/home-daily-overview.spec.ts`, `specs/quint/application/manifest.json` HomeSurface symbols (`selectHomeAgenda` alias).
13. **Icon mask helpers**: `home-overview-cards.ts maskIcon`, `home-shell.ts glyph` and line 296, plus the other mask builders listed above → `icon-style.ts`.
14. **mock-attention shim**: delete `mock-attention.ts`, change `data-adapter.ts:2`, `test/support/feature-parity.mjs:387`.
15. **Upstream**: export `InstalledAppsGridDrawer`, `HOLD_MS`, `SLOP`, `appsDrawerEntries` from `@elizaos/ui/mobile-shell` index (vendor PR), then `home-shell.ts:6` uses the alias.

## Text/path pins
- `contacts-adapter.ts`: `specs/quint/services/manifest.json:3213-3243` (local names `epoch, loading, readable, available, editor, clear`), `specs/quint/native/manifest.json:4373`, `specs/quint/refinement/services/contacts-session-replay.mjs:13`, `specs/quint/refinement/native/telephony.mjs:334`, `test/contacts-adapter.test.mjs:5` and `test/comms-settings.test.mjs:48` (import-specifier stubs), `test/support/feature-parity.mjs:364`.
- `context-selection.ts`: `LemmaScript-files.txt:10`, `specs/lemma/apps/app/src/prototype/context-selection.dfy(.gen)`, `specs/lemma/README.md:182`, `//@` LemmaScript annotations in the file, `specs/quint/application/manifest.json:1231,3054`, `test/native-adapter-activity.test.mjs:16`, `test/fixtures/shade-notice-question.mjs:9`, `scripts/test-own-notice-question.ts:5`, `test/context-selection.test.mjs` (also regexes Java/vendor sources), `android/.../AlphaNotificationsPlugin.java:51` comment, `test/support/feature-parity.mjs:365`.
- `data-adapter.ts`: `specs/quint/application/manifest.json:8253,8273` (`createHomeAgenda` in this path), `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:357`, `test/final-ui-lifecycle.test.mjs:14` (slice markers `export function installHomeCardVisibility(` … `/** Neutral Home`), `test/home-cards.test.mjs:95,291`, `test/home-views-model.test.mjs:337,357`, `test/wallet-disabled.test.mjs:45-48` (`startPay: () => api.toast('Not connected')`), `test/support/feature-parity.mjs:366`.
- `dc-lite.js`: `test/template-style-cache.test.mjs:8` (slice markers `'  function camel('`/`'  function props('`, whitespace-sensitive), `test/dc-lite-keys.test.mjs:12`, `test/chat-transcript-window.test.mjs`, `test/dev-surface-gates.test.mjs:19` (path stub), `test/fixtures/voice-markup.mjs`, `test/fixtures/workflow-execution-markup.mjs` (`DCLogic` by name), `README.md:3`.
- `development-rail.html`: `template-source.ts:3`, `template.html:4591` marker, `test/theme-palette.test.mjs:10`, `test/voice-in-chat-only.test.mjs:30`.
- `development-system-surfaces.html`: `template-source.ts:4`, `template.html:4564` marker, `specs/quint/application/manifest.json:8060-8064` (`data-alpha-development-lock-screen`), `test/quint-shell-screen.test.mjs:14`, `test/aosp-secure-camera-policy.test.mjs:63`, `test/theme-palette.test.mjs:10`, `test/voice-in-chat-only.test.mjs:30,33` (also regexes `template-source.ts`).
- `file-email-review.ts`: `specs/quint/application/manifest.json:529`, `FilesAndSharing.qnt:1`, `specs/quint/application/README.md:45`, `specs/quint/refinement/application/boundaries.mjs:28`, `photos-window.mjs:20`, `test/selection-ask-readiness.test.mjs:7`.
- `files-index.ts`: `specs/quint/application/manifest.json:7311-7333` (`createFilesIndex`, `recentKey`, `record`, `revokeTree`, `RECENT_LIMIT`), `specs/quint/refinement/application/files-recent-index.mjs`, `specs/quint/refinement/services/{scan,system-picker-visibility}.mjs`, `test/files-index.test.mjs`, `test/quint-files-recent-index.test.mjs`, `test/scan-*.test.mjs`, `test/selection-ask-readiness.test.mjs`.
- `fixtures.js` / `fixtures.empty.js`: `vite.config.ts:21-22`, `test/browser/fixtures-empty-runtime.spec.ts:15`, `test/browser/shaw-ui-fixtures.spec.ts:73`, `test/support/feature-parity.mjs:370-371`, `README.md:11-38` (cites non-existent `test/fixtures-parity.test.mjs`, `test/fixtures-swap.test.mjs`), `model.d.ts:5,7`; value consumers `test/home-views-model.test.mjs`, `test/notes-view-defaults.test.mjs`, `test/history-initial-state.test.mjs`, `test/reset-wiring.test.mjs`, `test/agent-always-local.test.mjs`, `specs/quint/refinement/application/{shell-core-fixture,surfaces}.mjs`.
- `home-cards.ts`: `specs/quint/application/manifest.json:569,612,8252-8269`, `specs/quint/application/README.md`, `specs/quint/refinement/services/automation-request-settlement.mjs`, `test/browser/home-daily-overview.spec.ts:133,349,387` (in-page import by path), `scripts/test-inbox-cloud-flow.ts:8`, `android/.../HomeCalendarCardInstrumentedTest.java:78` (comment), several host tests.
- `home-overview-cards.ts`: `test/home-cards.test.mjs:105,164` (regex), `test/home-overview-cards.test.mjs` (bundle + markup regex), `specs/quint/native/manifest.json:4538`, `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:357`, `specs/quint/ui-return-review-20261109.md`.
- `home-shell.ts`: `specs/quint/application/manifest.json` (8 source lists; BackDispatch symbols `p.back`, `closeEdit`, `openAllApps`), `specs/quint/refinement/application/{home-gesture.mjs:16,home-failure-notice.mjs,drawer-interaction-fixture.tsx:4}`, `test/quint-back-dispatch.test.mjs:30`, `test/home-shell.test.mjs`, `test/product-identity.test.mjs:139` (regex on main.tsx call), `template.html:31` (`{{homeEditStyle}}`).
- All 13 files are listed by path in `test/support/feature-parity.mjs:364-375` (or nearby).

## New patterns
- **NEW-1 Shadowed closure state via setter**: a module-closure variable is set through a one-line setter and immediately shadowed by a same-named local (`contacts-adapter.ts:26,28,126`: `const api=viewApi;setApi(viewApi);`). Treatment: assign directly; one name per value.
- **NEW-2 Cross-card / cross-owner value key leakage**: one card's presentation flag is computed by another owner (`home-cards.ts:102` calendar-derived `homePeopleVisibility` drives the mail card's people row at `home-overview-cards.ts:74`), while the intended key (`homeAttentionPeopleVisibility`) is written and never read. Fits C1/D3 broadly (untyped value bag); a typed `HomeValues` would have caught it.
- **NEW-3 Dead consumer kept after its producer was deleted**: a listener/reader survives the removal of the only producer (`alpha-folder-context` listener and folder rules after `files-tree-adapter.ts` deletion; `files-index` tree kind; dc-lite `primaryLabel` special cases). Close to A7 but found only by tracing the producer's history; recommend a check "every window event name has ≥1 dispatcher" in a lint step.
- **NEW-4 Test-only options/return values on installers** (`installHomeShell` `favorites`/`storage` options and `return shell`): a sub-case of D7 worth listing explicitly, because Quint harnesses depend on them.

## Owner questions
1. Q1 (research §7): does test-mocks **live** mode (test-mocks build without `?fixture=1`) need fixture seeds hidden by `data-adapter.ts`'s `empty` table, or can fixture seeding move entirely into a dev installer so production `model.js` imports nothing from `fixtures.js` (and `fixtures.empty.js` disappears)?
2. Wallet (AP-13): delete `data-adapter.ts` wallet rows/wrap, `WAL_*` seeds and `COPY.wallet` now, or keep "for restoration"?
3. Should `runtime/phone-context.ts` keep accepting `selectedObject.kind:'folder'` once the folder-context producer is gone (no Files folder browser exists)?
4. `fixtures.js` names real businesses (Tartine, Equinox SoMa, Sightglass/Blue Bottle/Philz, Alaska Airlines, Delta, SFMOMA, The Warfield …) while its header says everything is fictional — replace with fictional names, or just correct the header?
5. Contacts icons: switch the hand-written phone/mail SVG paths to the catalogued `IC.phone`/`IC.mail` glyphs (visible change on the Contacts detail rows)?
6. Home badges: confirm only Phone, Messages and Inbox may badge on Home (so the prototype `badge` hooks of Calendar/Workflows/Wallet can be deleted instead of filtered).
