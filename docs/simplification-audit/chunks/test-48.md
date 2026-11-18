# Chunk test-48 (host tests `selection-ask-readiness` … `subscription-entitlement`)

35 files, all present and read in full. Totals: 16 DELETE, 5 REWRITE, 10 MERGE, 4 KEEP (trimmed).

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/selection-ask-readiness.test.mjs | transplant (esbuild + 10 stub imports) | REWRITE | `journeys/files.spec.ts` (3 cases) |
| test/sense-packaging-ndk.test.mjs | source-text + skipped toolchain check | DELETE | rule belongs to `verify-apks` / `verifyVoiceHost` |
| test/serial-storage-tasks.test.mjs | JVM unit + source-text | MERGE (test 1) | host-JVM runner `test/android-jvm.test.mjs` |
| test/service-read-cache.test.mjs | integration-lite (real module) | MERGE | `test/quint-service-read-cache.test.mjs` (expiry, oversize) |
| test/settings-refresh-text-scale.test.mjs | transplant | DELETE | carry 2 cases to `journeys/settings.spec.ts` |
| test/settings-signout-confirm.test.mjs | transplant (JSX regex) | DELETE | carry 1 case to `journeys/connection-cloud.spec.ts` |
| test/settings-text-scale-refresh.test.mjs | transplant + source-text | DELETE | — |
| test/settings-text-scale-settlement.test.mjs | transplant + source-text | DELETE | — |
| test/settings-truth.test.mjs | transplant + heavy source-text | REWRITE | `test/app-update.integration.test.mjs` (update-manifest admission table) |
| test/shade-notice-question.test.mjs | transplant fixture + Quint call | DELETE | 1 case `journeys/notifications.spec.ts` |
| test/shade-row-custody.test.mjs | transplant fixture | DELETE | — (Quint harness keeps fixture until PORT) |
| test/shade-tile-facts.test.mjs | transplant + source-text (incl. vendor) | DELETE | carry 2 cases to `journeys/home-shell.spec.ts` (standalone) |
| test/share-panel-adapter.test.mjs | transplant | DELETE | 1 case `journeys/camera-photos.spec.ts` |
| test/share-panel-watch.test.mjs | transplant + source-text | DELETE | — |
| test/shared-deletion-window.test.mjs | upstream JVM suite + source-text | MERGE (test 1) | host-JVM runner, upstream follow-up |
| test/shared-onboarding-account-return.test.mjs | transplant | DELETE | — (post-sign-in specs cover) |
| test/shell-navigation-detent.test.mjs | transplant (model.js slice) | REWRITE | `journeys/home-shell.spec.ts` (3 cases) |
| test/sign-in-incomplete-queue.test.mjs | transplant | REWRITE | `journeys/connection-cloud.spec.ts` (2 cases) |
| test/sign-release-apks.test.mjs | tooling (release-gating) | KEEP (trim) | — |
| test/sms-action-journal.test.mjs | JVM unit | MERGE | host-JVM runner |
| test/sms-agent-flow.test.mjs | integration (real `device-actions.ts`) | MERGE | `test/integration/phone-sms.test.mjs` |
| test/sms-incomplete-rows.test.mjs | integration at native boundary | MERGE | `test/integration/phone-sms.test.mjs` or `journeys/phone-sms.spec.ts` |
| test/source-renewal-notices.test.mjs | JVM unit | MERGE | host-JVM runner |
| test/source-renewal-question.test.mjs | transplant-lite | DELETE | — (Quint + `digest-source-renewal.spec.ts`) |
| test/source-snapshot.test.mjs | tooling | KEEP | goes with `source-snapshot.ts` if `build-archive.ts` is dropped |
| test/speech-output-warmup.test.mjs | source-text + upstream JVM | MERGE (JVM part) | host-JVM runner, upstream follow-up |
| test/startup-access-flow.test.mjs | integration-lite | MERGE | `test/startup-permission-completion.test.mjs` |
| test/startup-permission-completion.test.mjs | integration (React in JSDOM) | KEEP (drop ~5 legacy-format cases) | — |
| test/startup-warning-retention.test.mjs | transplant (main.tsx) | DELETE | optional 1 case `journeys/voice.spec.ts` |
| test/stopped-reply-match.test.mjs | source-text + upstream unit | DELETE | 1 case `journeys/chat.spec.ts` |
| test/stopped-reply-outcome.test.mjs | transplant | REWRITE | `journeys/chat.spec.ts` (2 cases) |
| test/streaming-speech.test.mjs | upstream JVM fixture + source-text over upstream | MERGE (test 1) | host-JVM runner, upstream follow-up |
| test/strict-build-inputs.test.mjs | tooling | KEEP (trim, split) | embedding cases to `test/embedding-host-admission.test.mjs`; rest renamed `android-build-preflight.test.mjs` |
| test/strip-types-compat.test.mjs | test-machinery test | DELETE | with `test/support/strip-types.mjs` |
| test/subscription-entitlement.test.mjs | mixed transplant + source-text + inventory | DELETE | carry 3 cases to `journeys/connection-cloud.spec.ts` |

## Behaviours that lose all coverage if the DELETEs land without replacements

- **Update-manifest admission** (`parseUpdateManifest`: HTTPS only, no URL credentials, signer and flavor match, sha256 shape,
  size bound, index-feed duplicates/nesting/16-entry bound). This is a network trust boundary that picks which APK is downloaded.
  `settings-device-facts.spec.ts` covers the happy paths only. The REWRITE target must land in the same change.
- **SMS incomplete rows never mark read** and **SMS device-action exactly-once/receipt honesty**: no browser coverage; kept as MERGE.
- **Stop outcome honesty** ("Outcome unknown" against "The agent stopped this reply."): no browser coverage; REWRITE to chat journey.
- **Sign-in incomplete during startup** ("Sign in again" shown once after startup): no browser coverage found; REWRITE.
- **Text-size overlap ordering** (latest write wins, failed write notice): only the held-initial-read case is in a browser spec.
- **Back detent sequence and drawer layering**: partial browser coverage (`chat-header-home`, `chat-voice-mode`).
- **Files selected-document Ask fencing** (stale reads, identity/visibility retirement, source re-check after retain): only partly
  replaceable by a journey; the identity-change and retain-boundary races would be lost.
- **Quick-settings tile honesty** (no on/off without a native fact): standalone/dev only, since the launcher uses Android's shade.
- **Wake-listener-off warning retained across remount**: no coverage after delete (low value).
- **Sign-out confirmation against a changed account**: dropped (low risk: the failure mode is no sign-out).

## Shared helpers worth keeping

- `test/fixtures/jvm-tools.mjs` (`runJvm`, `javaBinary`, `jsonJar`, `jvmSkip`, `upstreamVoiceSource`): the base for one table-driven
  host-JVM runner. Six files here (serial-storage-tasks, sms-action-journal, source-renewal-notices, shared-deletion-window,
  speech-output-warmup, streaming-speech) collapse into rows of it. Three of them still hand-roll `mkdtemp`/`javac`.
- `test/fixtures/native-source.mjs` (`prepareNativeFixture`, `noticeSources`): needed by the JVM runner rows.
- A shared **native-plugin fake** (a `registerPlugin` port with recording and deferred results) would replace the bundler plugins in
  `sms-incomplete-rows` and `selection-ask-readiness` and the resolve-hook stubs in `startup-permission-completion`.
- A shared scratch-dir and sha256 helper for tooling tests (`sign-release-apks`, `source-snapshot`, `strict-build-inputs`).

Not worth keeping once the transplants go: `test/support/strip-types.mjs` (about 217 importers today, all T2) and its test,
and `test/fixtures/ts-source.mjs` (5 importers). `test/fixtures/shade-notice-question.mjs` and `shade-row-custody.mjs` survive only
for their Quint harnesses until those are PORTed.

## Cross-file actions

1. Create `test/android-jvm.test.mjs` (table of sources, main class and expected PASS line) and fold in the six JVM files. Tag the
   upstream-only rows (`DeferredDeletionTest`, `StreamingSpeechTest`, the voice warmup/lead-trim/first-write fixtures) as D14 upstream
   follow-ups.
2. PORT `specs/quint/refinement/application/shade-notice-question-admission.mjs` and `shade-row-custody.mjs` to mount the real
   `installNotificationsAdapter`. The `notifications-adapter.ts` slices start at `const opaque` and end at `type Notice =`, and
   `context-selection.ts` is cut between `export const ASKABLE_NOTICE_KINDS` and `export type CaptureSelection`. Then delete
   `test/quint-shade-row-custody.test.mjs`, which duplicates the aggregate (T4).
3. Remove the marker comments `// settings-facts:begin/end` (settings-adapter.ts) and `// tile-facts:begin/end` (native-adapter.ts)
   with their tests. Extract the settings-facts region to `apps/app/src/prototype/settings-facts.ts` so the update-manifest
   integration test can import it.
4. Settings-truth asserts `updateChannelCheckEnabled = false` is present, while D8 deletes that switch. The test must go in the same
   commit as the switch, or it fails.
5. `startup-permission-completion` legacy cases (sessionStorage v1 key, v2/v3 native progress) must go with the A1 reader deletion in
   `startup-permission-progress.ts`.
6. Env knobs nobody sets, to be deleted with their tests: `ALPHA_CONNECTION_SOURCE`, `CONTROLLER_SOURCE`, `ALPHA_SHELL_MODEL_SOURCE`
   and `REQUIRED_SOURCE_ROOT`.

## Owner questions

- `sign-release-apks`: should the signer still refuse `build-config.json` records naming the removed `cloud` runtime profile or
  `localEmbeddings`? After a fresh build no such record can exist, so this is a legacy check.
- `sense-packaging-ndk`: is the "raw libc++_shared.so is never admitted" rule enforced by `verify-apks`/`verifyVoiceHost` today? If
  not, add it there before deleting this test.
- `source-snapshot`: does anything consume `build-archive.ts` provenance? If nothing does, delete the script and its test.
- Upstream-only JVM suites (deferred deletion, streaming speech, warmup): keep running them in Alpha until `vendor/eliza` CI runs
  them, or drop them now?
