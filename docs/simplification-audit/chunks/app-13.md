# Chunk app-13 summary

Files: 14 in `apps/app/src/prototype/` (inbox-cloud-adapter … model.d.ts). Reports under `docs/simplification-audit/files/apps/app/src/prototype/`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/inbox-cloud-adapter.ts | SPLIT + SIMPLIFY (into `prototype/inbox/`) | 1052 | ~960 (across folder) |
| apps/app/src/prototype/inbox-drafts.ts | SIMPLIFY | 33 | 27 |
| apps/app/src/prototype/inbox-provider-controls.ts | KEEP (minor) | 28 | 28 |
| apps/app/src/prototype/inbox-unsaved.ts | SIMPLIFY | 91 | 86 |
| apps/app/src/prototype/keyed-list-focus.ts | KEEP (optional move to lib/) | 44 | 44 |
| apps/app/src/prototype/legacy-notes-access.ts | DELETE (owner) | 62 | 0 |
| apps/app/src/prototype/local-ocr.ts | KEEP | 6 | 5 |
| apps/app/src/prototype/local-speech-playback.ts | SPLIT + rename | 319 | ~150 here (+~120 message-actions, +~35 voice-timing) |
| apps/app/src/prototype/locale-time.ts | MOVE to runtime/ | 95 | 93 |
| apps/app/src/prototype/maps-adapter.ts | SIMPLIFY + move chat adapter out | 455 | ~370 |
| apps/app/src/prototype/maps-chat-adapter.ts | DELETE content (dead copy); becomes home of moved live chat adapter | 86 | ~40 (moved code) or 0 |
| apps/app/src/prototype/media-review-controls.ts | SIMPLIFY | 7 | 6 |
| apps/app/src/prototype/mock-attention.ts | DELETE | 4 | 0 |
| apps/app/src/prototype/model.d.ts | KEEP (type it) | 8 | ~10 |

Estimated removable: ~360 lines (legacy-notes-access 62, dead maps-chat-adapter 86, mock-attention 4, maps-adapter dead bindings/disposer/reply ~45, inbox-cloud-adapter ~40, local-speech-playback ~25 net, small files ~15, plus the legacy-notes cascade in agent-adapter etc. counted elsewhere).

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag` | type | inbox-cloud-adapter.ts:33, maps-adapter.ts:36 | ~50 prototype/browser files | `prototype/shell-types.ts` |
| `Shell` (any / Record) | type | local-speech-playback.ts:22, maps-chat-adapter.ts:55 | agent-adapter.ts:88, chat-overlay-motion-adapter.ts:22, … | `ShellHost` in shell-types.ts |
| `Component: ComponentType<any>`, `VIEWS: Record<string,any>` | decl | model.d.ts:2-3 | every adapter's `Component: any` | shell-types.ts |
| `InboxAttention` alias | type | inbox-cloud-adapter.ts:38 | upstream mailbox-list.ts | delete, import upstream |
| `ComposePrefill`/`ForwardSource`/`SuggestionTarget` aliases | type | inbox-drafts.ts:10-14 | upstream drafts-controller.ts | delete |
| `Folder` alias, `folderQuery` alias | type/const | inbox-cloud-adapter.ts:64,109 | upstream | delete |
| `MapsChatCard`, `MapsShareChoice`, `mapsChatText` | type/helper | maps-chat-adapter.ts:6-53 | runtime/action-message-presentation.ts:172-218 | delete (runtime owns) |
| `installMapsChatAdapter` | function | maps-chat-adapter.ts:58, maps-adapter.ts:419 | each other | maps-chat-adapter.ts (live version) |
| `attachmentNative` (AlphaMailAttachments) | plugin const | inbox-cloud-adapter.ts:15, inbox-drafts.ts:8 | note-source-adapter.ts:18, runtime/native-recovery-backup.ts:14, browser/simulated-inbox.ts:6, browser/simulated-messages.ts:6 | `runtime/plugins/mail-attachments.ts` |
| `device` (AlphaDevice), `calendarPlugin` (AlphaCalendar), `navigationTransport` | plugin const | maps-adapter.ts:51,134,80 | 18 / 19 / 2 sites | `runtime/plugins/*.ts` |
| Cloud owner / session keys (`offlineOwner`, `homeSummaryOwner`, `homeOwnerKey`, provider-controls owner, `speechBinding`, `conversationBinding`, `selection`) | helpers | inbox-cloud-adapter.ts:188,220,221; inbox-provider-controls.ts:27; local-speech-playback.ts:24,110,169 | main.tsx:102,430; agent-adapter.ts:443,1429,1694; agent-calendar-adapter.ts:142 | `runtime/session-key.ts` (keep persisted formats byte-identical) |
| SHA-256 hex | inline helper | inbox-unsaved.ts:35 | ~23 `digest('SHA-256'` sites in apps/app/src | `apps/app/src/lib/hash.ts` |
| `Capacitor.getPlatform()==='android'` | inline | inbox-unsaved.ts:36,76 | `native.ts:14` `isAndroid` | import `isAndroid` |
| Lucide URL builder | inline | inbox-cloud-adapter.ts:864,914; media-review-controls.ts:5 | 10+ files; `icon-style.ts` | `iconUrl()` in `icon-style.ts` |
| `glyph` span | helper | media-review-controls.ts:2 | workflow-filters.ts:19 | `mediaToolIcon` using `iconUrl` |
| retire-event list | const | maps-adapter.ts:397 | browser/digest-delegation-ui.tsx:41, domain-recovery.ts:56, notice-action.ts:6, password-provider.ts:17,27, calendar.ts:30 | one exported `RETIRE_EVENTS` |
| launcher-idle predicate | inline | maps-adapter.ts:357,367 | notifications/agent adapters | `prototype/shell-state.ts` |
| `cancelled()` DOMException | inline | local-speech-playback.ts ×6 | abort helpers (research C3 `isAbortError`) | `lib/abort.ts` |
| `check` abort+staleness fence | helper | legacy-notes-access.ts:20,36,45 | ~84 staleness closures (research P15) | delete with file |
| `date` (today→time else date) | helper | inbox-cloud-adapter.ts:919 | telephony-presenters.ts | `locale-time.ts` `formatListTime` |
| `hidden` visibility probe | helper | keyed-list-focus.ts:7 | subview-accessibility.ts | shared DOM util (optional) |
| attachment part shape | inline type | inbox-cloud-adapter.ts:133,138 | same file | `MailAttachmentPart` type |
| `resetAttention`, `acceptAccounts`, `dropMailboxView`, `showCachedOrLoad`, `attachmentReview`, `closeAttachment` | proposed local helpers | inbox-cloud-adapter.ts (8×, 4×, 10×, 3×, 2×, 6× repeats) | — | inbox module |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `maps-chat-adapter.ts` current content (86 lines) | No importer; `main.tsx:46` imports `installMapsChatAdapter` from maps-adapter; `mapsChatText` live in `runtime/action-message-presentation.ts`. Only pins: application manifest :4254/:4299, feature-parity :385, two comments. | Confirmed |
| `mock-attention.ts` | 1 importer (data-adapter.ts:2) that already imports from model.js | Confirmed |
| `openInbox` + `openInboxHandler` (inbox-cloud-adapter.ts:41,51-52,995,1050) | `git grep -nw openInbox -- apps`: only the definition; used by `scripts/inbox-adapter-fixture.ts` and `scripts/test-inbox-attention-flow.ts:25` | Confirmed (test-only) |
| `fullDate` local (inbox-cloud-adapter.ts:921) | never called | Confirmed |
| `view.reply = () => null` (inbox-cloud-adapter.ts:59) and `module.reply = () => null` (maps-adapter.ts:180) | global `p.reply` replaced in agent-adapter | Confirmed redundant |
| maps template-less bindings `grid, major, fwy, water, parks, rwy, routeD, doneD, hasRoute, pins, labels, meCss, mapDown, mapUp, sheetSw, sheetTap` (maps-adapter.ts:289-302) | 0 `maps.<key>` references in template.html/apps | Confirmed |
| `notNative/native/hasNativeMap` constants + `template.html:2231` notNative branch | adapter installed unconditionally; values constant | High |
| maps-adapter disposer, `disposed`, `original`, `!module` guard | `main.tsx:126` ignores return; maps view always registered | Confirmed |
| `speakNote` (local-speech-playback.ts:58) | no app caller; 3 test callers | Confirmed (test-only) |
| `ForwardSource`, `SuggestionTarget` aliases (inbox-drafts.ts:11-14) | 0 importers | Confirmed |
| `export` on `HourCycle`, `monthName`, `weekdayNames`, `monthNames` (locale-time.ts) | 0 external users | Confirmed |
| `legacy-notes-access.ts` + legacy notes cascade | PRD/README: fresh package, no migration | Owner decision (strong) |
| maps-adapter version-1 Calendar return (`calendarPlugin`, `mapsEventStillThere`) | belongs to legacy calendar authority | Owner decision |
| model `maps` render call (maps-adapter.ts:199) and model maps view | output only used for tokens | Depends on fixture-simulator decision |
| `typeof ResizeObserver`, `try{dispatchEvent}catch` (local-speech-playback.ts:136,44); `typeof gmailRead!=='function'` (inbox-cloud-adapter.ts:150,629) | always present | Confirmed |

## Cross-file actions
1. **Move live Maps chat adapter**: `maps-adapter.ts:417-455` → `maps-chat-adapter.ts` (replacing dead content); `main.tsx:46,146`; `specs/quint/refinement/application/maps-share-choice.mjs:21,29-30` (path + "last export" assertion); `test/maps-chat-markup.test.mjs:53-54`; `specs/quint/application/manifest.json:4254,4299,9416-9533` (symbol paths `installMapsChatAdapter, answered, current, hasMapsChoice, mapsChoices`); comments `calendar-approval-adapter.ts:68`, `scripts/prepare-client-features.ts:250`; `test/support/feature-parity.mjs:384-385`.
2. **Delete mock-attention**: `mock-attention.ts`, `data-adapter.ts:2-3`, `test/support/feature-parity.mjs:387`.
3. **Delete openInbox**: `inbox-cloud-adapter.ts`, `scripts/inbox-adapter-fixture.ts:218,252,259`, `scripts/test-inbox-attention-flow.ts:25,243`.
4. **Legacy notes removal** (owner): `legacy-notes-access.ts`, `agent-adapter.ts:9,577-616,1267-1331`, `runtime/notes-secure-store.ts:14` (`LEGACY_NOTES_SOURCE_KEYS`), `camera-adapter.ts:197-200`, `voice-adapter.ts:108-110`, `canonical-notes-ui.ts:340,347`, `notes-trash-adapter.ts`, `notes-folders-adapter.ts`, `note-origin-adapter.ts`, `workflow-authoring.ts`, `agent-calendar-adapter.ts`; tests `test/notes-owner-retirement.test.mjs`, `test/native-secure-slots.test.mjs:86-87`, `test/previous-notes-source-opening.test.mjs`, `test/fixtures/previous-notes-source-opening.mjs`, `test/browser/legacy-notes-access.spec.ts`; specs `specs/quint/refinement/application/previous-notes-availability.mjs`, `specs/quint/application/manifest.json:289,3556,3592`; `feature-parity.mjs:380`.
5. **Mail attachments plugin module**: `inbox-cloud-adapter.ts:15`, `inbox-drafts.ts:8`, `note-source-adapter.ts:18`, `runtime/native-recovery-backup.ts:14`, `browser/simulated-inbox.ts:6`, `browser/simulated-messages.ts:6`, `browser/register.ts:28`.
6. **Session/owner key module** `runtime/session-key.ts`: `inbox-cloud-adapter.ts:188,220,221`, `inbox-provider-controls.ts:27`, `local-speech-playback.ts:24,110,169` (+ `main.tsx`, `agent-adapter.ts`, `agent-calendar-adapter.ts` from other chunks). Keep `inbox-provider-controls` owner string and `homeSummaryOwner` format byte-identical.
7. **Move locale-time to runtime/**: 17 app importers, 4 scripts, ~10 tests, `test/locale-time-usage.test.mjs:64` skip path, `feature-parity.mjs:383`.
8. **Split local-speech-playback** into read-aloud / message-actions-adapter / voice-timing: `voice-adapter.ts:24,98,394,1333,1350,1494`, `runtime/voice-timing.ts`, test loaders `test/fixtures/cloud-voice-view.mjs:45`, `test/local-speech-playback.test.mjs:82`, browser `note-read-aloud.spec.ts`, `speak-replies.spec.ts`, `browser-cloud-dev.spec.ts`, manifests `application:4870-4903`, `native:3306-3333`, `feature-parity.mjs:382`.
9. **Icon URL helper**: add `iconUrl` to `icon-style.ts`; use in `media-review-controls.ts`, `workflow-filters.ts`, `inbox-cloud-adapter.ts`, `home-overview-cards.ts`, `voice-adapter.ts`, `camera-adapter.ts`, `selection-adapter.ts`, `settings-adapter.ts`.
10. **Maps notNative branch**: `maps-adapter.ts:248,274` + `template.html:2230-2231`.
11. **Retire-event constant**: `maps-adapter.ts:397` + 6 `browser/*` files.
12. **Inbox split** (D1): blocked by text pins `test/context-selection.test.mjs:251-254`, `test/gmail-background-binding.test.mjs:38-43`, `test/home-google-connection-source.test.mjs`, `test/quint-inbox-provider-drafts.test.mjs:32`, `specs/quint/refinement/services/inbox-list-paging-ports.mjs:19` (marker `'  let loadingMore = false;'`) – retire/convert first.

## Text/path pins
- `specs/quint/services/manifest.json`: inbox-cloud-adapter symbols (`nextPageToken, seenCursors, generation, loadingMore, rememberList, restoreList, cachedListShown, invalidateList, firstPageRevision, loadedQuery, offlineStore`); inbox-unsaved symbols (`inboxUnsaved, editCoalescer, invalid, peek, retire, tooLarge, visibilitychange`); maps-adapter (`readCloudMaps, onMapsConnectionChange, pendingHandoff, discardHandoff, screen.handoff, screen.hidden, screen.release, screen.back, view.mode, navigationVoice`); source paths for inbox-drafts, inbox-provider-controls.
- `specs/quint/application/manifest.json`: maps-adapter symbols (`installMapsChatAdapter, answered, current, hasMapsChoice, mapsChoices, mapGeneration, dropPlane, planeElement, planeBasemap, mapCopyright, retryNativeMap, mapRef, released`); maps-chat-adapter `installMapsChatAdapter` (:4299, dead file); local-speech-playback symbols; keyed-list-focus (:1452); legacy-notes-access (:289,3556,3592); inbox-cloud-adapter (:4037).
- `specs/quint/native/manifest.json`: local-speech-playback (`speechRetirement, retainSpeechRetirement, stopLocalSpeechPlayback`), maps-adapter `navigationLocation`.
- Marker/slice harnesses: `map-plane-ownership.mjs` (`  let mapCopyright='';`), `maps-event-return.mjs` and `legacy/maps/check-maps-refinement.mjs` (`  let returningToEvent…`), `maps-share-choice.mjs` (`export function installMapsChatAdapter(`, must be last export), `maps-connection.mjs` (`const readCloudMaps = `), `inbox-list-paging-ports.mjs` (`  let loadingMore = false;`), `list-focus.mjs` (`return {\n    capture()`), `test/maps-chat-markup.test.mjs` (`/** Presentation only:`), `test/home-google-connection-source.test.mjs` (`    const googleConnected=` … `    // The shared Home mail card`), `previous-notes-availability.mjs` and `test/fixtures/previous-notes-source-opening.mjs` (agent-adapter markers).
- Regex tests (T1): `test/context-selection.test.mjs:252-254`, `test/gmail-background-binding.test.mjs:39-43`, `test/quint-inbox-provider-drafts.test.mjs:33`, `test/native-secure-slots.test.mjs:86-87`, `test/locale-time-usage.test.mjs`.
- Load-by-name loaders: `scripts/fixtures/prototype-script.ts` users (`scripts/inbox-adapter-fixture.ts:216-218`, `scripts/test-inbox-*.ts`, `scripts/test-maps-reroute-freshness.ts:21`), `test/fixtures/cloud-voice-view.mjs:45`, `test/local-speech-playback.test.mjs:82`, `test/inbox.test.mjs:25`, `test/inbox-operation-guards.test.mjs:110`, `test/inbox-draft-copies.test.mjs:63`.
- Module-id stubs: `./local-ocr` (7 sites), `./media-review-controls` (3 quint harnesses).
- Inventory: `test/support/feature-parity.mjs:375-387` lists all 13 TS files of this chunk (exact inventory; deletions/moves must update it).
- Browser specs importing by URL: `/src/prototype/inbox-drafts.ts`, `/src/prototype/inbox-unsaved.ts`, `/src/prototype/local-ocr.ts`, `/src/prototype/local-speech-playback.ts`, `/src/prototype/locale-time.ts`; source lists in `browser-list-focus.spec.ts`, `maps-list-focus.spec.ts`, `notes-photos-list-focus.spec.ts`.

## New patterns
- **NEW-a: Dead earlier copy shadowed by a live twin with the same exports.** `maps-chat-adapter.ts` exports the same names (`installMapsChatAdapter`, `mapsChatText`, `MapsChatCard`) as the live code in `maps-adapter.ts` and `runtime/action-message-presentation.ts`, while quint manifests and the feature-parity inventory still pin the dead file. Close to A2/A7 but worth a dedicated check: grep for duplicate exported names across files and confirm which one has importers.
- **NEW-b: Manifests pinning symbols in dead files.** `specs/quint/application/manifest.json:4299` asserts `installMapsChatAdapter` exists in an unimported file, so the "proof" covers code that never runs. Proposed check: every manifest `sources` path must be reachable from an entry point.
- **NEW-c: Template-less view values.** Adapters set keys the template never binds (`maps.grid`, `maps.pins`, …) only to blank prototype output. Check with a script: for each view's returned keys, grep `{{view.key}}` in `template.html`.
- **NEW-d: Untyped string state machines** (`phase` in inbox-cloud-adapter, `Reading.message` in local-speech-playback) – add literal union types.
- Minor: statements and functions interleaved with imports (`inbox-cloud-adapter.ts:15,35`, `maps-adapter.ts:20-25`).

## Owner questions
1. Legacy/previous Notes: may `legacy-notes-access.ts` and the whole "Previous notes" source path be deleted (no device holds old-package notes the new package must read)?
2. Legacy calendar authority: may Maps' version-1 Calendar return path (`AlphaCalendar.list` + `mapsEventStillThere`) go with it?
3. Does the fixture-mode simulated phone keep the model `maps` view? If not, maps-adapter stops calling `original.render` and the ~400-line model view is removed.
4. Is `data-map-diagnostics` (maps-adapter.ts:242) a supported production diagnostic surface, or test-only (emit only with test mocks)?
5. `inbox-provider-controls.ts:26` disables provider review when `data-connection-mode==='mock'`: is the mock connection mode reachable in product builds, or can this guard move to the dev simulator?
6. Is the 8 MiB JSON check in `inbox-unsaved.ts:44` still needed given `inboxUnsavedLimit` and the native slot cap?
