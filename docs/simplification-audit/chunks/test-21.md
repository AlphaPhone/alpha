# Chunk test-21: Playwright specs (responsive layout, scan, selected content, Settings, share, shell, sign-in)

There are 33 files, and each one has a report under `files/test/browser/`. No product, test or config file was changed.
Note on naming: the `production` project matches files by `/(production-surface|\.production)\.spec\.ts$/`
(`playwright.config.ts:10`). "(production)" journeys below therefore mean `journeys/<area>.production.spec.ts`.

## Files

| File | Kind | Verdict | Target |
|---|---|---|---|
| resident-stub.ts | production-lane resident/Cloud/Maps fake (16 specs, 3 live Quint harnesses) | MERGE | `harness/plugins/agent.ts` (+ `helpers/resident-agent-plugin.ts`), `plugins/cloud.ts`, `plugins/maps.ts`, `harness/signin.ts` |
| responsive-surfaces.production.spec.ts | journey, production, 12 tests | MERGE | `journeys/accessibility` (production) layout section; Notes cases → `journeys/notes` |
| responsive-surfaces.spec.ts | journey, chromium mock/dev, 9 tests; voice test is T6 | MERGE | `journeys/accessibility` layout section |
| review-visual-viewport.spec.ts | T6 (dialogs opened by import), 2 tests | REWRITE | `journeys/accessibility` keyboard step |
| root-view-states.spec.ts | journey, chromium, 49 tests | MERGE (collapse to 12+1) | `journeys/home-shell` "fresh profile" |
| saved-signin-retry.production.spec.ts | journey, production, private bridge, 3 tests | MERGE | `journeys/connection-cloud` (production) |
| scan-correction.spec.ts | T6 entry + upstream-algorithm unit tests, 9 tests | MERGE (UI) / DELETE (unit) | `journeys/camera-photos` Scan |
| scan-document.spec.ts | T6 entry, prototype patches, 8 tests | MERGE | `journeys/camera-photos` Scan |
| scan-draft.spec.ts | 3 UI + 6 upstream store unit tests + 1 legacy-Blob reader | MERGE (3) / DELETE (7) | `journeys/camera-photos` Scan |
| scan-edges.spec.ts | T6 entry + upstream unit, 8 tests | MERGE (UI) / DELETE (unit) | `journeys/camera-photos` Scan |
| scan-event.spec.ts | 1 journey (real OCR) + 3 component-mount tests | MERGE (component cases become journey steps) | `journeys/camera-photos` Scan → Calendar |
| scan-keep.spec.ts | T6 component mount, 2 tests | MERGE | `journeys/camera-photos` Scan (via photos plugin) |
| scan-links.spec.ts | 1 journey + 1 unit | MERGE / DELETE | `journeys/camera-photos` Scan |
| scan-native-page-camera.spec.ts | journey, private camera bridge, 2 tests | MERGE (becomes the Scan entry) | `journeys/camera-photos` Scan; bridge → `harness/plugins/camera.ts` |
| scan-page-camera.spec.ts | T6 entry, web camera path, 4 tests | MERGE (3) / DELETE (1) | `journeys/camera-photos` Scan (browser-camera; owner question) |
| scan-pdf.spec.ts | 2 UI + 2 upstream unit + 1 layout, 5 tests | MERGE / DELETE | `journeys/camera-photos` Scan |
| scan-review-keyboard.spec.ts | T6 (dialogs by import, CSS var text scale), 6 tests | MERGE (3 cases, one theme) | `journeys/camera-photos` Scan large-text step |
| scan-review-navigation.ts | 5-line helper, 5 importers | MERGE (inline) | Scan section local helper |
| scan-searchable.spec.ts | journey with real OCR + 2 upstream unit, 7 tests | MERGE (one real-OCR test) / DELETE (2) | `journeys/camera-photos` Scan |
| scan-text-draft.spec.ts | seeded-store journey + 1 store unit, 4 tests | MERGE (3) / DELETE (1) | `journeys/camera-photos` Scan |
| selected-content-question.spec.ts | journey with `alphaClient.send` patch, 2 tests | MERGE | `journeys/files` "ask about a file" |
| selected-content-readiness.spec.ts | journey with `BrowserFiles.prototype` patch, 3 tests | MERGE | `journeys/files` "ask about a file" |
| selected-document-accessibility.spec.ts | T6 (opened by API, separate `BrowserFiles`), 9 tests | MERGE (UI) / DELETE (forget, replace) | `journeys/files` "open a document" |
| settings-device-facts.spec.ts | journey, chromium, private bridge, 9 tests | MERGE (about 5 tests) | `journeys/settings` "Android facts and updates" |
| settings-navigation.spec.ts | journey, 1 test | MERGE | `journeys/settings` navigation step |
| settings-page-accessibility.spec.ts | journey, mock and dev, 4 tests | MERGE | `journeys/settings` keyboard step; dev rows → `journeys/dev-surface` |
| settings-truth.production.spec.ts | journey, production, private bridge, 15 tests | KEEP (base) | `journeys/settings` (production); shade → `home-shell`; plan/status → `connection-cloud` |
| settings.production.spec.ts | journey, production, 4 tests | MERGE | `journeys/settings` (production); gating → `journeys/production-gating` |
| share-panel.spec.ts | T6 component mount on a synthetic page, 1 test | REWRITE | `journeys/notes` share step |
| shaw-ui-fixtures.spec.ts | screenshot receipts + controller patches, 8 tests | DELETE (carry 1 case if uncovered) | `journeys/home-shell` (confirmed-empty Home) |
| shell-toast.spec.ts | T6 (React fiber walk) + 28 s of sleeps, 8 tests | MERGE | `journeys/home-shell` "notices" on the fake clock |
| signed-out-page.production.spec.ts | journey, production, 3 tests | MERGE | `journeys/connection-cloud` (production) mandatory sign-in |
| signed-out-page.spec.ts | dev smoke, 1 test | MERGE | `journeys/dev-surface` |

Counts: KEEP 1, MERGE/REWRITE 31, DELETE 1 whole file (`shaw-ui-fixtures`). Inside the merged files about 25 individual
tests are deleted: upstream unit tests, legacy reader, API-only cases and duplicates.

## Behaviour that loses all coverage if the DELETEs happen

Be clear about this. These tests are the only tests of **upstream** `vendor/eliza/plugins/plugin-files` document
algorithms. Upstream has only `test/scan-event.test.mjs`. If they are deleted here before upstream adds tests, nothing
covers:
- `scan-correction`: projective sampling geometry, and rejection of invalid or degenerate corners before decoding (`scan-correction.spec.ts`).
- `scan-edges`: corner accuracy within 2.5 % and abort during detection (`scan-edges.spec.ts`).
- `scan-draft` store: transaction rollback on abort (write and delete), revision fence, a newer save winning over a serializing older one, the v2 byte format, and text-layer validation (`scan-draft.spec.ts`, `scan-text-draft.spec.ts`).
- `scan-pdf`: the 0/21-page limits, abort and non-image rejection, invisible text keeping rendered pixels, and invalid text-layer positions (`scan-document`, `scan-pdf`, `scan-searchable`).

Recommendation: record these as upstream follow-ups (D14/R6), and keep the browser tests until the upstream suite
lands. The local cases they would leave behind are all UI-level and are listed in each report.

Smaller gaps: `share-panel` retirement when the source stops being current has no UI trigger. `shell-toast`'s
long-message reading time needs a real action that emits a long toast, or a dev hook.

## Shared helpers worth keeping (one home each)

- `harness/layout.ts`: `box`, `resize` (wait on `--alpha-visible-height` plus two rAFs), `expectColumn`, `expectTarget`, `inert`, the viewport matrix. Today it is copied in both `responsive-surfaces*`.
- `harness/nav.ts`: `androidBack` (`alpha-back`), `pressHome` (`launcher-home`), `openStoredFile`, `pullDown` (shade drag in `root-view-states` and `settings-truth`).
- `harness/plugins/device.ts`: roles, snapshot (`hold`), `setTextScale`, update answers, `openSettings` outcomes, `openNotificationShade`. Today it is duplicated in `settings-device-facts` and `settings-truth.production`.
- `harness/plugins/camera.ts` (from `scan-native-page-camera`), `plugins/documents.ts` (`AlphaNoteDocuments.exportPdf` ok/lost/held, which replaces three `BrowserNoteDocuments.prototype` patches), `plugins/files.ts` (`importFile`, `holdRead`), `plugins/scan.ts` (`seedScanDraft` with text layers).
- `noFixtureValues(text)`, merging `settings-truth.production` `fixtureValues` with `root-view-states` `FIXTURE`.
- `harness/keyboard.ts` `showSoftKeyboard` (visual-viewport emulation from `review-visual-viewport`).
- A Scan entry `scanFromCamera(page)` / `scanImage(page, blob)` that replaces 11 `import('/src/prototype/scan-*.ts')` entries.

## Cross-file actions

1. **Legacy Notes (D1/A2):** `responsive-surfaces.production` uses `openLegacyNotes` in three tests. Switch it to canonical Notes in the same change that deletes `helpers/legacy-notes.ts`.
2. **Calendar backup (D3):** `settings-page-accessibility.spec.ts:54-55,68-70` assert the "Calendar backups" developer row (`settings-adapter.ts:870`). Delete those assertions with the backup code.
3. **Legacy scan draft (D1):** delete `scan-draft.spec.ts` "legacy Blob drafts…", and list the upstream Blob reader as an upstream follow-up.
4. **Quint pins (T10):** `resident-stub.ts` is imported and hashed by the live harnesses `specs/quint/refinement/composition/controllers.mjs`, `composition/index.mjs` and `application/shell-coordinator.mjs`. A merge or move must update them in the same commit.
5. **Selection seed shape:** `{kind:'offline',localApps:true}` (`responsive-surfaces.production:22`, `saved-signin-retry.production:25`) is an old shape. Use `{kind:'offline'}` from one harness constant, which also replaces the about 15 inline `alpha.connection.selection.v1` literals in this chunk.
6. **Redundant `test.skip(project!=='production')`** in `settings.production:11` and `settings-truth.production:9`: delete them.
7. **`resident-stub.ts` dead code:** `emailCode` (no caller) and the cli-session branch (not a product route; `managed-service-routes.ts:3`).
8. **Host-test twins:** `test/scan-review-pdf-errors.test.mjs` (bundles `scan-searchable-review.ts`, T2) and the comments in `test/app-update.test.mjs` and `test/settings-truth.test.mjs` point at specs here. Delete or update them in their chunks.
9. **Cost:** real Tesseract OCR runs in `scan-event`, `scan-links`, `scan-searchable` (3 tests) and `scan-text-draft` (one re-recognition). Reduce this to one real-OCR test in the Scan section and use `stubOcr` elsewhere. Remove about 28 s of fixed sleeps from `shell-toast` and about 2 s from `settings-device-facts` with `page.clock`. Collapse `root-view-states` from 48 to 12 page boots.
10. **Screenshot receipts (B5):** about 20 `page.screenshot({path: outputPath})` calls in this chunk have no consumer. Delete them.

## Owner questions

1. Is the browser (non-Android) build a product surface? The web `getUserMedia` document camera (`scan-page-camera`) and "a browser build never checks for updates" only matter if it is.
2. Mock-mode Settings (Accounts → Add account, `settings-page-accessibility`) and the development stand-in shade (`?shell=launcher`, the Notifications view in `root-view-states`): are these retained dev surfaces under D19, or are they deleted?
3. Should the upstream `plugin-files` scan algorithm tests (correction, edges, draft store, pdf) be kept here until upstream gains its own suite, or moved upstream now? D14 says not in this change, so the recommendation is to keep them.
4. `shaw-ui-fixtures.spec.ts` produces badge-stamped screenshots for owner review. Is any manual review process still using them before they are deleted?
