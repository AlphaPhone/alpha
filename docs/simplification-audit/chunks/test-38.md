# Chunk test-38: host tests image-sms … local-speech-text

31 assigned files (30 present, `test/legacy-cloud-recovery.test.mjs` already deleted). Per-file reports are in
`docs/simplification-audit/files/test/<name>.md`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| test/image-sms.test.mjs | unit (`createSmsSession`) + stub-bundle transplant of `sms-adapter.ts` (4× copy-pasted esbuild block) | REWRITE | `test/browser/journeys/messages.spec.ts` (mark-read bound, SIM pick/inactive/Allow SIM, uncertain send keeps operation ID); rest duplicated by SmsSend/MmsCompose Quint replays |
| test/inbox-draft-copies.test.mjs | stub-bundle transplant | MERGE (1 case) | `test/integration/inbox-gmail.test.ts`: unsaved-copy flush on hide/retire, edit during clear kept |
| test/inbox-operation-guards.test.mjs | stub-bundle transplant + unit | MERGE (3 cases) | inbox integration (regressed receipt never re-dispatches, mailbox byte budget); review-sheet cases to `journeys/inbox.spec.ts`; legacy shared-document eraser deleted (A1) |
| test/inbox-retention-cases.test.mjs | wrapper of `scripts/test-inbox-retention-cases.ts` | MERGE | move script body into inbox integration |
| test/inbox.test.mjs | wrapper of 3 child suites + stub-bundle case | MERGE | child-suite bodies into inbox integration; inline case deleted |
| test/installed-upgrade-runner.test.mjs | tooling (fake adb/aapt, ~20 spawns) | SIMPLIFY + MERGE | `test/tooling/device-campaigns.test.ts`; delete 5 legacy-digest cases (D1) |
| test/instrumentation-outcome-status.test.mjs | tooling (pure parser) | MERGE | `test/tooling/device-campaigns.test.ts` |
| test/invocation-owner-cache.test.mjs | source-text + host-JVM unit | DELETE | expiry harness to Gradle JVM tests or a resident Quint expiry action |
| test/keyboard-dictation.test.mjs | JVM unit + manifest regex + private Quint runner + compile check + JVM stub harness | DELETE | covered by KeyboardDictation/KeyboardDictationCloud replays and `scripts/apk.ts` audit; delete `test/fixtures/KeyboardDictationPolicyTest.java` |
| test/launcher-orientation.test.mjs | source-text | DELETE | device: `RotationInstrumentedTest`; optional APK-audit rule |
| test/legacy-cloud-recovery.test.mjs | — | DELETE (gone) | — |
| test/legacy-hosted-selection.test.mjs | transplant + source-text of a legacy migration | DELETE | delete `migrateLegacyHostedSelection` with it (D1/D5) |
| test/lemma-check.test.mjs | tooling (stub lsc/dafny) | KEEP | absorb `lemma-checker`; later `test/quint/tooling.test.mjs` |
| test/lemma-checker.test.mjs | tooling, duplicate | MERGE | into `test/lemma-check.test.mjs` (5 unique cases) |
| test/licenses.test.mjs | tooling/integration over real node_modules | KEEP (simplify) | `test/tooling/apk-verify-audit.test.ts`; drop named-package inventory pins |
| test/live-asr-route-token.test.mjs | source-text | DELETE | — |
| test/live-capture-resource.test.mjs | upstream JVM test re-run + vendor regex | DELETE | upstream follow-up; LiveCapture Quint replay stays |
| test/live-voice.test.mjs | upstream-through-shim unit + source-text + upstream JVM | DELETE | carry "live latency numbers only into diagnostics" to voice/diagnostics integration |
| test/llama-cpp-only.test.mjs | repo text scans + bundle/APK audit tooling | MERGE (tests 4-6) | `test/tooling/apk-verify-audit.test.ts`; delete repo-wide scans |
| test/local-agent-contracts.test.mjs | wrapper of 6 child suites | MERGE | `test/integration/resident-runtime.test.ts` + `test/integration/dev-bridge.test.ts` |
| test/local-agent-feature-starting.test.mjs | class-body transplant | REWRITE | resident-runtime integration over real `LocalAgentProtocol` + `mock.timers` (6 cases, no other coverage) |
| test/local-agent-native-events.test.mjs | transplant + `node -e` child | MERGE (2 cases) | resident-runtime integration, real import |
| test/local-agent-native-stream.test.mjs | real modules via `loadBrowserModule`, mock timers | MERGE | resident-runtime integration (not delete: the browser twin does not cover deadlines) |
| test/local-agent-provider-admission.test.mjs | upstream JVM test re-run + source-text | DELETE | upstream follow-up; resident Quint replay compiles the classes |
| test/local-agent-selection.test.mjs | tooling (real fs) | KEEP | `test/tooling/android-build-inputs.test.ts` |
| test/local-agent-voice-bridge.test.mjs | integration (real HTTP/WS dev bridge) | KEEP (simplify) | `test/integration/dev-bridge.test.ts` with 6 sibling dev-bridge files, path-filtered |
| test/local-conversation-cleanup.test.mjs | vm transplant | DELETE | RendererSpeechChunk + SpeechCleanupLatch replays |
| test/local-reply-speech.test.mjs | vm transplant | REWRITE | `test/integration/voice.test.ts`, real import (bridge is already a parameter) |
| test/local-speech-native-drain.test.mjs | vm transplant | DELETE | RendererSpeechChunk replay |
| test/local-speech-playback.test.mjs | vm transplant (cloud-voice-view + fake Shell) | REWRITE | steps in `journeys/notes.spec.ts` (Cloud fallback, error copy) and `journeys/voice.spec.ts` (Listen refuses links) |
| test/local-speech-text.test.mjs | vm transplant of a pure planner | MERGE (tests 1-4) | `test/integration/voice.test.ts`, real import of `planLocalSpeech` |

Totals: 11 DELETE, 4 KEEP, 16 MERGE/REWRITE/SIMPLIFY.

## Corrections to `research/tests-host.md`
- `installed-upgrade-runner`, `lemma-check`: not regex tests; both spawn the real script against fakes (tooling).
- `invocation-owner-cache`: compiles the whole `InvocationOwnerCache.java`; only its first half is source text.
- `local-agent-native-stream`: deleting it for the "same-name browser spec" loses the silence/turn-budget deadline rules; merge instead.
- `image-sms`: half the file imports the real module (unit), half is stub-bundled.
- `live-voice.ts` is a re-export of upstream, so tests 1-5 are T5, not product coverage.

## Behaviours that lose all coverage if the DELETEs happen without replacement
1. Invocation-owner cache expires exactly at the Cloud credential's `expiresAt` and never caches a read overlapping a credential commit (`invocation-owner-cache`). Needs a Gradle JVM test or a resident Quint expiry action.
2. Local speech routes use the per-boot resident token, every other route the owner session (`live-asr-route-token`): only device evidence remains.
3. SMS mark-read is bounded by the newest shown message and only written when the SMS role is held (`image-sms`): carry into the messages journey.
4. Deferred feature registration retry rules of the resident protocol (`local-agent-feature-starting`): must be rewritten, not dropped.
5. Reply-speech append/settle and listener retirement (`local-reply-speech`); credential refusal in speech planning (`local-speech-text`); Listen refusing links and Cloud→device fallback copy (`local-speech-playback`). All have REWRITE/MERGE targets; none is covered elsewhere today.
6. Live latency stored as numbers only and copied to diagnostics without text (`live-voice` test 6).
7. Launcher portrait lock: only `RotationInstrumentedTest` on device unless the APK audit gains an orientation rule.

## Shared helpers
- Keep: `test/fixtures/browser-source.mjs` (`loadBrowserModule`): the bridge from transplants to real imports for renderer modules; the rewrites above use it. `test/fixtures/jvm-tools.mjs` stays while JVM tests remain (146 references).
- Retire as importers go: `test/support/strip-types.mjs` and `test/fixtures/ts-source.mjs` (two ways to strip types; a third is `node:module` `stripTypeScriptTypes`), the per-file esbuild `bundle(entry, mocks)` helper (copied in `inbox-draft-copies` and `inbox-operation-guards`, twin of `scripts/fixtures/bundled-module.ts`), `test/fixtures/child-suite.mjs` once every `scripts/test-*.ts` body moves, `test/fixtures/KeyboardDictationPolicyTest.java` (only importer deleted), `test/fixtures/cloud-voice-view.mjs` (10 importers; this chunk removes one).
- New: one fake adb fixture for device-campaign tooling tests; one dev-bridge fixture (runtime stub + `upgrade()` helper) for the 7 dev-bridge files; one typed telephony bridge fake shared by the messages journey and `aosp-telephony-views.spec.ts`; one typed `AlphaVoiceCloud` bridge fake for voice integration cases.

## Cross-file actions
- Product deletions that go with these tests: `migrateLegacyHostedSelection`/`LEGACY_HOSTED_SELECTION` (`connection-ui.tsx:1612-1640,2640`); the retired-mail-snapshot eraser in `service-read-cache-store.ts`; the legacy-digest companion in `scripts/test-installed-upgrade.ts:117` and `WorkflowLegacyReminderUpgradeInstrumentedTest.java` (plus the registry entry in `scripts/android-instrumentation.ts:292` and its check in `android-instrumentation-runner.test.mjs:558-559`); `VOICE_SEND_POLICY` (D8).
- Scripts chunk: move `scripts/test-inbox-*.ts`, `scripts/test-local-agent*.ts`, `test-local-digest-storage.ts`, `test-digest-cancellation.ts`, `test-agent-speech-bridge.ts`, `test-agent-tts-bridge.ts` into `test/integration/`; decouple `check-lemma.ts` from `quint-lib.ts`.
- APK audit (`scripts/apk.ts` `distributionProblems`): optionally add launcher `screenOrientation=portrait` and the voice IME subtype attributes as release rules, replacing two deleted text tests.
- Upstream follow-ups (D14): `LiveCaptureResourceTest`, `LiveCaptureAdmissionTest`, `LiveVadGateTest`, `NativeProviderAdmissionTest` should run in upstream CI, not here.
- CI lanes: licences tests only on `package-lock.json`/`licenses/**`/licence scripts; dev-bridge tests only on dev bridge sources and `vite.config.ts`; device-campaign tooling only on `scripts/*instrument*`/`test-installed-upgrade.ts`.
- Structural: two files named `local-speech-playback.ts` (D11); `runtime/live-voice.ts` is a re-export shim of upstream (D4).

## Owner questions
1. Should manual-only device campaign runners (`scripts/test-installed-upgrade.ts`) keep host tests at all, or only runners that gate a release?
2. Do you want Gradle `android/app/src/test` JVM tests for small native classes (e.g. `InvocationOwnerCache` expiry), or should such rules move into Quint models only?
3. Does the WebView floor still lack `AbortSignal.any`? If not, the fallback and its test case go.
4. Does the pinned upstream runtime always send SDK17 stop-intent metadata? If yes, the dev bridge's "legacy ticket" path and its case go.
5. Is `test-digest-cancellation.ts` testing Alpha's retained-brief binding or only the upstream `DigestInbox`?
