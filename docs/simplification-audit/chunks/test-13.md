# Chunk test-13: Gmail/Maps specs and `test/browser/helpers/` (29 files)

Per-file reports: `docs/simplification-audit/files/test/browser/**`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `gmail-mvp-scope.spec.ts` | Playwright chromium; real UI, backdoor setup + store patches | REWRITE | basis of `journeys/inbox.spec.ts` |
| `gmail-notice-question.spec.ts` | Playwright chromium; UI + backdoor Cloud snapshot | MERGE | `journeys/notifications.spec.ts` (with `reminder-notice-question`) |
| `google-maps-raster.production.spec.ts` | Playwright production; real UI journey, inline bridge | MERGE | `journeys/maps.spec.ts` |
| `helpers/browser-calendar.ts` | fiber-walk backdoor + prototype patch + 1 UI helper | SPLIT (DELETE most) | `chooseCalendarEventAction` → `harness/nav.ts` |
| `helpers/calendar-review.ts` | UI helper | MERGE | `harness/nav.ts` |
| `helpers/calendar-storage-hold.ts` | IndexedDB hold (dup of `calendar-fixture.ts`) | DELETE | — |
| `helpers/canonical-calendar.ts` | CalendarService fake (2 transports) | MERGE | `harness/plugins/calendar.ts` |
| `helpers/canonical-notes.ts` | agent Notes record server + prototype patches | REWRITE | `harness/plugins/notes.ts` |
| `helpers/cloud-connection-notices.ts` | DOM observer (live Quint dep) | KEEP | move to `harness/cloud.ts` |
| `helpers/cloud-plan-settings.ts` | UI helper | MERGE | `harness/nav.ts` |
| `helpers/connection-diagnostics.ts` | backdoor `connectionController.open()` (69 users) | REWRITE | `harness/nav.ts` `openConnectionHelp()` |
| `helpers/delivery-fixture.ts` | inline bridge, mostly dead fields | MERGE | `harness/plugins/{agent,notifications}.ts` |
| `helpers/home-calendar.ts` | CalendarService port for Home | MERGE | `harness/plugins/calendar.ts` |
| `helpers/legacy-notes.ts` | legacy "Previous notes" seed (D1) | DELETE | callers → `harness/plugins/notes.ts` |
| `helpers/mail-actions.ts` | UI helper | MERGE | `harness/nav.ts` |
| `helpers/native-cloud-plan-fixture.ts` | Cloud plan bridge fake + signer (live Quint dep) | MERGE | `harness/cloud.ts` |
| `helpers/native-cloud-signin.ts` | private second Vite server + sign-in fake | REWRITE | `harness/cloud.ts`, production lane |
| `helpers/native-navigation-protocol.ts` | agent navigation protocol fake (pinned by 10 Quint harnesses) | MERGE | `harness/plugins/agent.ts` |
| `helpers/native-notes.ts` | legacy native Notes slot seed (D1) | DELETE | callers → `harness/plugins/notes.ts` |
| `helpers/note-schedule-contract.ts` | source rewrite of served `main.tsx` | DELETE | owner question |
| `helpers/ocr-stub.ts` | route fixture | KEEP | `harness/plugins/ocr.ts` |
| `helpers/one-calendar.ts` | merged Calendar fake | MERGE | `harness/plugins/calendar.ts` |
| `helpers/owned-photo.ts` | seed backdoor + UI menu helpers | SPLIT | menus → `harness/nav.ts`; seed → `harness/plugins/photos.ts` |
| `helpers/page-modules.ts` | workaround for `/src` evaluates | KEEP, then DELETE | last caller gone / Quint support folder |
| `helpers/photos-bridge.ts` | Photos bridge fake | MERGE | `harness/plugins/photos.ts` |
| `helpers/resident-agent-plugin.ts` | Agent plugin model (2nd resident fake) | MERGE | `harness/plugins/agent.ts` (with `resident-stub.ts`) |
| `helpers/retained-digests.ts` | backdoor window event | REWRITE | `harness/nav.ts` via Automations → Scheduled digests |
| `helpers/settled.ts` | wait helper | KEEP | `harness/time.ts` |
| `helpers/startup-frames.ts` | paint recorder | KEEP | `journeys/startup-permissions.spec.ts` |

Counts: DELETE 4 (`calendar-storage-hold`, `legacy-notes`, `native-notes`, `note-schedule-contract`); KEEP 5
(`cloud-connection-notices`, `ocr-stub`, `page-modules` (temporary), `settled`, `startup-frames`); MERGE/REWRITE/SPLIT 20.

## Behaviours that lose all coverage if the DELETEs happen without replacement
- **Note → event / reminder draft review from Notes** (`scheduleDraft` via `toEvent`/`toCal` in
  `apps/app/src/prototype/canonical-notes-ui.ts:308-315`). Its only tests go through `note-schedule-contract.ts`
  (`note-calendar-handoff`, `journey-b-voice-note-actions`). The UI controls were removed, so no journey can reach it.
  This needs an owner decision (restore the controls or delete the actions).
- **Share note → Email and draft preservation** (`gmail-mvp-scope`, nine cases) and **summary → note on the production
  bundle** (`document-summary-note.production`, `native-speech.production`). They reach Notes only through
  `legacy-notes.ts` / `native-notes.ts`. They must move to the canonical Notes fixture *in the same change* that deletes
  the legacy engine. Deleting them is wrong.
- Around 55 specs use `openLegacyNotes` only as "open a Notes screen", and 43 use `openBrowserCalendar` only as
  "open a Calendar screen". Deleting the helpers without migrating those specs would remove broad Notes/Calendar UI
  coverage. Most of these are micro-specs that `journeys/notes.spec.ts` and `journeys/calendar.spec.ts` will replace.
- Nothing is lost when `calendar-storage-hold.ts` goes: both of its importers test the backup feature (D3) or the
  dev browser-calendar stand-in.

## Shared helpers worth keeping (proposed homes)
- `harness/nav.ts`: `chooseCalendarEventAction`, `reviewCalendarAction`, `chooseMailAction`, `openCloudPlanFromSettings`,
  `confirmCloudSignOut`, the photo menu helpers, a new `openConnectionHelp()` (replaces 69 backdoor uses) and
  `openScheduledDigests()`.
- `harness/plugins/calendar.ts`: one CalendarService fake built from `canonical-calendar`, `home-calendar` and
  `one-calendar` (they hold three copies of the same calendar/event/next-context records). It answers at
  `Agent.request` so it works on both builds.
- `harness/plugins/notes.ts`: from `canonical-notes.ts`, without the `CanonicalNotesController`/`BrowserDaily` prototype patches.
- `harness/cloud.ts`: `native-cloud-plan-fixture` + `native-cloud-signin` fakes, one entitlement signer (it is copied
  verbatim today), and `observeCloudNotices`.
- `harness/plugins/agent.ts`: `resident-agent-plugin` + `native-navigation-protocol` + `resident-stub.ts`.
- `harness/time.ts`: `settled`, `frames`. `harness/plugins/ocr.ts`: `stubOcr`. `harness/plugins/photos.ts`: `photosBridge`.

## Cross-file actions
- `journey-core-loops.production.spec.ts:2,23`: delete the `note-schedule-contract` import and `beforeEach`. The
  production bundle never requests `/src/main.tsx`, and the spec never calls the hook, so this is dead setup on every test.
- Delete the T5 host tests that read helper source text: `test/flag-off-navigation-protocol.test.mjs`
  (`native-navigation-protocol.ts`) and `test/resident-agent-fixture-provider-status.test.mjs` (`resident-agent-plugin.ts`).
- Quint coupling (T10/P6). Live refinement harnesses import or pin `native-cloud-plan-fixture.ts`,
  `cloud-connection-notices.ts`, `resident-agent-plugin.ts`, `native-navigation-protocol.ts` and `page-modules.ts`
  (`application/account-sheet.mjs`, `application/cloud-connection-notices.mjs`, `application/shell-coordinator.mjs`,
  `composition/index.mjs`, `native/copy-receipt.mjs`). Any move updates their imports and pin lists in the same commit.
  `specs/quint/legacy/*` harnesses (still listed by `scripts/check-quint.ts:42` and `scripts/quint-lib.ts:43`) import
  `canonical-notes`, `legacy-notes`, `home-calendar`, `one-calendar`, `native-cloud-signin` and `page-modules`.
  Deleting `legacy-notes.ts` therefore needs the `notes-view` legacy harness retired or ported first.
- `scripts/test-inbox-drafts-browser.ts` (imports `mail-actions`) and `scripts/test-notes-documents-browser.ts` (imports
  `page-modules`) are `scripts/test-*` Playwright scripts (T9/P16). They should move into `test/browser` or be deleted
  by the scripts chunk.
- `delivery-fixture.ts` has a large dead surface: hosted-results ledger, workflow taps, owner withdrawals and
  notification-collection holds. Neither importer uses any of it. Drop it when merging.
- Research correction: `selectLegacyNotesSource` does have one external user, `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`.
- `retained-digests.ts` says no user route exists. One does: Automations lists "Scheduled digests"
  (`apps/app/src/prototype/automations-adapter.ts:181`).

## Owner questions
1. Notes → "Review event / Review reminder": the menu controls were removed, but `toEvent`/`toCal` and their specs remain,
   reachable only through an injected global. Should the controls come back, or should the Notes-side scheduling be deleted?
2. `native-cloud-signin.ts` runs sign-in on a private Vite composition (chooser + permissions only). Can these journeys run
   on the production bundle instead, where Home also renders?
3. The `restored` Gmail readiness case tests the offline service-read cache. Is offline Inbox cache coverage wanted in the journey?
