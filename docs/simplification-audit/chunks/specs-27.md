# Chunk specs-27 summary

Application refinement harnesses `calendar-preservation-confirmation` .. `contracts` (30 assigned paths, 29 present).

| File | Kind | Verdict |
|---|---|---|
| `specs/quint/refinement/application/calendar-preservation-confirmation.mjs` | deleted already (legacy calendar preservation) | DELETE (done) |
| `.../camera-focus-writes.mjs` | ITF replay, real module via esbuild | KEEP (drop the regex-mutation case in its test) |
| `.../camera-preview-retirement.md` | prose | KEEP (trim counts/history) |
| `.../camera-preview-retirement.mjs` | mounted Chromium harness | KEEP |
| `.../canonical-calendar-draft-handoff.md` | prose | KEEP (remove legacy-preservation clause) |
| `.../canonical-calendar-draft-handoff.mjs` | mounted Chromium harness | KEEP, delete the `{ready:false}` legacy-preservation schedule + model test `unavailableCanonicalSourceRetainsOriginTest` |
| `.../canonical-calendar-draft.md` | prose | KEEP (trim) |
| `.../canonical-calendar-draft.mjs` | bundle with import ports | KEEP |
| `.../canonical-calendar-editor-close.md` | prose | KEEP (trim) |
| `.../canonical-calendar-editor-close.mjs` | mounted Chromium harness | KEEP |
| `.../canonical-notes-controller.md` | prose | KEEP (trim) |
| `.../canonical-notes-controller.mjs` | bundle of real module | KEEP |
| `.../canonical-notes-draft.md` | prose | KEEP (trim) |
| `.../canonical-notes-draft.mjs` | bundle + text patch of upstream `notes-editor.ts` | PORT (captured save from pending request, or upstream getter) |
| `.../canonical-notes-feedback.md` | prose | KEEP (trim) |
| `.../canonical-notes-feedback.mjs` | bundle with specifier-keyed port stubs | KEEP (PORT stubs to constructor options) |
| `.../canonical-notes-mutation.md` | prose | KEEP (trim) |
| `.../canonical-notes-mutation.mjs` | bundle (inherits draft patch) | KEEP (follows draft port) |
| `.../canonical-notes-view.md` | prose | KEEP (trim) |
| `.../canonical-notes-view.mjs` | bundle + five minified text anchors in `canonical-notes-ui.ts` | PORT (observer hook on `CanonicalNotesUi.hooks`) |
| `.../canonical-notification-tap-admission.mjs` | transplant (slice + strip + vm) | PORT (export tap-owner factory with injected ports) |
| `.../chat-attachments.mjs` | transplant (slice `agent-adapter.ts`) + composer fixture | PORT (`runtime/chat-attachments.ts`; composer module) |
| `.../client-observation-support.mjs` | real module import | KEEP (drop contract-hash ceremony) |
| `.../clients.mjs` | real module import | KEEP (needs own test wrapper) |
| `.../cloud-connection-notices.md` | prose | KEEP (drop bug-history paragraph) |
| `.../cloud-connection-notices.mjs` | own Vite + Chromium harness | KEEP, or MERGE into `journeys/connection-cloud.spec.ts` (owner call) |
| `.../cloud-plan-recheck.mjs` | transplant (13 anchors in `connection-ui.tsx`, vm) | PORT (`plan-recheck.ts` module) |
| `.../committed-view-observation.mjs` | harness over transplant fixture | KEEP harness, PORT `test/fixtures/committed-view-observation.mjs` |
| `.../composer-send.mjs` | ITF replay over transplant (6 slices of `agent-adapter.ts`) | PORT (composer-send module) |
| `.../contracts.mjs` | four mini campaigns | SPLIT: DELETE `notesLifecycle` + `NotesLifecycle.qnt`; KEEP `calendarPresentation`, `permissionWalkthrough`; `credentialVault` follows the dev vault (owner) |

## Coverage lost by the DELETEs / breakages already present
- `contracts.mjs` `notesLifecycle` is already broken: `apps/app/src/runtime/notes-store.ts` now only re-exports a type. Legacy store behaviour is deleted on purpose (D1). Its canonical half is covered by `canonical-notes-controller/draft/mutation`. Trash retention boundary and restore of an expired-vs-live entry lose their only model-level check: needs a Notes journey case (`journeys/notes.spec.ts`: delete, restore from Trash, expiry) or a canonical Trash model.
- `canonical-calendar-draft-handoff.mjs` schedule "unapproved preservation never admits a canonical Note event" is broken (fixture no longer accepts `legacyTitle`). The "canonical source not ready refuses Note handoff" property loses coverage unless re-expressed with a loading status.
- `clients.mjs` (AssistantConversation, Application) and `contracts.mjs` survivors are run **only** by the aggregate `test/quint-application-refinement.test.mjs`. Deleting the aggregate (recommended, T4) silently drops them: add per-model wrappers first.
- `chat-attachments.mjs` and `cloud-plan-recheck.mjs` hash `index.mjs` and `test/quint-application-refinement.test.mjs` as inputs: deleting the aggregate makes `captureInputs` throw. Remove those entries in the same change.

## Shared helpers worth keeping / creating
- Keep: `support.mjs` (`bundledSource`, `sourceModule`, `deferred`, `tick`, `trace`, `checkpoint`, `boundInputs`), `notes-files-media-itf.mjs` `loadProductModule` (the target shape: bundle the real module with ports), `test/fixtures/calendar-mounted-editor.mjs`, `test/fixtures/canonical-calendar-draft-owner.mjs`, `test/fixtures/camera-preview-port.mjs`.
- Create: `refinement/application/notes-fixtures.mjs` holding `createCanonicalNotesFixture`, `createCanonicalNotesEditorFixture`, `createCanonicalNotesUiFixture` (now exported from three harness files and imported by `test/canonical-notes-draft-copy.test.mjs`).
- Create: a mounted-campaign scaffold (sources/onSource capture, `schedule`, `mark`) in `calendar-mounted-editor.mjs`; copied in camera-preview, draft-handoff, editor-close.
- Create: `withGlobals(...)` save/restore helper (camera-focus, notes-feedback, others).
- `composer-send.mjs` `flush`/`gate` duplicate `support.mjs` `tick`/`deferred`.

## Cross-file actions
- Product exports needed for PORTs: `CanonicalNotesUi` observer hook + collaborators as options (`canonical-notes-ui.ts`); tap-owner factory (`notifications-adapter.ts`); `runtime/chat-attachments.ts` (`attachmentKey`, `saveAttachment`, `restoreAttachments`); composer send module out of `agent-adapter.ts` (shared by `composer-send.mjs` and `test/fixtures/chat-attachment-composer.mjs`); `plan-recheck.ts` out of `connection-ui.tsx`. Upstream (D14 follow-up): read-only captured-save getter on `NotesEditor`, exported settle callback in `views-routes.ts`.
- Delete together: `contracts.mjs` `notesLifecycle`, `specs/quint/application/NotesLifecycle.qnt`, its manifest entry, its `index.mjs` adapter entry.
- `CanonicalCalendarDraftHandoff.qnt`: remove `initWith(false)` test or re-express; edit harness and `.md` in the same commit.
- Remove `contracts.mjs` from the input lists of `permission-choices.mjs:63` and `startup-permissions-coordinator.mjs:49`.
- Delete duplicate plain-assert host tests once the campaigns cover them: `test/chat-attachment-composer.test.mjs` (keep only the Quint case, rename), `test/committed-view-observation.test.mjs`; check `test/canonical-notification-security.test.mjs` and `test/calendar-day-context.test.mjs` for overlap.
- Drop B5 counts from all `.md` companions.

## Owner questions
- `credentialVault` campaign and `CredentialVault.qnt` model the development-only vault (`passwords/dev-vault.ts`). Keep the dev vault (and model), or delete both in the dev-surface pass?
- `CalendarPresentation.qnt` (192 lines) is exercised by a single encode/decode round trip. Strengthen the campaign or retire the model?
- `cloud-connection-notices.mjs` runs its own Vite + Chromium. Move it into the Playwright chromium project as a journey that records the Quint trace, or keep it as a separate harness?
