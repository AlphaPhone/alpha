# Chunk test-36: test fixtures (scoped-calendar … workflow-worker) and Gmail/Google host tests

40 files: 20 fixtures, 20 host tests (one already gone). Reports are in `files/test/...`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| test/fixtures/scoped-calendar-jvm/android/content/ContentProviderOperation.java | JVM Android shim | KEEP | moves with the Calendar JVM tests (D18 keeps the Android sync half) |
| test/fixtures/scoped-calendar-jvm/android/content/ContentResolver.java | JVM Android shim | KEEP | same |
| test/fixtures/secure-store-memory/MemoryTest.java | JVM integration fixture | KEEP | Gradle JVM set; upstream follow-up for pure-store cases |
| test/fixtures/secure-store-memory/android/util/AtomicFile.java | JVM Android shim | KEEP | shared android-jvm shims folder |
| test/fixtures/settings-model-traces.mjs | Quint replay helper | KEEP + MOVE | `specs/quint/refinement/application/`; stop regex-parsing the `.qnt` |
| test/fixtures/shade-notice-question.mjs | transplant fixture for a live model | PORT | one real-import notifications-adapter harness |
| test/fixtures/shade-row-custody.mjs | transplant fixture for a live model | PORT | merge with the above |
| test/fixtures/shared-batch-voice.mjs | transplant fixture | DELETE | with the voice transplant family |
| test/fixtures/source-text.mjs | T1 helper | DELETE | |
| test/fixtures/ts-source.mjs | duplicate helper | MERGE | into `test/support/strip-types.mjs` |
| test/fixtures/update-confirmation-android/ContinuationActivity.java | unreferenced probe fixture | DELETE | with `scripts/test-update-confirmation-platform.ts` |
| test/fixtures/use-in-email-review.mjs | transplant fixture for a live model | PORT | bundle the real review module with ports |
| test/fixtures/voice-host-product.mjs | tooling fixture | KEEP | |
| test/fixtures/voice-markup.mjs | template-slice fixture | DELETE | both importers deleted |
| test/fixtures/wait-for.mjs | wait helper | KEEP + MOVE | `test/support/wait-for.mjs`, drop `deferred` |
| test/fixtures/workflow-clock-admission.mjs | transplant fixture for a live model | PORT | depends on legacy `clockHandoffLegacyKey` and `syncPreviousNotesAvailability` |
| test/fixtures/workflow-device-bindings.mjs | transplant fixture | DELETE | import `registerWorkflowDevice` directly |
| test/fixtures/workflow-execution-fixture.mjs | transplant fixture | DELETE | `journeys/workflows.spec.ts` |
| test/fixtures/workflow-execution-markup.mjs | template-slice fixture | DELETE | |
| test/fixtures/workflow-worker-assets.mjs | tooling fixture | KEEP | |
| test/flag-off-navigation-protocol.test.mjs | test of a test helper (T5) | DELETE | |
| test/font-license.test.mjs | release tooling + T1 parts | MERGE | `test/release-tooling/licences.test.mjs`, drop tests 1, 6, 8 and wording pins |
| test/gesture-zones-single-instance.test.mjs | source-text | DELETE | owner question on single-instance coverage |
| test/gmail-agent-read-host.test.mjs | integration (shared Google host) | MERGE | `test/integration/inbox-gmail-google.test.mjs` |
| test/gmail-background-binding.test.mjs | source-text + upstream re-run | DELETE | |
| test/gmail-background-lock-contention.test.mjs | JVM integration with method slicing | REWRITE | Gradle JVM test of unsliced classes |
| test/gmail-grants.test.mjs | unit | MERGE | ~5 cases into inbox-gmail-google integration |
| test/gmail-lifecycle-custody.test.mjs | Java transplant | DELETE | owner question |
| test/gmail-read-ahead.test.mjs | child-suite wrapper (T9) | MERGE | move `scripts/test-gmail-read-ahead.ts` cases into inbox-gmail-google |
| test/google-accounts.test.mjs | child-suite wrapper (T9) | MERGE | move `scripts/test-google-accounts.ts` into `test/integration/calendar-google.test.mjs` |
| test/google-agent-access.test.mjs | integration + stubbed unit | MERGE + REWRITE | host cases → inbox-gmail-google; renderer cases → `journeys/settings.spec.ts` |
| test/google-authorization.test.mjs | unit at a trust boundary | MERGE | `test/integration/connection-cloud.test.mjs`, all cases |
| test/google-browser-auth.test.mjs | upstream suite re-run + forked overlay | SIMPLIFY → DELETE | drop the pinned run now; upstream the overlay |
| test/google-calendar-connect.test.mjs | integration (part A) + panel unit-in-JSDOM (part B) | MERGE + REWRITE | A → `calendar-google` integration; B → calendar/settings journeys |
| test/google-calendar-link-status.test.mjs | integration | MERGE | `test/integration/calendar-google.test.mjs` |
| test/google-calendar-selection.test.mjs | — | already deleted | research row stale |
| test/google-cancel-boundary.test.mjs | transplant | DELETE | 2 races to connection-cloud |
| test/google-cancel-committed-key.test.mjs | transplant | DELETE | F01 case to `journeys/connection-cloud.spec.ts` |
| test/google-connection-return.test.mjs | transplant + T1 | REWRITE | watcher cases as import-based integration; panel to settings journey |
| test/google-connections-resource-budget.test.mjs | unit-in-JSDOM, misnamed | REWRITE → DELETE | `journeys/settings.spec.ts` |

Counts: KEEP 7 (with 2 of them moving), DELETE 13, MERGE/REWRITE/PORT/SIMPLIFY 19, already gone 1.

## Behaviour that loses all coverage if the DELETEs land without replacement

- **OTA confirmation continuation on a real `PackageInstaller`** (`ContinuationActivity.java` + its unreferenced
  probe). Nothing ran it, so this is not a regression in CI, but it is the only executable check.
- **Single-instance launcher hand-off** (`gesture-zones-single-instance`): the regex pins go, and
  `ActivityInstanceSelectionInstrumentedTest.java` is deleted in the current working tree. Check whether
  `LauncherHomeInstrumentedTest` covers a second HOME start handing off to the live task without looping.
- **Gmail notice tap custody** (`gmail-lifecycle-custody`): newest intent wins, a stale retry is retired. No other test.
- **Google sign-in cancel races** (`google-cancel-boundary`, `google-cancel-committed-key`): commit-vs-cancel, late
  cancel of an old attempt, Android F01 key adoption. The Quint sign-in models cover states but not these code paths.
  Carry the listed cases.
- **Workflow run-detail states** (`workflow-execution-fixture/markup`): confirm `dev-workflow-execution.spec.ts`
  covers finished, pending device, outcome-unknown and older-version runs before deleting.

## Shared helpers worth keeping

- `test/fixtures/wait-for.mjs` `waitFor`: becomes the single host-test wait (`test/support/wait-for.mjs`).
- The sync-control double in `google-calendar-connect.test.mjs:32-57` (CAS, key replay, select/resume/pause): the base
  of the merged Calendar/Google integration.
- The fake Cloud transport in `gmail-agent-read-host.test.mjs:15-49`: make it `test/support/fake-cloud.mjs` for the
  inbox-gmail-google integration and the native Google host tests.
- JVM shims (`AtomicFile`, `ContentProviderOperation`, `ContentResolver`): one shared android-jvm shims folder.

## Cross-file actions

1. **Live Quint models depend on four transplant fixtures here** (`shade-notice-question`, `shade-row-custody`,
   `use-in-email-review`, `workflow-clock-admission`). They cannot be deleted with their host tests; they move into
   `specs/quint/refinement/application/` and are ported to imports (T10). `workflow-clock-admission.mjs` will stop
   bundling as soon as stage A deletes `clockHandoffLegacyKey` (A1); update it in the same change.
2. `ts-source.mjs` → `support/strip-types.mjs` in `specs/quint/refinement/native/renderer-speech-chunk.mjs:15`.
3. `scripts/test-update-confirmation-platform.ts` is deleted together with its fixture.
4. `scripts/gmail-agent-read-host.ts` folds into `gmail-agent-dev-broker.ts` (scripts research); the merged Gmail
   integration should build the host the phone way (`test/support/managed-google-agent.mjs`).
5. The marker comment `/** Probe installed bridge code` in `workflow-presentation.ts` is removed with the last slicer.
6. Three files bundle `google-accounts.ts` with esbuild separately (`google-calendar-connect`, `google-calendar-link-status`,
   `scripts/test-google-accounts.ts`); one bundle after the merge.
7. Upstream follow-ups (D14): managed Google host cases (`gmail-agent-read-host`), the Google browser sign-in overlay
   (`google-browser-auth` + `fixtures/google-browser-auth/**`), and pure `JsonCredentialSlots` cases (`MemoryTest.java`).
8. Research correction: `google-calendar-selection.test.mjs` no longer exists.

## Owner questions

- Should single-instance launcher hand-off keep an instrumented test, now that `ActivityInstanceSelectionInstrumentedTest` is deleted?
- Is OTA confirmation continuation worth an emulator-lane instrumented test, or is the unreferenced probe simply retired?
- Should Gmail notice tap custody (newest intent wins) become an instrumented case, or is losing it acceptable?
- Is it acceptable that the Google accounts panel's fine-grained race tests (retired link, replacement binding) are
  covered only by the Quint models plus a few journey steps?
