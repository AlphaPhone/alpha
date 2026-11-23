# Chunk test-11: `test/browser/dev-*` (notifications … workflow-urgency), `device-apps-stub.ts`, `device-storage-migration`

32 files reviewed, 32 reports under `files/test/browser/`. All specs run in the chromium project against `?mode=dev`
(`device-storage-migration` also in firefox/webkit through `scripts/storage-specs.ts`). None exists only for production.

The key finding: 16 of the 19 `dev-workflow-*` specs test the **local workflow simulator**. That is a label-driven
executor stored under `alpha.dev.app.workflows` (`browser/simulated-workflows.ts`, `workflow-trigger-runtime.ts`,
`focus-state.ts`, `workflow-receipts.ts`, `workflow-local-send.ts`, `workflow-dated-sources.ts`, `workflow-calendar.ts`,
`workflow-history.ts`). Flag-off builds compile it out (`simulated-apps.ts:17-18`), and the product runs workflows on
the resident agent (AP-11). The other three (`authoring`, `execution`, `phone`) drive the **product** workflow builder
and approval UI against the development agent-protocol fake. They become the backbone of `journeys/workflows.spec.ts`.
Ten specs also depend on `helpers/legacy-notes.ts` ("Previous notes", A2), so they break when the legacy Notes deletion
lands.

## Files

| File | Kind | Verdict | Target / carried cases |
|---|---|---|---|
| dev-notifications.spec.ts | 5 stand-in unit tests + 5 Settings/shade UI | REWRITE | `journeys/notifications.spec.ts`: settings collection+previews+shade Clear all; locked redaction in shade; history clear w/ Cancel; pending/failed policy write toggles controls; tap opens Mail |
| dev-parity.spec.ts | stand-in plugin unit tests (P7) | DELETE | carry device-controls round trip → `journeys/dev-surface.spec.ts`; calendar edit-during-review conflict → `journeys/calendar.spec.ts` only if no calendar-agent spec keeps it |
| dev-password-provider.spec.ts | UI journey + raw reads | MERGE | `journeys/settings.spec.ts`: install/select/persist/fill/lock; cancel+failed save; Home clears sample |
| dev-phone-messages.spec.ts | UI journey (telephony simulator) | MERGE | `journeys/telephony.spec.ts`: call controls + recents after reload; message after reload |
| dev-reload.spec.ts | tooling (Vite plugin) | DELETE | none (optional Node test if plugin kept) |
| dev-search-question.spec.ts | UI journey | MERGE | `journeys/chat.spec.ts` (composer sent only on Send); `journeys/home-shell.spec.ts` (Inbox attention card) |
| dev-sensors.spec.ts | 5 stand-in unit + 2 UI | REWRITE | `journeys/settings.spec.ts` (shade mic switch persists); `journeys/notes.spec.ts` (recorder stops, canonical Notes) |
| dev-speech-account-switch.spec.ts | UI + in-page voice | MERGE | `journeys/voice.spec.ts` |
| dev-surface-copy.spec.ts | UI smoke | MERGE | `journeys/dev-surface.spec.ts` (drop Wallet) |
| dev-voicemail-audio.spec.ts | UI journey + voice fixture | MERGE | `journeys/telephony.spec.ts`: read/stop/stale completion; Delete+Home retire; not-ready retry |
| dev-wallet.spec.ts | Wallet simulator UI | DELETE | (D2) |
| dev-workflow-agent.spec.ts | simulator + stub transport | DELETE | carry long-instruction width check → `journeys/workflows.spec.ts` |
| dev-workflow-authoring.spec.ts | product builder UI on dev protocol | MERGE | `journeys/workflows.spec.ts`: create typed workflow w/ review-Save; draft restored; Describe with pending save (saved, left) |
| dev-workflow-automatic-speech.spec.ts | simulator | DELETE | — |
| dev-workflow-background-agent.spec.ts | simulator | DELETE | sensitive-context abort → host integration test of `AlphaClient` |
| dev-workflow-calendar.spec.ts | simulator + unit | DELETE | — |
| dev-workflow-concurrency.spec.ts | simulator | DELETE | — |
| dev-workflow-dates.spec.ts | simulator + legacy NotesStore unit | DELETE | — |
| dev-workflow-execution.spec.ts | product Workflows UI on dev protocol | MERGE | `journeys/workflows.spec.ts`: Run now → output + history; Change keeps steps, paused stays paused |
| dev-workflow-executor.spec.ts | simulator internals (21 tests) | DELETE | verify two notice-failure cases exist in `workflow-notices.spec.ts` |
| dev-workflow-files.spec.ts | simulator + BrowserFiles unit | DELETE | — |
| dev-workflow-focus.spec.ts | simulator (18 tests) | DELETE | — |
| dev-workflow-history.spec.ts | simulator history dialog UI | DELETE | — |
| dev-workflow-messages.spec.ts | simulator | DELETE | — |
| dev-workflow-phone.spec.ts | product approval UI on dev protocol | MERGE | `journeys/workflows.spec.ts`: Approve once, Deny, Cancel, approved read → approved write |
| dev-workflow-receipts.spec.ts | simulator + Wallet + legacy Files upgrade | DELETE | — |
| dev-workflow-result.spec.ts | simulator | DELETE | — |
| dev-workflow-speech.spec.ts | simulator | DELETE | — |
| dev-workflow-triggers.spec.ts | simulator trigger runtime | DELETE | owner decision with D20 (Lemma `workflow-triggers.dfy` + Quint `trigger-cursor-replay.mjs`) |
| dev-workflow-urgency.spec.ts | simulator | DELETE | — |
| device-apps-stub.ts | helper (fake bridge) | MERGE | `harness/plugins/launcher.ts`, shared with `accessibility-states.ts:357-396`; importers `large-text-overlap.spec.ts`, `drawer-full-height.spec.ts` |
| device-storage-migration.spec.ts | stand-in storage unit tests (3 browsers) | DELETE | also remove from `scripts/storage-specs.ts` |

Totals: DELETE 20, MERGE/REWRITE 12, KEEP 0.

## Behaviour that loses all coverage if the DELETEs happen

Be clear about these before deleting:
1. **Sensitive view aborts background workflow generation** (`runtime/alpha-client.ts`, product, used by `agent-adapter.ts`).
   Only `dev-workflow-background-agent.spec.ts:13` checks it. Needs a host integration test of `AlphaClient` with a fake
   transport.
2. **AlphaClient generation ownership** (a busy chat's abort must not cancel another consumer):
   `dev-workflow-agent.spec.ts:12`. Same integration test.
3. **Workflow-notice failure paths** (failed persistence posts nothing; cancel while waiting for the store lock prevents
   publication): `dev-workflow-executor.spec.ts:75-83`, on product `browser/workflow-notices.ts`. Check the
   `workflow-notice*` specs first.
4. **Calendar agent review: edit during review → conflict, and the receipt survives reload**: `dev-parity.spec.ts:104-111`,
   unless `calendar-agent-transaction-cancel.spec.ts` / `calendar-agent-all-day-review.spec.ts` cover it.
5. **The local workflow simulator and its trigger runtime** lose every e2e check. This is intended only if the simulator
   is deleted with them (Q-DEV-1, D20). Then `workflow-triggers.ts` also goes, with its Lemma proof and Quint replay.
6. **The `browserFullReload` Vite plugin** (`scripts/browser-full-reload.ts`) loses its only test. It is developer
   tooling and gates no release.
7. **Browser stand-in semantics** (sensors, notifications policy, device preferences, browser iframe sandbox, files byte
   rollback) lose their checks on purpose (P7). The APK uses native plugins.

## Shared helpers

- Keep and harden into the harness:
  - `app-navigation.ts` (`returnToApps`) → `harness/nav.ts`
  - `workflow-navigation.ts` (`installWorkflowListFixture`, `newWorkflow`, `workflowCard`)
  - `voice-fixture.ts` (`agentBrowserVoice`) and `generic-cloud-speech-fixture.ts`
  - `helpers/connection-diagnostics.ts`: replace with a "connected development profile" fixture option
- `device-apps-stub.ts` → `harness/plugins/launcher.ts`.
- `calendar-draft-readiness.ts` `guardCalendarFixture` is imported as `guardNoMedia` (3 specs). Rename it at the source.
- `helpers/legacy-notes.ts` is used by 10 specs in this chunk (sensors, workflow-agent, background-agent, concurrency,
  dates, executor, phone, result, triggers, urgency). It dies with A2. Only the surviving `dev-workflow-phone` and
  `dev-sensors` cases need re-pointing at canonical Notes.
- Repeated in-spec snippets that should not survive:
  - `Component.prototype.api` capture (~12 copies)
  - `localRuns` journal readers (16)
  - `Storage.prototype.setItem` / `IDBObjectStore.prototype.put` fault patches (~25)
  - external-request recorder (8) → harness `noExternalRequests`
  - inline `alpha.connection.selection.v1` seed (31 of 32 files)

## Cross-file actions

- Delete the local workflow simulator modules together with the 16 simulator specs (cross-file-actions Q-DEV-1; D20).
  - Delete with them: `workflow-triggers.ts`, `specs/lemma/apps/app/src/browser/workflow-triggers.dfy*` and
    `specs/quint/refinement/services/trigger-cursor-replay.mjs`, or keep all of them.
  - Also delete the text pins on those modules: `test/locale-time-usage.test.mjs`, `test/support/feature-parity.mjs`.
- Remove `test/browser/device-storage-migration.spec.ts` from `scripts/storage-specs.ts`.
- Delete `dev-wallet.spec.ts` and `dev-workflow-receipts.spec.ts` in the same commit as Wallet (A3/C8).
- Delete the version-one Files upgrade in `browser/files.ts` (A1) with the receipts spec.
- New journey files proposed from this chunk:
  - `journeys/workflows.spec.ts`: backbone from authoring, execution and phone
  - `journeys/notifications.spec.ts`
  - `journeys/telephony.spec.ts`: phone-messages and voicemail, with `dev-incoming-call` and `dev-messages-lifecycle`
  - `journeys/dev-surface.spec.ts`: surface-copy, the device-controls round trip from parity, optionally device-settings recovery
  - additions to `journeys/settings.spec.ts`, `voice.spec.ts`, `chat.spec.ts`, `home-shell.spec.ts`, `notes.spec.ts`
- P1: removing about 20 simulator specs (about 230 test cases after loop expansion) takes a large share of the chromium
  shards' runtime. This chunk's specs carry 22 `page.clock` uses and 9 fixed sleeps.

## Owner questions

1. Q-DEV-1 / D20: delete the local workflow simulator (offline "Run now" executor, trigger runtime, focus, receipts, Development result dialog) together with its 16 specs and the `workflow-triggers` Lemma proof and Quint replay? Recommended: yes.
2. Keep the telephony simulator (dev Phone, Messages and Voicemail) as the renderer test bed for the AOSP-only paths in `journeys/telephony.spec.ts`?
3. Keep `scripts/browser-full-reload.ts`? It is needed only while prototype adapters patch classes at boot (D2). If it is kept, should it have a Node test?
4. Does the development sample-account and Cloud-profile chooser survive D5/D19? `dev-speech-account-switch` and the `cloud` variant of `dev-workflow-phone` depend on it.
5. Keep the dev "Device settings recovery" dialog, which downloads the damaged prefs before a reset?
