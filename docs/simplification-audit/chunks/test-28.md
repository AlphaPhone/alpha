# Chunk test-28: host tests `dev-ui-remote-host` … `enabled-view-transport`

32 assigned files; 31 present, 1 already deleted (`direct-provider-module-budget.test.mjs`). Reports are in
`files/test/<name>.md`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| dev-ui-remote-host.test.mjs | tooling (real CLI, fake vite) + 1 T1 line | DELETE with `scripts/dev-ui-remote-host.ts` (no caller) | - |
| developer-archive.test.mjs | tooling integration | KEEP + SIMPLIFY (drop arg-parser table) | `test/tooling/apk-verify-audit.test.ts` |
| development-cartesia-conversation.test.mjs | transplant (+ real SDK bundle) | REWRITE | `test/integration/voice.test.ts` (dev-Cartesia block, ~10 cases) |
| development-cloud-voice.test.mjs | integration of dev bridge + 1 T1 + 1 T2 | MERGE (drop lines 77, 79-90) | `test/dev-local-agent-bridge.test.mjs` |
| development-conversation-stream.test.mjs | integration of dev bridge | MERGE | `test/dev-local-agent-bridge.test.mjs` |
| development-voice-navigation.test.mjs | transplant x2 | REWRITE | `test/integration/voice.test.ts` + `journeys/voice.spec.ts` |
| device-action-clarification-eval.test.mjs | tooling self-test | DELETE | - |
| device-capability-selection.test.mjs | unit (pure, real) + constant | MERGE tests 1-2; delete 3 | `test/integration/device-actions.test.mjs` |
| device-plugin-diagnostics.test.mjs | source-text (Java) | DELETE | - |
| device-record-presentation.test.mjs | unit (copy strings) | MERGE | `journeys/chat.spec.ts` |
| diagnostics-export.test.mjs | integration (15 cases) + 5 transplants + regexes | KEEP trimmed, MOVE | `test/integration/diagnostics-export.test.mjs`; fence case to `journeys/settings.spec.ts` |
| digest-capabilities.test.mjs | integration (tsx child) + T1 | MERGE test 1 | `test/integration/digests.test.ts` |
| digest-delegation-host.test.mjs | source-text | DELETE | - |
| digest-missed-run-now.test.mjs | integration + T1 x2 + JVM unit | MERGE test 1; delete rest + `test/fixtures/ResidentScheduleRearmTest.java` | `test/integration/digests.test.ts` |
| digest-occurrence-delivery.test.mjs | integration + vendor-parity harness (T10/T2) | MERGE tests 1, 3; delete rest | `test/integration/digests.test.ts` |
| digest-pending-storage.test.mjs | source-text + transplant + inline Java | DELETE | - |
| digest-restart-input.test.mjs | tooling (harness preflight) + package.json constant | DELETE | - |
| digest-route-registration.test.mjs | upstream-pin contract (text-anchored) + T1 | KEEP test 2 (port to import), delete test 1 | `test/tooling/upstream-pin.test.mjs` |
| direct-browser-grounding.test.mjs | real `DeviceActions`, approve stubbed | MERGE | `test/integration/device-actions.test.mjs` |
| direct-browser-transcription.test.mjs | transplant x2 | DELETE; 2 cases to journey | `journeys/voice.spec.ts` |
| direct-provider-module-budget.test.mjs | missing | already deleted | - |
| direct-transcription-proxy.test.mjs | transplant of an importable module | REWRITE (rows) | `test/dev-local-agent-bridge.test.mjs` |
| docs-links.test.mjs | docs lint | MOVE tests 3-4 to a lint; delete 1, 2, 5 | `scripts/check-doc-references.ts` |
| embedding-artifact-inputs.test.py | tooling (release-gating CI helper) | KEEP trimmed (drop `settings()` tests) | `test/tooling/python.test.mjs` runner |
| embedding-host-admission.test.mjs | tooling integration (git fixtures) + 1 T2 | KEEP, consolidate family | `test/tooling/embedding-host.test.mjs` |
| embedding-host-preparation.test.mjs | tooling (CLI refusals) | MERGE | `test/tooling/embedding-host.test.mjs` |
| embedding-host-producer-closure.test.mjs | source-text + vendor import walk | DELETE; closure check moves into `scripts/prepare-embedding-host.ts` | - |
| embedding-library-source.test.mjs | tooling unit | MERGE (2 assertions) | `test/tooling/embedding-host.test.mjs` |
| embedding-native-contract.test.mjs | tooling | MERGE | `test/tooling/embedding-host.test.mjs` |
| embedding-workflow-forwarding.test.mjs | workflow YAML text | DELETE | - |
| emulator-microphone-preflight.test.py | Python unit with mocks (usually skipped) | DELETE (+ row in `python-suites.test.mjs`) | - |
| enabled-view-transport.test.mjs | integration of dev bridge | MERGE | `test/dev-local-agent-bridge.test.mjs` |

Totals: DELETE 10, KEEP 5, MERGE/REWRITE/MOVE 16, missing 1.

## Corrections to `research/tests-host.md`
- `dev-ui-remote-host` is a tooling test of a real CLI (one T1 line), not pure source text; still DELETE because the script has no caller.
- `development-cloud-voice` is mainly integration over the real dev bridge, not a transplant (two cases are).
- `diagnostics-export` is mostly real-module integration (15/22 cases); only 5 cases transplant.
- `embedding-workflow-forwarding` runs no Python; it executes workflow YAML text under bash.
- `digest-capabilities`, `digest-missed-run-now`, `digest-occurrence-delivery` exercise **upstream** client code via the
  `export *` shim `apps/app/src/runtime/hosted-digests.ts:15`; only Home-brief retention is app-owned.

## Behaviours that lose all coverage if the DELETEs land without replacements
- Voice view projection allowlist (only MVP views, exact `viewPath`, no external URL/sub-path, refused on owner change or
  hidden document) in `agent-adapter.ts` `applyRealtimeVoiceNavigation`: needs `journeys/voice.spec.ts` cases.
- Dev browser dictation "provider change rejects late text" and "no key refuses before upload": needs two dev-project voice
  journey cases.
- Diagnostics in-flight refresh vs "Clear problems" epoch/abort fences (settings-adapter / connection-ui transplants):
  needs one `journeys/settings.spec.ts` case.
- Cloud dictation owner change mid-upload (cloud-voice transplant in `development-cloud-voice`): journey or none.
- "Run now" never auto-submits without the review sheet (regex-only today): needs `journeys/digests.production.spec.ts`.
- Dev digest scheduler parity with the pinned agent (window, DST, clock jumps): lost unless the simulator imports upstream
  `hosted-digest-policy` instead of copying it (recommended; the parity test then becomes unnecessary).
- `ResidentScheduleReceiver` manifest actions (no `LOCKED_BOOT_COMPLETED`, not exported): only source regex today; belongs
  in `scripts/verify-apks.ts` on the merged manifest if it is a release rule. The re-arm policy itself stays covered by the
  Quint `ResidentScheduling` refinement.
- AlphaDevicePlugin problem-log after destroy (RejectedExecutionException): only a source regex today; instrumentation if needed.
- Emulator audio helper safety (never injects with host mic on): no test; the helper still refuses at run time.

## Shared helpers worth keeping / creating
- `test/fixtures/dev-bridge.mjs`: one pairing fake (`/api/auth/status|pair-code|pair|me`), server/duplexPair connection,
  `holdDeadlines()` (AbortSignal.timeout patch), `blockOnDrain`, `settled`. Replaces 5+ copies in this chunk alone.
- `test/fixtures/embedding-host.mjs`: the pinned/shallow vendor fixture builder from `embedding-host-admission`.
- `test/fixtures/device-action-policy.mjs`: keep (6 importers, target integration file uses it).
- `test/support/strip-types.mjs` loses four importers here (all transplants).
- `test/fixtures/ResidentScheduleRearmTest.java`: delete (only importer is `digest-missed-run-now`).

## Cross-file actions
- Create `test/dev-local-agent-bridge.test.mjs` (tsx-loaded once, no self-respawn) from `development-cloud-voice`,
  `development-conversation-stream`, `direct-transcription-proxy`, `enabled-view-transport`, plus the files other chunks route
  there (`local-agent-voice-bridge`, `automations-transport` bridge cases).
- Create `test/tooling/embedding-host.test.mjs` from the five `embedding-*.test.mjs` files; trim the per-input loop in admission
  (dominant cost).
- `scripts/stage-embedding-host.ts`: export the receipt-manifest builder (removes the `new Function` transplant).
- `scripts/prepare-embedding-host.ts`: enforce the producer import closure at run time.
- `scripts/eval-device-action-clarification.ts`: delete `--self-test` and (if unused) `DEVICE_PROFILE` export.
- `scripts/ci/embedding-artifacts.py`: delete `settings()` path with its four tests; register the suite in the single Python runner
  and call that from `resident-android.yml`.
- `test/python-suites.test.mjs`: remove the `emulator-microphone-preflight` row.
- `apps/app/src/browser/development-digest-occurrence.ts`: import upstream `hosted-digest-policy` instead of re-implementing it.
- `scripts/test-local-digest-restart.ts`: move into `test/` (T9) and skip with its preparation hint.
- Path filters: embedding tooling suite on `scripts/*embedding*`, `android/embedding-host/**`, `android/voice-host/**`,
  `upstream.lock.json`; dev-bridge suite on `scripts/local-agent-dev-bridge.ts`, `scripts/gmail-agent-dev-broker.ts`,
  `apps/app/src/runtime/owner-route-policy.ts`; docs lint on `README.md`, `docs/**`, `package.json`, `scripts/**`.

## Owner questions
- Keep the DEV-only Cartesia realtime voice controller (`runtime/development-cartesia-*.ts`)? ~390 lines of transplant tests
  depend on it; if retired, delete module and both tests instead of rewriting.
- Keep `scripts/dev-ui-remote-host.ts` (no npm/CI/doc caller)? Recommended delete with its test.
- Keep `scripts/developer-archive.ts` (manual, no npm/CI caller)? Its test is kept only if the script is.
- Is the "legacy exported JNI" mode of `embedding-native-contract.ts` still reachable at the pinned upstream?
