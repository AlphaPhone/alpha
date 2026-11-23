# Chunk test-16: Playwright specs `journey-f…` to `mail-preview`

24 files reviewed (all exist). Reports are under `files/test/browser/`. Verdicts: 5 KEEP (moved into journey files), 13 MERGE, 6 DELETE.

| File | Project | Kind | Verdict | Target |
|---|---|---|---|---|
| journey-f-reviewed-send.spec.ts | chromium | journey, provider installed via `/src` imports (T6 setup) | KEEP, trimmed 13→11 tests | `journeys/inbox.spec.ts` (reviewed send), on `fakeGmailProvider` |
| journey-j01-poster-calendar.spec.ts | chromium (dev) | journey, real OCR | KEEP | `journeys/camera-photos.spec.ts` (scan) |
| journey-j03-document-analysis.spec.ts | chromium (dev) | journey, uses legacy Notes source | KEEP, port to canonical Notes | `journeys/files.spec.ts` |
| journey-j04-android.production.spec.ts | production | journey; test 2 uses legacy Calendar authority + fiber `vset` | MERGE test 1, DELETE test 2 | `journeys/maps.spec.ts` |
| journey-j04-cloud-maps.production.spec.ts | production | journey, no `/src` imports | KEEP (maps backbone; test 3 becomes a step of test 1) | `journeys/maps.spec.ts` |
| journey-j04-schedule-travel.spec.ts | chromium (dev) | journey, Maps provider via `/src/maps/runtime.ts` | MERGE (Bike refused, system Back, no replay on reload) | `journeys/maps.spec.ts` |
| journey-j05-web-research-note.spec.ts | chromium (dev) | journey, legacy Notes | MERGE test 2 (CORS → pasted excerpt); DELETE tests 1, 3 (dup of core-loops J05 Android) | `journeys/browser.spec.ts` |
| large-text-layout.spec.ts | chromium | layout check, T6 text scale | DELETE (carry "text scale survives reload") | `journeys/accessibility.spec.ts` |
| large-text-overlap.spec.ts | chromium | geometry checks, 11 tests | MERGE (app labels, grid 4→3, calendar title, Apps drawer, Files rows at 200 %) | `journeys/accessibility.spec.ts` |
| legacy-list-identity.spec.ts | chromium | legacy localStorage bookmarks (A1) | DELETE | - |
| legacy-notes-access.spec.ts | chromium | legacy "Previous notes" (A1) | DELETE | - |
| listener-invocation.production.spec.ts | production | journey over bridge stubs (D7 deferred features) | KEEP, 8→3 tests | `journeys/voice.spec.ts` |
| live-voice.spec.ts | chromium | upstream module in page (T5/T6) | DELETE (upstream follow-up) | - |
| local-agent-availability.spec.ts | chromium | chooser over hand-written bridge | MERGE (unpackaged step only) | `journeys/connection-cloud.spec.ts` |
| local-agent-native-stream.spec.ts | chromium | chat UI, transport injected in page (T6), 14 tests | MERGE (2-4 tests) | `journeys/chat.spec.ts` |
| local-agent-stop.spec.ts | chromium | chooser, fake clock | MERGE | `journeys/connection-cloud.spec.ts` |
| local-agent-stream.spec.ts | chromium | chat, T6 transport | MERGE (2 steps) | `journeys/chat.spec.ts` |
| local-ocr.spec.ts | chromium | 4 module-in-page tests + 1 journey (legacy Notes) | MERGE (2 tests) | `journeys/camera-photos.spec.ts` (scan) |
| local-provider-settings.spec.ts | chromium | settings over hand-written bridge, T6 account | MERGE | `journeys/connection-cloud.spec.ts` |
| location-settings-recovery.spec.ts | chromium + firefox/webkit | dev simulator storage recovery | DELETE (and drop from `scripts/storage-specs.ts`) | - |
| login-field-reporter.spec.ts | chromium | slices vendor Java text block (T1/T2/T5) | DELETE (upstream follow-up) | - |
| mail-controls.spec.ts | chromium | test 1 misnamed (chat pill), test 2 folder menu | MERGE | `journeys/chat.spec.ts`, `journeys/inbox.spec.ts` |
| mail-images.spec.ts | chromium | inbox reading, T6 Gmail override | MERGE | `journeys/inbox.spec.ts` |
| mail-preview.spec.ts | chromium | inbox list, T6 Gmail override | MERGE | `journeys/inbox.spec.ts` |

## Behaviours that lose coverage if the DELETEs happen
- **Login-field reporter rules** (trusted focus only, own frame and origin, no cleartext, fill only registered fields, submit on real submit, unload notice): no browser-level test remains in this repo until upstream `plugin-native-browser-surface` adopts these cases. The device sign-in instrumentation test covers only part of it.
- **Live-voice protocol edges** (stale turn and other-session partials ignored, owner change fences a native capture): left to host tests that are themselves candidates for deletion and to upstream. The voice journey should assert interim text then one final through the real Voice region.
- **Native stream protocol edge cases** dropped from `local-agent-native-stream` (`invalid-native`, `malformed-complete`, `failed-ready`, `tool-only`, `correction`, `view-change`): no other coverage. They need an integration test against the real resident bridge fixture, or acceptance that `streamNativeAgent` parsing is upstream-shaped.
- **OCR worker termination on abort / unconfirmed scan save**: lost; no visible effect for the first, the second could come back through a bridge fault in the scan step.
- **Dev location recovery** and **legacy bookmarks/Notes**: lost by design (dev-only and D1).

## Shared helpers worth keeping or creating
- `fakeGmailProvider(page, options)`: replaces six hand-written `connectionController.getCloudClient/getSnapshot` overrides (`journey-f-reviewed-send`, `mail-images`, `mail-preview`, `mail-controls`, plus `gmail-mvp-scope`, `journey-f-email-notifications` outside this chunk). It should answer Cloud HTTP routes and store slots through the bridge, so the specs can run on the production project.
- A resident bridge fixture (extend `helpers/resident-agent-plugin.ts`) with secure-slot store, `providerStatus/configureProvider/clearProvider`, `getStatus` setter and `requestStream` handle: replaces three hand-written Capacitor objects (`local-agent-availability`, `local-agent-stop`, `local-provider-settings`) and the in-page transport in `local-agent-native-stream`/`local-agent-stream`.
- `bridge.add(plugin, methods, handler)` in `flag-off-android.ts`: replaces the manual `PluginHeaders`/`nativePromise` patching in both J04 production specs and `listener-invocation`.
- `syntheticCamera(page, lines)`, `askAlpha(page, text)`: duplicated between J01 and `local-ocr`.
- `todayInTwoHours()`, `readEventAgain(page, begin)`: duplicated between the two J04 production specs.
- `textBoxes`/`overlaps` from `large-text-overlap` move into `accessibility-audit.ts` if it survives.
- `helpers/legacy-notes.ts` (`openLegacyNotes`) and `helpers/browser-calendar.ts` `openRetainedCalendarSource`: delete with D1; three files in this chunk (J03, J05, local-ocr) must first move to `helpers/canonical-notes.ts`.

## Cross-file actions
- Remove `test/browser/location-settings-recovery.spec.ts` from `scripts/storage-specs.ts`.
- Upstream follow-ups (D14): login-field reporter cases; live-voice session and native live transport cases.
- After A2, confirm which Notes store browser-build "Save reviewed note" (J03, J05) and Camera "Save to Notes" (local-ocr) write to, and retarget the carried cases at the canonical Notes UI.
- `journey-core-loops.production.spec.ts` already covers J05 on Android (`:646`, `:752`); the dev J05 duplicates go.

## Owner questions
- With the legacy Calendar authority deleted, should the "Not linked to note" notice for note-origin Calendar drafts be checked under Agent Calendar (`journeys/calendar.spec.ts`)? Today only the deleted retained-authority test covers it.
- Is the unpackaged-runtime state ("The local agent is unavailable in this version", developer APKs only) a product state that needs a journey step, or test-mocks-only text?
- Should the dev location simulator keep its "Download location settings backup" recovery, or reset unreadable dev settings directly?
