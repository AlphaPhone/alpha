# Chunk test-44: host tests `plugin-worker-guard` … `quint-checker`

78 assigned files: 23 ordinary host tests (one is Python) and 55 `quint-*` files. 77 exist; `test/quint-calendar-preservation-confirmation.test.mjs`
was already deleted in this worktree by the A1 change. Per-file reports are under `files/test/`.

Runner target used throughout: **`test/quint-refinement.test.mjs`**, one manifest-driven runner that registers one `test()` per
model in `specs/quint/*/manifest.json`, with the family `index.mjs` lists as the campaign registry (research P3). It
replaces the per-model wrappers and the 2,400 s aggregates.

## Verdicts

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| plugin-worker-guard.test.mjs | host-JVM unit + source-text (13 plugins, 4 vendor files) | MERGE 1 case, DELETE 6 | Gradle JVM (interim `test/integration/native-plugin-workers.test.mjs`) with `fixtures/PluginWorkersTest.java` |
| polish-automation-when.test.mjs | unit (esbuild bundle of real modules) | MERGE | `test/integration/automations.test.mjs` (3 cases, direct imports) |
| post-sign-in-setup.test.mjs | transplant + source-text | DELETE | 4 cases to `journeys/connection-cloud.spec.ts`, `journeys/startup-permissions.spec.ts`, `journeys/settings.spec.ts` |
| power-cold-native-pin.test.mjs | Java transplant + host-JVM integration | REWRITE | Gradle JVM `PowerLaunchPinTest` after extracting the pin policy class; interim keep test 2 only |
| power-launch-state.test.mjs | unit | MERGE | `test/integration/resident-runtime.test.ts` |
| power-sense-entry.test.mjs | manifest regex + host-JVM integration | MERGE / MOVE | manifest rules → `scripts/verify-apks.ts`; non-overlapping cases → Gradle JVM; API-36 compile deleted |
| prepare-local-agent-requalify.test.mjs | tooling integration (research mislabelled it A) | DELETE | with `--requalify-from` (no caller); else redundant with `prepared-source-stamp` replay |
| prepared-navigation-route.test.mjs | TS + Java transplant | REWRITE | JSON case table → `test/integration/local-agent.test.ts` + Gradle JVM gate test |
| prepared-workflow-worker.test.mjs | tooling integration | MERGE | `test/tooling/android-build.test.mjs` |
| previous-notes-source-opening.test.mjs | transplant scenario + Quint wrapper | DELETE (A1) | delete fixture, driver, `PreviousNotesSourceOpening.qnt`, manifest row, aggregate entry in the same change |
| private-cloud-restore.test.mjs | transplant | DELETE | optional dev-project case in `journeys/connection-cloud.spec.ts` |
| private-preview-cartesia-route.test.mjs | transplant + 14 self-respawns | DELETE | 2 cases (start timeout fence, phase captions) to `journeys/voice.spec.ts` |
| product-character-host.test.mjs | source-text + transplant + tooling | MERGE 2 cases, DELETE 2 | `test/tooling/cloud-resident-host.test.mjs` (direct import) |
| product-identity.test.mjs | source-text + AST lint + constants | DELETE (most) | manifest rules → `scripts/verify-apks.ts`; 2 cases → `test/tooling/android-build.test.mjs` |
| production-bundle-audit.test.mjs | tooling integration | KEEP trimmed | `test/tooling/production-bundle-audit.test.mjs` |
| provider-configuration-cancellation.test.mjs | unit + source-text | MERGE 4, DELETE 2 | `test/integration/connection-cloud.test.ts` |
| provider-key-manager-bridge.test.mjs | transplant | REWRITE | `test/integration/connection-cloud.test.ts` (5 cases on real exports) |
| provider-key-release-drain.test.mjs | transplant | DELETE | 1 case to `journeys/connection-cloud.spec.ts` |
| publish-update-manifest.test.mjs | tooling integration + region transplant | MERGE | `test/tooling/release-signing.test.ts`, import `parseUpdateManifest` |
| python-suites.test.mjs | Python collector | KEEP | rename `test/tooling/python.test.mjs`; absorb one-file Python wrappers; drop ABI line |
| qualified-app-update.test.mjs | Python wrapper + workflow YAML assertions | DELETE | Python suite runs from the collector; workflow policy → optional workflow linter |
| qualified-app-update.test.py | tooling integration (Python) | KEEP | shared fixture module instead of importing another test |
| qualify-head.test.mjs | tooling | DELETE | with `scripts/qualify-head.ts` (only tests import it) |
| quint-application-refinement.test.mjs | Quint aggregate (2,400 s) | DELETE | coverage rule moves into the runner |
| quint-back-dispatch.test.mjs | in-test replay harness + transplant (agent-adapter slices, MainActivity Java string regex) | PORT | `specs/quint/refinement/application/back-dispatch.mjs` + runner entry |
| quint-chat-dock.test.mjs | in-test replay harness + region transplant | PORT | `specs/quint/refinement/application/chat-dock.mjs` importing `chatRelease` + runner entry |
| quint-changed-models.test.mjs | tooling | KEEP → MERGE | `test/tooling/quint.test.mjs` |
| quint-checker.test.mjs | tooling | KEEP 3-4 cases, DELETE 3 | `test/tooling/quint.test.mjs`; drop floors, retry supervisor, receipt temp-repo test |
| quint-calendar-preservation-confirmation.test.mjs | — | already deleted | — |
| 49 other `quint-*.test.mjs` wrappers (accessible-toast-lifetime … capture-frames) | Quint replay wrappers | MERGE | runner entry each; see per-file reports for extras |

The 49 wrappers: accessible-toast-lifetime, account-sheet-refinement, address-input, agent-calendar-event-return,
agent-calendar-mutation, agent-calendar-refresh, agent-calendar-sync-control, android-browser-module-stage,
android-build-input-readiness, android-gzip-asset-stage, app-info-handoff-composition, app-update-candidate,
approval-decision, asr-pipe, automatic-app-update-schedule, automation-request-settlement, batch-capture-completion,
bookmarks-hydration, browser-album-storage, browser-cloud-request-custody, browser-deletion-poll,
browser-files-trash-refinement, browser-hosted-result-notice, browser-journal-retention-refinement,
browser-note-recording-journal, browser-owner-reminder-action, browser-owner-reminder-read,
browser-reminder-orphan-refinement, browser-reviews, browser-session-persistence, browser-surface-navigation,
browser-surface-presentation, browser-tab-lifecycle, calendar-agent-selection, calendar-approval-review,
camera-focus-writes, camera-preview-retirement, canonical-calendar-draft-handoff, canonical-calendar-draft,
canonical-calendar-editor-close, canonical-notes-controller, canonical-notes-draft, canonical-notes-feedback,
canonical-notes-mutation, canonical-notes-refinement, canonical-notes-view, canonical-notification-tap-admission,
canonical-notification-tap-refinement, capture-frames.

Totals (77 existing files): DELETE 10, KEEP 4, MERGE / REWRITE / PORT 63.

### Quint facts established in this chunk
- 39 of the 49 wrappers run a campaign that also runs in a family aggregate (`application` 28, `services` 7, `native` 4 by
  `grep` of the family `index.mjs`). The other 10, plus two extra cases and the two in-test harnesses, run **only** here and must be registered explicitly when the wrappers go:
  address-input, approval-decision (2 cases), bookmarks-hydration, browser-reviews, browser-session-persistence,
  browser-surface-navigation, browser-surface-presentation, browser-tab-lifecycle, calendar-agent-selection,
  camera-focus-writes, `checkBrowserAlbumWithoutLocks`, plus the in-test harnesses back-dispatch and chat-dock.
- Every model behind these wrappers is live (listed in an `application`/`services`/`native` manifest) and models
  product code that still exists after DECISIONS, with three exceptions:
  - `PreviousNotesSourceOpening` models a deleted legacy reader: DELETE with its driver and fixture.
  - `AgentCalendarMutation.qnt` still models a legacy-calendar **preservation** reply, and its driver still emits
    "review preservation" outcomes, while this worktree already deleted `legacy-calendar-preservation.ts`. The model
    and driver must be revised in the A1 change or the replay (and the 100 % promise) breaks.
  - `BrowserCloudRequestCustody` models the `dev:cloud` bridge; it lives only as long as that dev surface (D6/D19).
- Text-anchored drivers (T10) seen by grep: address-input, accessible-toast-lifetime, automatic-app-update-schedule
  (`settings-facts` markers), automation-request-settlement, batch-capture-completion, bookmarks-hydration,
  browser-session-persistence, browser-surface-presentation, browser-tab-lifecycle, canonical-notification-tap-admission,
  canonical-notes-view, agent-calendar-event-return, plus the in-test back-dispatch and chat-dock. Good ties (import or
  bundle the real module): account-sheet, agent-calendar-refresh, android-build-input-readiness, app-update-candidate,
  browser-album-storage, browser-files-trash, the `browser-daily-stores` family, Java replays (asr-pipe,
  capture-frames, canonical-notification-tap). Driver files belong to the specs chunks; this is a pointer list.
- Mutation canaries (rewrite product source to prove the oracle fails) in automation-request-settlement,
  calendar-agent-selection and camera-focus-writes: B5, delete; each pins an exact source string and doubles the run.
- Three campaigns (camera-preview-retirement, canonical-calendar-draft-handoff, canonical-calendar-editor-close) launch
  Chromium from inside `node --test` through `test/fixtures/calendar-mounted-editor.mjs` (P12), with 240-420 s budgets.

## Behaviours that lose all coverage if the DELETEs land first

1. **Cloud-refused key removal and key-replaced-during-admission** after email sign-in (`post-sign-in-setup` 81-114). Only
   transplant coverage today. Needs two `journeys/connection-cloud.spec.ts` cases with the Cloud mock.
2. **Queued sign-in return / rebind drained after a provider-key request** (`provider-key-release-drain`). Needs one
   journey case, or an integration test once the connection controller is a module.
3. **Cloud voice start timeout (12 s) with a late preparation fenced, and phase captions** (`private-preview-cartesia-route`
   169-238, 279-300). Needs `journeys/voice.spec.ts` cases with a held voice mock.
4. **Manifest release rules**: backup off, `${applicationId}`-scoped authorities/affinities (`product-identity` 87-95) and the
   Power child activity's disabled/unexported/permission/no-filter entry (`power-sense-entry` 25-36). Must move into
   `scripts/verify-apks.ts` before the tests go; `apk.ts` already checks the package name only.
5. **"Every executor dispatch goes through `PluginWorkers.submit`"** (`plugin-worker-guard` 19-71). Deleted as source-text;
   only a lint would keep it. The guard's behaviour itself stays covered.
6. **Release-workflow security shape** (`qualified-app-update.test.mjs` 11-92: pinned actions, no secrets in env, WIF
   tokens only in protected jobs). No replacement unless the owner adds a workflow linter job.
7. **Native view-navigation gate** (`prepared-navigation-route` 37-61) and **Power pin epoch** (`power-cold-native-pin`):
   REWRITE, not delete; if the Gradle JVM lane does not exist yet, keep the host-JVM versions until it does.

## Shared helpers worth keeping
- `test/fixtures/jvm-tools.mjs` (`runJvm`, `nativeSource`, `jvmSkip`, `jsonJar`): until the Gradle JVM lane exists.
  `power-cold-native-pin` and `power-sense-entry` duplicate SDK discovery and a `workspace()/javac()` pair that belongs there.
- `test/fixtures/prepare-local-agent.mjs`: survives (imported by `specs/quint/refinement/services/prepared-source-stamp.mjs`).
- `test/fixtures/product-character-host.mjs`: survives for `cloud-resident-host` tooling tests; drop its vm transplant of
  `scripts/cloud-resident-host.ts` in favour of an import.
- `test/fixtures/PluginWorkersTest.java`: moves with the one kept worker-guard case.
- `test/fixtures/previous-notes-source-opening.mjs`: DELETE (only importers are deleted).
- `specs/quint/refinement/application/shell-model-traces.mjs` and `shell-core-fixture.mjs`: needed by the ported
  back-dispatch and chat-dock drivers.

## Cross-file actions
1. A1 Notes deletion must also delete: `test/previous-notes-source-opening.test.mjs`, `test/fixtures/previous-notes-source-opening.mjs`,
   `specs/quint/refinement/application/previous-notes-source-opening.mjs`, `specs/quint/application/PreviousNotesSourceOpening.qnt`,
   its `specs/quint/application/manifest.json` row and `specs/quint/refinement/application/index.mjs:60,142`.
2. A1 Calendar deletion must revise `specs/quint/application/AgentCalendarMutation.qnt` (drop `Preservation`,
   `preservationReply`, `changedPreservationNeverDispatchesTest`) and `specs/quint/refinement/application/agent-calendar-mutation.mjs`
   (`legacySnapshot`, the "review preservation" outcome).
3. `quint-checker` floors (`application: 116, …, legacy: 27`, `>= 1841` scenarios) break on every retired model: delete them
   in the same change as the first model deletion.
4. Export `updateBackAvailability`/Back handler from a module and move the `MainActivity` Back script into an asset
   (back-dispatch port); `chatRelease` is already exported (chat-dock port); `parseUpdateManifest` is already exported
   (publish-update-manifest). After the ports, the `// chat-release:*` and `// settings-facts:*` marker comments can go
   (other importers: `test/chat-release.test.mjs`, `test/settings-truth.test.mjs`, `test/app-update-automatic.test.mjs`,
   `automatic-app-update-schedule.mjs:54`).
5. `test/python-suites.test.mjs:28` must lose the `android-app-abi-selection.test.py` line when test-01's delete lands;
   `resident-crash-diagnostic.test.py` should run in one place only (here or `resident-android.yml:245`).
6. `scripts/ci/private-artifact-identity.json` loses its only reader with `qualified-app-update.test.mjs`.
7. `canonical-calendar-editor-close.mjs` lists `apps/app/src/prototype/assistant-draft-controller.ts`, a shim another chunk deletes.

## Owner questions
1. Is `prepare-local-agent.ts --requalify-from` a manual recovery tool you still use? Nothing in package.json or CI calls it.
2. Is `scripts/qualify-head.ts` (local CI re-qualification, only tests import it) still run by hand?
3. Is the Cloud signing / qualified-update release path (`publish-qualified-app-update.yml`, `release-cloud-app-signing.yml`,
   `scripts/ci/qualified-app-update.py`) live? It decides whether `qualified-app-update.test.py` stays.
4. Should release-workflow security rules (pinned action SHAs, no secrets in step env, WIF only in protected jobs) be
   enforced by a workflow linter job once the YAML-text tests are deleted?
5. Should the "all plugin executor use goes through `PluginWorkers.submit`" rule be kept as a lint?
6. Mutation canaries in three Quint tests: delete (recommended), or keep one canary per family as a periodic harness check?
