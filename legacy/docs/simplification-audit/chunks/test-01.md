# Chunk test-01: host tests `abort-signal-compat` … `android-runtime-staging-selection`

29 files, 3,337 lines. Per-file reports are under `files/test/`. All 29 files exist in the worktree.

## Verdicts

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| abort-signal-compat.test.mjs | transplant | DELETE | optional WebView-113 case in `journeys/maps.spec.ts` |
| accessibility-coverage.test.mjs | source-text (tests of tests) | DELETE | the "every view is swept" check moves into `accessibility-states.ts` (import `ENABLED_MVP_VIEWS`) |
| accessibility-timeout.test.mjs | unit | DELETE | covered by the `accessible-toast-lifetime` Quint replay and `shell-toast.spec.ts` |
| accessibility-visible-bounds.test.mjs | unit (host JVM) | DELETE | together with `test/fixtures/AccessibilityBoundsTest.java` (its only importer) |
| action-message-presentation.test.mjs | unit | REWRITE + MERGE | `journeys/chat.spec.ts` (one answer per browser open, live and restored); receipt refusal matrix goes to `test/integration/device-actions.test.mjs` |
| adapter-contracts.test.mjs | tooling wrapper (26 child scripts) | DELETE wrapper; MOVE suites | area files under `test/integration/` (calendar, inbox, workflows, notes, cloud); delete `test-cloud-personal-flow.ts` (D5) |
| agent-action-preferences.test.mjs | unit + transplant | MERGE | `test/integration/device-actions.test.mjs` (policy matrix); delete lines 13 and 15 |
| agent-always-local.test.mjs | source-text + transplant | DELETE | `journeys/connection-cloud.spec.ts`; add `speechSynthesis` to the bundle denylist |
| agent-calendar-mutation.test.mjs | tooling wrapper | DELETE | the script is about legacy preservation (A1) and is already broken by the A1 change; the Quint replay stays |
| agent-calendar-refresh-state.test.mjs | transplant | REWRITE | `test/integration/agent-calendar.test.ts` (real import, about 8 cases); **already broken** by the A1 constructor change |
| agent-camera-capture.test.mjs | tooling wrapper (the script is a transplant) | DELETE | covered by `browser/agent-camera-capture.spec.ts`, which becomes part of `journeys/camera-photos.spec.ts` |
| agent-embedding-overrides.test.mjs | unit + tooling integration | MERGE | `test/tooling/local-agent-launcher.test.mjs` (2 launches) |
| agent-identity.test.mjs | constants + source-text + tooling integration | MERGE (launch cases) | `test/tooling/local-agent-launcher.test.mjs` |
| agent-model-selection.test.mjs | tooling integration | MERGE | `test/tooling/local-agent-launcher.test.mjs` (4 cases) |
| agent-speech-environment.test.mjs | unit (tombstone refusals) | DELETE | delete `refuseRetiredSpeechNames` as well |
| agent-status-route.test.mjs | transplant | DELETE → REWRITE | one case in `journeys/settings.spec.ts` (production project) |
| alpha-client-consumed-approvals.test.mjs | integration-lite + source-text | MERGE | `test/integration/alpha-client.test.mjs`; drop the agent-adapter regex |
| alpha-client-sensitive.test.mjs | integration-lite | MERGE | `test/integration/alpha-client.test.mjs` |
| alpha-system-entry.test.mjs | unit (host JVM stubs) + source-text + upstream rewrite | DELETE | two release rules move into `scripts/verify-apks.ts` |
| always-on-listener.test.mjs | upstream re-run + compile checks + source-text | DELETE | Gradle compiles the same sources; `AlphaListenerPlugin` is a delete candidate (A60) |
| android-app-abi-selection.test.py | transplant (Groovy slice) | DELETE | also remove its line from `test/python-suites.test.mjs` |
| android-build-path.test.mjs | tooling integration (+ text) | KEEP trimmed → MERGE | `test/tooling/android-build.test.mjs` |
| android-cloud-voice-timing.test.mjs | unit of a manual tool | DELETE | delete the script too unless the owner still runs it |
| android-consumer-build.test.mjs | tooling integration | KEEP trimmed → MERGE | `test/tooling/android-build.test.mjs` |
| android-dependency-fingerprint.test.mjs | tooling integration | KEEP → MERGE | `test/tooling/release-licenses.test.mjs` (or android-build) |
| android-gzip-assets.test.mjs | tooling integration (+ text) | KEEP trimmed → MERGE | `test/tooling/android-build.test.mjs` |
| android-host.test.mjs | tooling integration (+ data-equals-data) | KEEP trimmed → MERGE | `test/tooling/android-build.test.mjs` |
| android-instrumentation-runner.test.mjs | tooling integration + inventory/text | KEEP half → MOVE | `test/tooling/android-instrumentation.test.mjs` (about 300 lines) |
| android-runtime-staging-selection.test.mjs | tooling (+ text) | KEEP trimmed → MERGE | `test/tooling/android-build.test.mjs` |

Totals: DELETE 12, KEEP (trimmed or moved) 7, MERGE/REWRITE 10.

## Coverage lost if the DELETEs land before their replacements

- **Direct agent action policy and chat result collapse.** `action-message-presentation` and `agent-action-preferences` are
  the only tests of the dedup rules and of which proposals may run without review. No Playwright spec asserts
  "Opened example.com.". Build `test/integration/device-actions.test.mjs` and the chat journey cases first.
- **Agent Calendar saved-feed restore and 401/403 invalidation** (`agent-calendar-refresh-state` lines 126-248). The Quint
  refresh model does not appear to cover the persisted cache. Rewrite on a real import before deleting. The file is already
  broken by the A1 constructor change, so it currently protects nothing.
- **"Agent unavailable" opens Settings > Agent connection** (`agent-status-route`). Nothing else covers it. It needs a
  settings journey case.
- **P-43: the agent always runs and the replies are honest** (`agent-always-local`). `native-cloud-subscription.spec.ts`
  covers part of it. Signed-out "Sign in for AI", a single Manage card on a plan refusal, and no Stop control need journey
  cases.
- **Quick Settings tile manifest protection and the "no upstream text in notifications" rule** (`alpha-system-entry`).
  These move into `verify-apks.ts`. Tile behaviour on a device has no remaining coverage (it is disabled under P-78 anyway).
- **WebView 113 `AbortSignal.any` fallback** (`abort-signal-compat`). No coverage is left unless a Maps journey case runs
  with the API removed.
- **Unregistered instrumentation classes** (inventory in `android-instrumentation-runner` 132-242). Only covered again if
  the runner checks the APK's test listing at run time.

## Shared helpers worth keeping

- One launch helper (fake `bun`, temp profile, git fixture) for `test/tooling/local-agent-launcher.test.mjs`. Today there
  are three copies.
- One temp-checkout-with-pinned-vendor fixture, plus the fake Gradle `run`, for `test/tooling/android-build.test.mjs`. Today
  `android-build-path`, `android-dependency-fingerprint` and `android-host` each build their own.
- The fake `adb` emulator in `android-instrumentation-runner`.
- `test/fixtures/device-action-policy.mjs` (real `DeviceActions` via `browser-source.mjs`). It becomes the integration
  fixture for device actions.
- `test/fixtures/android-gzip-assets.mjs` stays: the Quint harness `android-gzip-asset-stage.mjs` also imports it.
  `fixtures/assert-order.mjs` and `fixtures/git-fixture.mjs` have importers outside this chunk.
- Orphaned by this chunk: `test/fixtures/AccessibilityBoundsTest.java` (delete). `fixtures/child-suite.mjs` loses one
  importer but still has others.

## Cross-file actions

- In the A1 deletion, `scripts/test-agent-calendar-mutation-flow.ts` and `agent-calendar-refresh-state.test.mjs` still
  pass a `CalendarPreservation` port to `AgentCalendar` after the constructor lost that parameter. Delete or rewrite both
  in the same change, and check that the `agent-calendar-mutation` and `agent-calendar-refresh` Quint harnesses do not do
  the same.
- Delete `scripts/removed-profile-flags.ts` together with the refusal assertions in `android-build-path` (156-162),
  `android-consumer-build` (96-105) and `one-runtime-profile.test.mjs`.
- Delete `scripts/speech-env.ts` `refuseRetiredSpeechNames` together with `agent-speech-environment`.
- Delete `AlphaListenerPlugin.java` (A60) together with `always-on-listener`. Also remove its references in
  `feature-parity.mjs` and in the native Quint manifest.
- Delete `scripts/test-cloud-personal-flow.ts` (U-R5) and its entry in `adapter-contracts`.
- Move 24 `scripts/test-*.ts` child suites into `test/integration/*` and delete the wrappers. First delete any suite that
  slices source text (scripts chunk).
- Remove `android-app-abi-selection.test.py` from `test/python-suites.test.mjs:28`.
- `verify-apks.ts` gains two checks: the tile service's permission and non-toggle setting in the merged manifest, and no
  upstream "Eliza agent" notification strings in the packaged resources.
- Add `speechSynthesis` to the `audit-production-bundle.ts` denylist (replaces `agent-always-local` 255-258).

## Owner questions

1. Is `scripts/android-cloud-voice-timing.ts` still run by hand? If not, delete it along with its test.
2. Should the launchers `start-reviewed-workflow-agent.ts` and `start-combined-agent.ts` stay? Their test cases in
   `agent-identity`, `agent-embedding-overrides` and `agent-model-selection` depend on the answer.
3. Is the agent-side Calendar sync control (sync-review routes in `test-agent-calendar-mutation-flow.ts` 80-113) the
   accepted product path (Q-CAL-1)? If not, those cases go too.
4. P-78 (always-on listener, Power invocation, Quick Settings tile) is dormant. Which emulator or image test should gate it
   when it is enabled? Host text checks never proved it.
5. Should the WebView 113 `AbortSignal.any` fallback keep a dedicated journey case, or is the API 29 emulator run enough?
