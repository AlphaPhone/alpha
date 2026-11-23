# Chunk test-23: voice specs, dev-server warm-up, web summary, workflow specs

30 files, 2,207 lines (Playwright specs and support under `test/browser/`). Report-only; nothing outside
`docs/simplification-audit/` was changed.

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| `voice-fixture-failure-metadata.ts` | 65 | support, unused by any spec | DELETE | also delete `test/voice-fixture-failure-metadata.test.mjs` |
| `voice-fixture.ts` | 58 | support (voice boundary fakes) | KEEP + SIMPLIFY + MOVE | `harness/voice.ts` (merge with cloud/assistant voice fixtures) |
| `voice-levels.spec.ts` | 26 | spec, 2 tests (1 T6) | MERGE | `journeys/notes.spec.ts` (recording) |
| `voice-owned-navigation.spec.ts` | 110 | spec, 13 tests, heavy T6 | MERGE (5 steps) | `journeys/voice.spec.ts` (navigation) |
| `voice-preparation-ownership.spec.ts` | 21 | spec, 3 tests | MERGE | `journeys/voice.spec.ts` + `journeys/notes.spec.ts` |
| `voice-route-preference.spec.ts` | 34 | spec, module-in-page, legacy preference | DELETE | – |
| `voice-save-ownership.spec.ts` | 19 | spec, 2 tests | MERGE (failure case) | `journeys/notes.spec.ts` (recording) |
| `voice-stop-speaking.spec.ts` | 54 | spec, 2 tests, routes build flags | MERGE | `journeys/voice.spec.ts` (assistant; production project) |
| `voice-timing.spec.ts` | 94 | spec, 4 tests, T6-heavy | MERGE (one assertion block) | `journeys/voice.spec.ts` |
| `warm-dev-server.ts` | 27 | Playwright global setup | KEEP + MOVE | `harness/global-setup.ts` |
| `web-summary-note.spec.ts` | 51 | spec, 9 tests | MERGE | `journeys/notes.spec.ts` (sources) + `journeys/browser.spec.ts` (Ask about page) |
| `workflow-dialog-layout.spec.ts` | 23 | spec, 10 tests, dialogs opened by import | MERGE | `journeys/accessibility.spec.ts` / sweep states |
| `workflow-generation.spec.ts` | 65 | spec, 8 tests | MERGE | `journeys/workflows.spec.ts` (generation) |
| `workflow-intent-storage.spec.ts` | 66 | spec, 18 tests ×3 browsers, module-in-page | MERGE (2 cases), rest deleted | `journeys/workflows.spec.ts` (runs) |
| `workflow-interruption-recovery.spec.ts` | 248 | spec, 14 tests, real UI + fault layer | KEEP as basis | `journeys/workflows.spec.ts` (runs/recovery) |
| `workflow-missed-run-now.spec.ts` | 92 | spec, 5 tests | MERGE | `journeys/workflows.spec.ts` (runs) |
| `workflow-navigation.ts` | 33 | support, 12 importers | KEEP, split | `harness/nav.ts` + `harness/workflow-agent.ts` |
| `workflow-notice-history.spec.ts` | 86 | spec, 12 tests, mostly T6 | MERGE (3 cases) | `journeys/workflows.spec.ts` (notices) |
| `workflow-notice-lifecycle.spec.ts` | 58 | spec, 7 tests, module-in-page | DELETE | – |
| `workflow-notice-taps.spec.ts` | 216 | spec, 18 scenarios | MERGE (~8 steps) | `journeys/notifications.spec.ts` |
| `workflow-notices.spec.ts` | 41 | spec, 7 tests (5 T6) | MERGE (3 cases) | `journeys/notifications.spec.ts` + `journeys/workflows.spec.ts` |
| `workflow-notification-recovery.spec.ts` | 54 | spec, module-in-page over dev journal | DELETE | – |
| `workflow-open-view.spec.ts` | 125 | spec, 3 tests, paired agent bridge | MERGE | `journeys/chat.spec.ts` (device-action approval) |
| `workflow-outcome-unknown.spec.ts` | 94 | spec, 4 tests | MERGE | `journeys/workflows.spec.ts` (runs) |
| `workflow-presentation-execution.spec.ts` | 20 | spec, 4 tests | MERGE (1 theme) | `journeys/workflows.spec.ts` (device steps) |
| `workflow-removed-navigation.spec.ts` | 54 | spec, 1 test | MERGE | `journeys/workflows.spec.ts` (lifecycle) |
| `workflow-retirement.spec.ts` | 17 | spec, 1 test, misnamed storage-revocation probe | DELETE | – |
| `workflow-run-context.spec.ts` | 42 | spec, 1 test | MERGE | `journeys/workflows.spec.ts` |
| `workflow-scope-refusal.spec.ts` | 41 | spec, 2 tests | MERGE (422 case) | `journeys/workflows.spec.ts` (generation) |
| `workflows.production.spec.ts` | 273 | production spec, 4 tests | MERGE (all 4) | `journeys/workflows.spec.ts` production section |

Counts: DELETE 5, KEEP 4 (3 support files moved into the harness, plus interruption-recovery as the journey's base),
MERGE/REWRITE 21.

## Behaviours that would lose all coverage if the DELETEs happen without a replacement
- **Notice-store edge rules** (`workflow-notice-history`, `workflow-notice-lifecycle`, `workflow-notices` T6 cases):
  exact-text conflicts after compaction (lone surrogates), abort during hashing commits nothing, ABA revision refusal,
  cancel between prepare and commit, Home after commit. Nothing user-visible replaces them. They are browser-only
  modules (IndexedDB, Web Locks), so a Node integration test cannot import them without a fake IndexedDB.
- **Workflow intent store races** (`workflow-intent-storage`): stale acknowledgement cannot clear a replacement, owners
  isolated, cancelled queued admission, snapshot after own write. The two-tab rule stays covered through the UI. The
  Firefox/WebKit lanes lose this spec (remove it from `scripts/storage-specs.ts`).
- **Notification-journal recovery** (`workflow-notification-recovery`): only the dev simulator journal is exercised.
  Production recovery needs an Android instrumentation test, which does not exist today.
- **Stale capture callbacks** (`voice-owned-navigation` last test) and **summary source URL policy**
  (`web-summary-note` `webSourceOf` list): internal guards with no UI trigger.
- **Revoked storage on page departure** (`workflow-retirement`): low value.

## Shared helpers worth keeping
- `workflows.production.spec.ts` in-page workflow agent → `harness/workflow-agent.ts` (sessionStorage-backed, records
  gets/posts/unexpected, plugin-workflow wire shapes). It replaces the four other hand-written workflow agents
  (missed-run, outcome-unknown, generation/scope patches, interruption fault layer as a `faults` option) and
  `installWorkflowListFixture`.
- `workflow-navigation.ts` `newWorkflow`/`workflowCard` → `harness/nav.ts`.
- `voice-fixture.ts` + `cloud-voice-fixture.ts` + `cloud-notes-voice-fixture.ts` + `voice-assistant-fixture.ts` →
  `harness/voice.ts`.
- Pairing bridge in `workflow-open-view`/`workflow-run-context` → `harness/agent.ts`; resident bridge in
  `workflow-notice-taps` (+ `reminder-notice-taps`) → `harness/native.ts`.
- `warm-dev-server.ts` → `harness/global-setup.ts`.

## Cross-file actions
- Delete `test/voice-fixture-failure-metadata.test.mjs` with the helper.
- Remove `test/browser/workflow-intent-storage.spec.ts` from `scripts/storage-specs.ts:23`.
- Update `playwright.config.ts:55` when `warm-dev-server.ts` moves.
- `helpers/legacy-notes.ts` (`openLegacyNotes`) is used by `voice-levels`, `voice-owned-navigation`,
  `voice-route-preference`, `voice-save-ownership`, `web-summary-note`. All break when the legacy Notes engine (A2) is
  deleted; the merged steps must open the current Notes view.
- `workflow-dialog-layout` calendar case goes with `calendar-recovery.ts` (U-R7 / D3).
- `voice-timing` review-policy test goes with `setVoiceSendPolicyForTests` (D8).
- `voice-stop-speaking` routes `/src/build-flags.ts` with a hand-listed export set including
  `updateChannelCheckEnabled` (D8); it breaks when that export is deleted. Move the step to the production project.
- Runtime follow-up: `alphaphone:voice-route:v1` / `voicePreferenceKeys().route` look like a leftover preference once
  `voice-route-preference` is gone; check the Settings reader.
- `workflow-interruption-recovery`'s suggestion-chip test is an undo-layer guard (A6): remove the prototype chip text
  at its source.

## Owner questions
- Do workflow notification-history and workflow-request recovery downloads ("Download notification history",
  "Download workflow requests backup") count as backup/export under D3? If yes, the carried history/recovery steps
  shrink to Free space and Reset.
- Are the browser notice-store and intent-store race rules worth a fake-IndexedDB integration test, or is UI-level
  coverage enough?
- Is the browser `workflowNoticeReceipt`/journal recovery path reachable in any product build, or only in the dev
  simulator?
