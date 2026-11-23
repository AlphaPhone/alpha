# Chunk test-20: Playwright specs `production-surface` … `resident-recovery.production`

30 files, all Playwright specs under `test/browser/`, about 2,900 lines. Reports are in `files/test/browser/<name>.md`.

## Verdicts

| File | Kind | Verdict | Target |
|---|---|---|---|
| production-surface.spec.ts | production, journey + 3 inline bridges | MERGE (delete bundle-text test, legacy-selection cases) | `journeys/production-gating.spec.ts` (prod); P-43 matrix → `journeys/connection-cloud.spec.ts` (prod) |
| proposal-recovery.spec.ts | chromium, journey over paired dev agent | MERGE | `journeys/chat.spec.ts` |
| provider-key-reconnect.production.spec.ts | production journey | MERGE | `journeys/connection-cloud.spec.ts` (prod) |
| reading-capability.spec.ts | chromium journey (+1 forged event) | MERGE | `journeys/browser.spec.ts` |
| reading-review.spec.ts | chromium, review opened by module import; test 8 unit-in-browser | MERGE tests 1-7; DELETE test 8 (or 1 case in `test/integration/voice.test.ts`) | `journeys/browser.spec.ts` |
| reading-sensitive.spec.ts | source-text (vendor Java slice) + upstream module + module-in-page | REWRITE (4 cases) | `journeys/browser.spec.ts` |
| reading-source.spec.ts | module-in-page + upstream module | MERGE 5 cases | `journeys/browser.spec.ts` |
| recording-question.spec.ts | chromium journey, store seeding + `alphaClient`/React-fiber patching | MERGE | `journeys/notes.spec.ts` |
| reduced-motion-harness.spec.ts | harness test + CSS probe | DELETE test 1; MERGE test 2 | `journeys/accessibility.spec.ts` |
| remaining-dialog-layout.spec.ts | module-in-page, mostly dev simulators | MERGE product dialogs; DELETE simulator cases | `journeys/accessibility.spec.ts` |
| remaining-subview-accessibility.spec.ts | chromium journey (mock deep links) | MERGE | `journeys/accessibility.spec.ts` |
| reminder-action-storage.spec.ts | module-in-page (upstream journal), cross-browser | DELETE (carry 1 cross-tab step) | `journeys/reminders.spec.ts` |
| reminder-create-review.spec.ts | journey + prototype patching, cross-browser | MERGE 6 of 16 modes | `journeys/reminders.spec.ts` |
| reminder-creation-storage.spec.ts | module-in-page + legacy archive, cross-browser | DELETE | – |
| reminder-decision-review.spec.ts | journey + prototype/locks patching, cross-browser | MERGE 7 of 21 | `journeys/reminders.spec.ts` |
| reminder-delete-review.spec.ts | journey, cross-browser | MERGE 4 cases (with `durable-delete-undo`) | `journeys/reminders.spec.ts` |
| reminder-lifecycle.spec.ts | module-in-page | DELETE test 1; REWRITE test 2 as Reopen UI step | `journeys/reminders.spec.ts` |
| reminder-notice-question.spec.ts | chromium journey | MERGE | `journeys/notifications.spec.ts` |
| reminder-notice-taps.spec.ts | chromium journey, inline bridge | MERGE (all 10 modes) | `journeys/notifications.spec.ts` |
| reminder-notification-dismissal.spec.ts | module-in-page (browser stand-in) | DELETE | – |
| reminder-refusal-ui.spec.ts | chromium journey, expected text from product code | MERGE | `journeys/reminders.spec.ts` |
| reminder-storage-migration.spec.ts | module-in-page + legacy migration, cross-browser | DELETE | – |
| reminder-timing-review.spec.ts | mixed journey / plugin-API / upstream contract | MERGE 8 UI cases; DELETE API cases | `journeys/reminders.spec.ts` |
| reminder-v2-assistant.spec.ts | chromium journey over paired dev agent, legacy seed, product import in Node | MERGE v2 cases; v1 cases pending owner | `journeys/chat.spec.ts` |
| render-error-recovery.spec.ts | chromium journey | MERGE | `journeys/home-shell.spec.ts` |
| reset-only.production.spec.ts | production journey | DELETE test 1; MERGE test 2 | `journeys/production-gating.spec.ts` (prod) |
| resident-background-results.spec.ts | chromium journey, resident fake + inline bridge | MERGE | `journeys/digests.spec.ts`; mock entry → `journeys/dev-surface.spec.ts` |
| resident-failures.production.spec.ts | production journey | MERGE | `journeys/chat.spec.ts` (prod) |
| resident-first-run.production.spec.ts | production journey | MERGE | `journeys/connection-cloud.spec.ts` (prod) + `journeys/startup-permissions.spec.ts` (prod) |
| resident-recovery.production.spec.ts | production journey | MERGE | `journeys/connection-cloud.spec.ts` (prod) |

Totals: DELETE 4 files whole (`reminder-creation-storage`, `reminder-storage-migration`, `reminder-notification-dismissal`,
`reminder-action-storage`), plus partial deletions in 9 others. KEEP 0 as separate files. MERGE or REWRITE 26.
Six entries leave `scripts/storage-specs.ts` (cross-browser list): lines 17, 31-33, 35-36.

## Coverage that would be lost if the DELETEs happen without replacement

- **Native reading extraction refusal (Android).** `reading-sensitive` is the only local test of the vendor
  `BrowserPageReading.EXTRACT` script, done by slicing Java text. After deletion it depends on upstream tests or Android
  instrumentation (`BrowserReadingNavigation`). Needs an upstream follow-up (D14).
- **Resident reading binding change aborts speech** (`reading-review` test 8). Only coverage of `createNativeReadingVoice`
  choosing the resident binding and aborting on session change. Replacement: one case in `test/integration/voice.test.ts`.
- **Reopen a completed reminder** (`reminder-lifecycle` test 2). No journey drives Reopen (`reminder-adapter.ts:407`).
  Replacement: a UI step in `journeys/reminders.spec.ts`.
- **Held notice-dismissal races** (`reminder-notification-dismissal`). Browser stand-in only; on a phone the native
  `DailyApps` owns it. Acceptable loss if Android instrumentation covers the race; otherwise one Node integration case.
- **Cross-tab retention of reminder creations, actions and schedules.** Three per-store tests collapse into one
  cross-tab journey step that must stay in the firefox/webkit storage list.
- **Production retained-data notice** (`reset-only` test 2) survives only if it is re-seeded through IndexedDB, because the
  localStorage seed stops working when the legacy import is deleted.

## Shared helpers worth keeping / creating

- `harness/plugins/agent-proposals.ts`: the paired-dev-agent + proposal + journal fixture now copied in `proposal-recovery`
  and `reminder-v2-assistant`.
- `harness/plugins/agent.ts`: declares the full Agent surface (provider-key methods, `cancelStart`, `reviewRecovery`,
  `archiveRecovery`) so specs stop pushing methods into `PluginHeaders` (`provider-key-reconnect`, `resident-recovery`,
  `production-surface`).
- `harness/plugins/notifications.ts` (or the `DailyApps` fixture): durable reminder-tap queue from `reminder-notice-taps`,
  shared with `delivery-fixture`.
- `harness/plugins/permissions.ts`: fresh-install permission ports from `resident-first-run`.
- `harness/plugins/calendar.ts` `createReminder(page,{alert,repeat})` and a `DailyApps` outcome injector (lost response,
  unknown, held, refusal) to replace the `BrowserDaily.prototype` patches in five reminder specs.
- `harness/storage.ts` `corruptDomainRecord(page,key)`: seeds damaged data in IndexedDB once the localStorage import is gone.
- `connectLocalDevAgent(page)` and `startResidentInDev(page)` for the dev-diagnostics connection steps repeated in four specs.

## Cross-file actions

1. **Legacy localStorage seeding breaks with C6.** `reminder-v2-assistant` (setup), `reminder-create-review`
   (`sibling-pending`, `history-navigate`), `reminder-action-storage` t4, `reminder-creation-storage`, `reminder-storage-migration`
   and `reset-only` t2 seed or intercept `alpha.browser.*.v1` localStorage keys that reach the store only through the
   legacy domain-document import (`json-domain-document.ts:12`). They must be re-seeded or deleted in the same change that
   removes the reader.
2. **`openLegacyNotes` users.** `production-surface`, `recording-question`, `remaining-subview-accessibility`,
   `render-error-recovery`, `reset-only` use `helpers/legacy-notes.ts` (51 specs suite-wide). All must switch to the current
   Notes view when the legacy Notes engine (C1) goes.
3. **Dev-only recovery dialog.** `domain-recovery.ts:9` shows backup/reset only with `testMocksEnabled`; production shows
   `retained-data-notice`. Three reminder specs test the dev dialog; keep one dev recovery check suite-wide.
4. **Wallet references in tests.** `production-surface:51` (`start=wallet`) and `remaining-dialog-layout:11` (receipt with
   `wallet` state; `browser/workflow-receipts.ts` reads it) must change with the Wallet deletion (D2).
5. **Rename `production-surface.spec.ts`** to the `*.production.spec.ts` pattern and drop the special case from
   `playwright.config.ts:10`, `scripts/ci/affected.ts:58`, `.github/workflows/browser.yml:198`, `scripts/qualify-head.ts`,
   and the host tests `test/playwright-projects.test.mjs` and `test/ci-required-checks.test.mjs` that assert the regex.
6. **Merge `durable-delete-undo.spec.ts`** (other chunk) with the deletion section from `reminder-delete-review`.
7. **Upstream follow-ups (D14):** JS extraction in `BrowserPageReading.java`, `page-source.ts` byte/UTF-8 limits,
   `reminder-contract.ts` validation, and `createReminderActionJournal` semantics need tests upstream.

## Owner questions

- Reminder timing v1 (no `alertMinutes`, no `timingVersion`) and v1-only peers: can they exist on a fresh install whose agent is
  the same-build resident? If not, the 8 v1 cases in `reminder-v2-assistant`, the "legacy" API cases in
  `reminder-timing-review`, and the client v1 path are legacy (A1) and go together.
- "Legacy uncertain deletion" (`reminder-delete-review:50`): does any current path still journal `reminder_cancel` for a
  Calendar deletion, or is that row shape legacy-only?
- Is the native Android reading extraction refusal (credential prose, interactive controls) covered by instrumentation or
  upstream tests? If not, removing `reading-sensitive`'s Java slice leaves it untested here.
- Are the browser reminder and notification stand-ins (`browser/daily.ts`, `browser/notifications.ts`) product code for the
  web build or development stand-ins? That decides whether their race guards need any test outside Android.
