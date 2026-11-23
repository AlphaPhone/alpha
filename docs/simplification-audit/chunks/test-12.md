# Chunk test-12: Playwright specs `device-view-profile` … `gmail-grant-recovery` (35 files)

Every file in `chunks/test-12.files.txt` exists and was read in full. The reports are in `files/test/browser/<name>.md`.

## Verdicts

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| device-view-profile.spec.ts | chromium, UI + inline bridge + controller snapshot (T6/P2) | MERGE | `journeys/connection-cloud.spec.ts` (5–6 scenarios on the harness bridge) |
| digest-authorization-migration.spec.ts | chromium dev simulator, module-in-page plus legacy (T6/A1) | DELETE | 2 cases go to `journeys/digests.spec.ts` only if Q-HOST-5 keeps Cloud read delegation |
| digest-execution-migration.spec.ts | chromium dev simulator, module-in-page (T6/A1) | DELETE | — |
| digest-inbox-migration.spec.ts | chromium dev simulator, module-in-page (T6/A1) | DELETE | — |
| digest-native-sources.production.spec.ts | production journey | MERGE | `journeys/digests.production.spec.ts` (all 3 tests) |
| digest-resident-schedule.production.spec.ts | production journey | MERGE | `journeys/digests.production.spec.ts` (both tests) |
| digest-source-renewal.spec.ts | chromium dev simulator, UI plus simulator reads | MERGE | 3 assertions to `journeys/digests.production.spec.ts` |
| digest-summary.spec.ts | chromium dev, UI plus 1 pure-function test (T6) | MERGE | 1 case (native result privacy) to `journeys/digests.production.spec.ts` |
| direct-voice-live.local.spec.ts | live lane, real provider | KEEP, SIMPLIFY | rename `journeys/voice.local.spec.ts`; drop Component patch and receipt |
| dock-clearance.spec.ts | fake DOM plus direct module call (T6) | DELETE | covered by the Quint dock-clearance-ownership replay and layout journeys |
| document-excerpt-sensitive.spec.ts | chromium journey, backdoor seed | MERGE | `journeys/files.spec.ts` |
| document-summary-note.production.spec.ts | production journey (J03) | MERGE | `journeys/notes.production.spec.ts` |
| domain-atomicity.spec.ts | module-in-page on the real IndexedDB/Web Locks store (T6) | MERGE | `test/browser/storage-contract.spec.ts` (2 cases, T3 exception) |
| domain-initialization.spec.ts | module-in-page, legacy import (A1) | DELETE | also remove it from `scripts/storage-specs.ts` |
| domain-recovery-lifecycle.spec.ts | in-page `openDomainRecovery` with a fake store, 8 looped tests | MERGE | 1 case to `journeys/calendar.spec.ts` |
| drawer-full-height.spec.ts | chromium layout journey | MERGE | `journeys/home-shell.spec.ts` |
| durable-delete-undo.spec.ts | chromium journey, store reads (T6) | MERGE | `journeys/reminders.spec.ts` |
| execution-storage-migration.spec.ts | chromium dev simulator, module-in-page (T6/A1) | DELETE | — |
| explicit-send.spec.ts | chromium, prototype surgery plus direct `shell.send` (P3/T6) | MERGE (rewrite) | `journeys/chat.spec.ts`, through a visible suggestion chip |
| file-email.spec.ts | chromium journey with store and controller patches | MERGE | `journeys/inbox.spec.ts` "attach to email" (with `photo-email`) |
| files-agent-filter.spec.ts | stitched source: rewrites the served `connection-ui.tsx` (P4) | REWRITE | `journeys/files.spec.ts` "agent actions" through the agent fake |
| files-bulk.spec.ts | chromium journey plus 2 module tests; spawns `python3` | MERGE | `journeys/files.spec.ts` (archive-path guard to `storage-contract.spec.ts`) |
| files-dialog-accessibility.spec.ts | chromium keyboard journey | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| files-dialog-dismissal.spec.ts | chromium journey plus a synthetic `<dialog>` | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| files-dialog-large-text.spec.ts | chromium layout journey | MERGE | `journeys/files.spec.ts` "Files dialogs" |
| files-location-layout.spec.ts | chromium layout check | MERGE | one step in the Files root test |
| files-preview-media.spec.ts | chromium journey, synthesised media | MERGE | `journeys/files.spec.ts` "preview" |
| files-sort-directions.spec.ts | chromium journey | MERGE | `journeys/files.spec.ts` |
| fixture-images.spec.ts | mock-mode smoke | MERGE | `journeys/dev-surface.spec.ts` |
| fixtures-empty-runtime.spec.ts | dev server with the fixtures module swapped (P4/T4) | DELETE | `production-surface.spec.ts:202` and the bundle audit cover it on the real bundle |
| flag-off-android.ts | production-lane bridge fake (60 importers) | KEEP, SPLIT | `harness/bridge.ts` + `harness/plugins/*` + `harness/app.ts` |
| full-chat-grabber.spec.ts | chromium gesture journey (about 22 tests, 8 sleeps) | MERGE | `journeys/chat.spec.ts` (sheet) + `journeys/home-shell.spec.ts` (raised dock) |
| generic-cloud-speech-fixture.ts | support, product prototype patch (P3) | MERGE (or DELETE with importers) | `harness/plugins/cloud.ts` speech controls at the TTS boundary |
| global-basemap.spec.ts | chromium real-MapLibre journey | MERGE | `journeys/maps.spec.ts` |
| gmail-grant-recovery.spec.ts | chromium journey, controller overrides | MERGE | `journeys/inbox.spec.ts` |

Totals: 7 DELETE, 2 KEEP, 26 MERGE/REWRITE.

## Behaviours that lose coverage if the DELETEs happen

- **The real `browser/documents.ts` store (IndexedDB plus Web Locks).** Production modules (`notification-store`,
  `hosted-results`, `preference-documents`, `workflow-intents`, `media-copy-intent`) depend on it. If
  `domain-atomicity` were deleted instead of merged, nothing would run the real store across tabs or under a quota
  failure: the Quint storage harness injects its own CAS port. This is why the verdict is MERGE into one
  `storage-contract.spec.ts`.
- **Zip path traversal in `file-archive.ts`** (`../`, absolute, drive, backslash, `//`). Only `files-bulk.spec.ts:46-54`
  checks it. Carry it to `storage-contract.spec.ts`, or to a host integration test that imports the module.
- **Cloud read-delegation abort behaviour** (closing aborts the start but keeps the saved request; backgrounding
  pauses). It is lost with `digest-authorization-migration` unless Q-HOST-5 keeps the panel and the 2 cases move.
- **The dev digest, workflow and action simulator's storage and scheduler semantics** (occurrence-once, ack per
  client, retirement fences). The DELETEs are deliberate: the simulator is dev-only (D19). If the owner wants the
  simulator kept correct, one host integration test over `dev/` replaces three Playwright files.
- **The simulated shade's empty state** (no Enclave lock tile, neutral Flashlight). It is a dev-only surface; on
  Android the shade is the OS. It is not carried.
- **Dock-clearance installer ownership.** It stays covered by the Quint replay
  (`test/quint-dock-clearance-ownership.test.mjs`); real clearance is measured by the drawer and chat layout journeys.

## Shared helpers worth keeping or creating

- `flag-off-android.ts` → `harness/bridge.ts` + plugin files (see its report). It survives every DELETE here.
- `helpers/retained-digests.ts`, `helpers/native-notes.ts`, `helpers/settled.ts`, `app-navigation.ts`,
  `device-apps-stub.ts`, `inbox-draft-navigation.ts`, `helpers/home-calendar.ts`: used by MERGE targets, so keep them.
- New: `harness/maps.ts` `closedBasemap()` (de-duplicates `global-basemap.spec.ts:9` and `flag-off-android.ts:411`);
  `harness/files.ts` `seed.files()` and `readZip()` (replaces in-page `registerPlugin('AlphaFiles').importFile` in 9
  specs here and the `python3` zip spawns); `openChatSheet()`, `animationsSettled()` and named timing constants for
  the chat and home-shell journeys; `harness/digests.ts` locators shared by the two digest production specs.
- `helpers/connection-diagnostics.ts` (`openConnectionDiagnostics`) loses 5 importers from this chunk
  (digest-authorization, digest-execution, digest-inbox, digest-source-renewal, digest-summary, execution-storage); it
  remains in use elsewhere (69 files per the research).
- `calendar-draft-readiness.ts` `guardCalendarFixture` is imported as `guardNoMedia` by `files-dialog-dismissal`;
  replace it with the harness auto-fence.

## Cross-file actions

1. Remove `domain-initialization.spec.ts` from `scripts/storage-specs.ts:37`. Replace the `domain-atomicity` entry
   (`:19`) with `storage-contract.spec.ts`.
2. D1 envelope removal (`BrowserDomainDocument` `{legacy,value}`) breaks `domain-atomicity:63` (`legacy` field),
   `domain-recovery-lifecycle:8` (`legacy` capture shape) and all three digest-* migration specs. Delete or adjust them
   in the same change.
3. Delete the dead branch at `flag-off-android.ts:98` (`GET /api/notes/state` is already answered with 503 at line 96).
4. `files-agent-filter.spec.ts` rewrites the served `connection-ui.tsx` source. It must go before the
   `connection-ui.tsx` split (D1/U-R*), or the split breaks it silently: the route rewrite just stops matching.
5. Merge `photo-email.spec.ts` with `file-email.spec.ts` (another chunk owns `photo-email`).
6. The three `dev-*` speech specs decide whether `generic-cloud-speech-fixture.ts` survives; they are in other chunks.
7. One sentinel list for fixture names, owned by `scripts/audit-production-bundle.ts:34` and imported by
   `production-surface.spec.ts:14`. `fixtures-empty-runtime.spec.ts:6` had a third copy.

## Owner questions

- Q-12-1 (= Q-HOST-5): Is Cloud read delegation (the "Connect Cloud for scheduled reads" panel) in scope? If yes, two
  abort/pause cases move from `digest-authorization-migration` to `journeys/digests.spec.ts`.
- Q-12-2: Can the agent pinned in `upstream.lock.json` still omit `viewProfileVersion` at registration? If not, the
  `legacy` scenario in `device-view-profile` and its product branch go.
- Q-12-3: Is the browser Files implementation (`browser/files.ts`, registered by `browser/register.ts`) a product
  path, or only the dev stand-in for `AlphaFiles`? It decides whether batch rollback and dot-path rejection need any
  coverage.
- Q-12-4: Does anyone read `receipt.json` from the live voice lane for latency tracking? If not, it and its listeners
  go.
- Q-12-5: Is a host-side check of the dev digest scheduler wanted after the three digest-* migration specs are
  deleted?
- Q-12-6: May `digestSummaryText` drop the legacy `{summary}` output shape (`digest-summary.spec.ts:22`), as part of
  Q-LEG-11?
