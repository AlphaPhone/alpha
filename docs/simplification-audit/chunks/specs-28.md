# Chunk specs-28: `specs/quint/refinement/application` (day-anchor … google-consent-admission.md)

All 29 files were read in full, along with the fixtures they depend on (`test/fixtures/use-in-email-review.mjs`,
`test/fixtures/first-send-draft-migration.mjs`, `test/fixtures/google-account-panel.mjs`, `calendar-adapter-fixture.mjs`,
`notes-files-media-itf.mjs`), the manifest entries and the product files they execute. Reports are in
`files/specs/quint/refinement/application/`. Every text anchor was checked against the working tree on 2026-11-11.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `day-anchor.mjs` | Quint replay, real bundled Calendar adapters (closure probes live in the shared fixture) | KEEP | – |
| `device-action-review.mjs` | Quint harness, real module via `bundledSource` | KEEP | – |
| `dock-clearance-ownership.mjs` | Quint harness, transplant (strip + regex import removal + `vm.Script`), hash ceremony | PORT | esbuild bundle of `runtime/dock-clearance.ts`; installed handle tracked by the driver |
| `domain-document-creation.mjs` | Quint replay of the **legacy** domain-document import | DELETE | with `DomainDocumentCreation.qnt`, its manifest entry and `test/quint-domain-document-creation.test.mjs` |
| `drawer-interaction-fixture.tsx` | browser fixture, real Home adapter + shared drawer | KEEP | – |
| `drawer-interaction.md` | prose | MERGE | header of `drawer-interaction.mjs` |
| `drawer-interaction.mjs` | Quint harness, Chromium, 3 text seams in upstream drawer | KEEP | timer seams → page-level timer override; ref seam → DOM or upstream hook |
| `email-suggestion-review.mjs` | Quint harness over a transplant fixture | PORT | esbuild bundle of `use-in-email-review.ts` with virtual `connection-ui`/`inline-modal` ports; fixture moves next to harness |
| `files-browser-coordinator.md` | prose | MERGE | header of `files-browser.mjs` |
| `files-browser-coordinator.mjs` | Quint harness, upstream Files adapter, 1 closure seam | MERGE | `specs/quint/refinement/application/files-browser.mjs` |
| `files-filter.md` | prose | MERGE | header of `files-browser.mjs` |
| `files-filter.mjs` | Quint harness, upstream Files adapter, 1 closure seam | MERGE | `files-browser.mjs` |
| `files-preview.mjs` | Quint harness, transplant via `sourceContext`; **aggregate-only runner** | PORT + MERGE | `files-browser.mjs` (`checkFilesPreview`) |
| `files-recent-index.mjs` | Quint replay; asserts 4 code strings in `selection-adapter.ts` then runs a copy; rewrites `RECENT_LIMIT` | PORT | export two selection helpers; `createFilesIndex(..., limit)` |
| `find-in-page.mjs` | Quint replay over a 4-anchor slice of `browser-adapter.ts` | PORT | extract `prototype/browser-find.ts` (`createFindBar`) |
| `first-send-draft-migration.md` | prose | MERGE | header of `first-send-draft-migration.mjs` |
| `first-send-draft-migration.mjs` | Quint harness over a slice of `agent-adapter.ts` | PORT | export `settleFirstSendSlot` from its own module |
| `focus-identity-audit.md` | orphan prose, no model or harness | DELETE | – |
| `google-access-publication.mjs` | Quint harness, real bundle with specifier ports | KEEP | import `deferred` from `./support.mjs`; drop input allow-list |
| `google-calendar-access-choice.md` | prose | MERGE | harness header |
| `google-calendar-access-choice.mjs` | Quint harness over the `google-account-panel.mjs` transplant | KEEP | port the fixture to the bundled panel helper |
| `google-calendar-disconnect.md` | prose | MERGE | harness header |
| `google-calendar-disconnect.mjs` | Quint harness, real bundle, 1 **comment**-anchored seam | KEEP | observe via ports/result; no comment anchor |
| `google-calendar-link-flow.md` | prose | MERGE | harness header |
| `google-calendar-link-flow.mjs` | Quint harness, real bundle, 3 text seams | KEEP | observe via port arguments and result; delete the plugin |
| `google-calendar-link-publication-fixture.jsx` | browser fixture, real panel | KEEP | becomes the shared panel-mount helper |
| `google-calendar-link-publication.md` | prose | MERGE | harness header |
| `google-calendar-link-publication.mjs` | Quint harness, Chromium, virtual ports + 1 hook-locals seam | KEEP (overrides C3 DELETE) | – |
| `google-consent-admission.md` | prose | MERGE | header of `google-consent-admission.mjs` |

Counts: 10 KEEP, 2 DELETE, 17 MERGE/PORT (9 prose merges, 2 harness merges, 6 ports).

## Key findings

1. **The working tree currently breaks every Quint command.** Stage A removed the legacy reader from
   `apps/app/src/browser/domain-document.ts`. The `DomainDocumentCreation` manifest entry still pins `readOrCreate` and
   `unchanged`, which no longer exist, and `quint-lib.ts:238-244` checks symbols when any Quint command loads. The model,
   manifest entry, harness and test must be deleted in the same commit as the reader. The harness was already wrong:
   it passes a third legacy-reader argument that the constructor now ignores.
2. **The delete ledger is wrong about the Google panel.** `delete-candidates.md` C3 lists
   `google-calendar-link-publication.{mjs,md}` and `test/fixtures/google-account-panel.mjs` as part of the unreachable
   client linked-sync stack. They are not part of it. Settings → Google Calendar (`settings-adapter.ts:861`) calls
   `googleConnectionController.openCalendar`, then `linkGoogleCalendar` (`google-connection-ui.tsx:299`), then
   `AgentCalendar.changeSync`, which is the live D4 path. `google-account-panel.mjs` is also imported by two live
   harnesses (`google-calendar-access-choice.mjs`, `google-consent-admission.mjs`) and by `test/google-calendar-connect.test.mjs`.
   Port these files; do not delete them.
3. **`files-preview.mjs` has no per-model test.** Only the application aggregate runs it. The aggregates are slated for
   deletion (ci-and-formal §2.4). The merged Files test must call it, or `FilesPreview` stops being checked without
   anyone noticing.
4. Text anchors that a formatter or a refactor of a god module will break (all still match today):
   - `agent-adapter.ts`: `function settleFirstSendSlot(` and `/**\n * A new chat`. The file has a 426-line
     working-tree diff.
   - `browser-adapter.ts`: four anchors. One of them is a comment.
   - `selection-adapter.ts`: four literal statements.
   - `files-index.ts`: `export const RECENT_LIMIT=24;`.
   - `google-accounts.ts`: three seams for link-flow and one comment for disconnect.
   - `google-connection-ui.tsx`: `' function accountRead(){'` and `' async function load(){'` (the second is in the
     fixture).
   - Upstream `files-browser-adapter.ts` `'  const repaint = () =>'`, shared by three harnesses.
   - Upstream `InstalledAppsGridDrawer.tsx`: three seams.

   D9 (Prettier) must not land before the ports in this chunk.

## Behaviours that lose all coverage if the DELETEs happen

- `domain-document-creation.mjs`: after D1, the product keeps three behaviours. An empty domain read writes nothing. The
  first edit creates the document. An unrecognised envelope raises "Browser document metadata needs recovery". Only
  incidental coverage remains: `google-access-publication.mjs` edits through `BrowserDomainDocument`, and the
  preference journeys do too. If the owner wants explicit coverage, add one case to a browser-storage integration test
  instead of a new model.
- `focus-identity-audit.md`: nothing executable is lost.

## Shared helpers worth keeping or creating

- `support.mjs` `deferred`/`tick`: `google-access-publication.mjs` must import them from here instead of
  `legacy/core/source-support.mjs`. This removes one of the three live blockers to retiring `specs/quint/legacy`.
- A new `compileFilesAdapter`/`bootFilesAdapter` in `files-browser.mjs`, replacing three copies of the same bundle and
  boot code.
- One Google panel mount helper built on `google-calendar-link-publication.mjs`'s importer-scoped virtual-port esbuild
  plugin plus `google-calendar-link-publication-fixture.jsx`. It replaces the JSDOM transplant in
  `test/fixtures/google-account-panel.mjs`, which would then be deleted after the three harnesses move over.
- The esbuild "virtual port by import specifier" technique is the general replacement for regex import-stripping. Use it
  for `email-suggestion-review` and `dock-clearance-ownership`.

## Cross-file actions

1. Delete as one change: `DomainDocumentCreation` (model, manifest entry, harness, test).
2. Fix `delete-candidates.md` C3: remove `google-calendar-link-publication.{mjs,md}` and `test/fixtures/google-account-panel.mjs`.
3. Merge `files-browser-coordinator.mjs`, `files-filter.mjs` and `files-preview.mjs` into `files-browser.mjs`. Merge their
   three tests into `test/quint-files-browser.test.mjs`, which includes `checkFilesPreview`. Drop `filesPreview` from
   `index.mjs`.
4. Product exports needed for the ports:
   - `settleFirstSendSlot` moves to its own module.
   - `createFindBar` in `prototype/browser-find.ts`.
   - Two `selection-adapter.ts` helpers (accept and close sequences).
   - A `limit` parameter on `createFilesIndex`.
5. Delete all nine refinement `.md` notes in this chunk after moving two or three header lines into each harness. Nothing
   reads them (`git grep` = 0), and their checkpoint and schedule counts are already stale in at least one case.
6. Lane gating:
   - The Files trio and `drawer-interaction` execute upstream code copied verbatim. They should run only on
     `upstream.lock.json`, model, or (drawer) `home-shell.ts` changes.
   - Every harness in this chunk except `files-preview` is run twice: by its per-model test and by the aggregate (T4).
7. Remove receipt ceremony: self-hashing of drivers and tests, the `.source.json`/vendor byte-equality checks in
   `dock-clearance-ownership` and `email-suggestion-review`, the compiled-input allow-list in `google-access-publication`,
   and exact `traces === 11` in `test/first-send-draft-migration.test.mjs`.

## Owner questions

1. `GoogleCalendarLinkPublication` has five `browserHost=true` schedules (plus the `browser-cloud-resident` port). They
   drive a development-only loopback host (`import.meta.env.DEV && VITE_ALPHA_CLOUD_RESIDENT==='1'`). Keep them as
   dev-tooling evidence (D6), or drop them?
2. After the legacy reader is deleted, should the surviving `BrowserDomainDocument` behaviour get one integration case, or
   no dedicated coverage?
3. Are small product exports made only so harnesses can import instead of slice acceptable (D7 tension)? They are
   `settleFirstSendSlot` module, `createFindBar`, the selection-adapter helpers and the `createFilesIndex` limit.
   Otherwise those four models keep text-anchored harnesses.
4. Should upstream (`elizaOS/eliza`) be asked for read-only inspection hooks in `files-browser-adapter.ts` and
   `InstalledAppsGridDrawer.tsx` (D14 follow-up)? Otherwise those harnesses keep their closure seams.
