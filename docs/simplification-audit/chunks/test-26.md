# Chunk test-26: host tests `cloud-personal-protocol` … `connection-background-restore` (33 files)

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| test/cloud-personal-protocol.test.mjs | 44 | unit (real module, stub transport) | DELETE | - (D5 personal Cloud) |
| test/cloud-phone-login.test.mjs | 59 | render + Vite SSR integration + unit | MERGE / REWRITE | `test/integration/connection-cloud.test.mjs` (cases 2-3); `journeys/connection-cloud.spec.ts` (case 1) |
| test/cloud-plan-cancel.test.mjs | 17 | transplant | DELETE | one step in `journeys/settings.spec.ts` |
| test/cloud-prewarm.test.mjs | 76 | transplant + source-text + unit | DELETE | warm count in `journeys/chat.spec.ts`; allowlist rows to dev-bridge tooling test |
| test/cloud-protocol-error-copy.test.mjs | 46 | transplant | DELETE | later case in connection-cloud integration |
| test/cloud-qa-launcher.test.mjs | 19 | tooling | MERGE (if script stays) | `test/tooling/local-agent-launcher.test.mjs` |
| test/cloud-reachability.test.mjs | 83 | integration-lite | MERGE | `test/integration/connection-cloud.test.mjs` |
| test/cloud-readiness.test.mjs | 203 | tooling (+ T1 lines) | KEEP (move, trim) | `test/tooling/cloud-readiness.test.mjs` |
| test/cloud-resident-authority.test.mjs | 80 | build-flag integration + transplant | MERGE cases 1-5 / DELETE 6-7 | `test/release/build-gating.test.mjs` |
| test/cloud-resident-embedding-route.test.mjs | 70 | integration (prepared SDK) | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| test/cloud-resident-full-profile.test.mjs | 130 | integration (prepared SDK) | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| test/cloud-resident-host.test.mjs | 187 | integration via vm-transplant fixture | REWRITE | `test/tooling/cloud-resident-host.test.mjs` (direct import) |
| test/cloud-sdk-routing.test.mjs | 19 | integration (prepared SDK) | MERGE | `test/tooling/cloud-resident-host.test.mjs` |
| test/cloud-service-info.test.mjs | 9 | unit (boundary parser) | MERGE | `test/integration/connection-cloud.test.mjs` |
| test/cloud-sign-in-flow.test.mjs | - | already deleted in worktree | n/a | - |
| test/cloud-sign-in-late-readiness.test.mjs | 64 | transplant + source-text | DELETE | later integration after connection-ui split |
| test/cloud-sign-in-network.test.mjs | 66 | vendor Java transplant + unit | DELETE case 1 / MERGE case 2 | `test/integration/connection-cloud.test.mjs`; upstream follow-up |
| test/cloud-sign-in-readiness-retry.test.mjs | 36 | transplant + source-text | DELETE | `journeys/connection-cloud.spec.ts` step |
| test/cloud-sign-in-state.test.mjs | 374 | transplant (panel + controller) | REWRITE | `journeys/connection-cloud.spec.ts` + later integration |
| test/cloud-signing-input.test.mjs | 10 | wrapper | DELETE | one line in Python collector |
| test/cloud-signing-input.test.py | 292 | tooling (release gate) | KEEP | run by `test/tooling/python.test.mjs` |
| test/cloud-speech-chunks.test.mjs | 93 | unit of upstream module | MERGE (interim) | `test/integration/voice.test.ts`; upstream follow-up |
| test/cloud-speech-stream.test.mjs | 191 | JVM + source-text + Java transplants | KEEP case 1 / DELETE 2-5 | JVM lane |
| test/cloud-speech-timing.test.mjs | 6 | JVM | MERGE | JVM lane |
| test/cloud-streaming-conversation.test.mjs | 173 | transplant (upstream session) | REWRITE | `journeys/voice.spec.ts` |
| test/cloud-voice-limit.test.mjs | 146 | mixed | REWRITE | `test/integration/voice.test.ts` (parser), JVM lane, `journeys/voice.spec.ts` |
| test/cloud-voice-profile.test.mjs | 237 | mixed transplants + JVM + duplicate CI step | REWRITE | `journeys/voice.spec.ts`, JVM lane |
| test/committed-device-changes.test.mjs | 44 | integration-lite | MERGE | `test/integration/device-actions.test.mjs` |
| test/committed-view-observation.test.mjs | 64 | transplant (mostly upstream) | DELETE | Quint refinement keeps it |
| test/comms-settings.test.mjs | 96 | region transplant + stub bundle + T1 | DELETE (carry 2) | `test/integration/phone-sms-contacts.test.ts` after extraction |
| test/composer-send-ownership.test.mjs | 152 | transplant | DELETE (carry 4) | `journeys/chat.spec.ts` |
| test/connection-action-reconcile.test.mjs | 49 | transplant | DELETE | later integration after split |
| test/connection-background-restore.test.mjs | 61 | transplant | DELETE | `journeys/startup-permissions.spec.ts` / connection-cloud journey |

Totals: 32 present files reviewed, 33 reports. DELETE 12 (incl. the wrapper), MERGE/REWRITE 17 (`cloud-sign-in-network` counted here: one case merges, one deletes), KEEP 3 (`cloud-readiness`, `cloud-signing-input.test.py`, `cloud-speech-stream` case 1), 1 already gone.

## Behaviours that lose all coverage if the DELETEs land before replacements
Be honest: these have no other test today.
- Sign-in readiness late-answer fence (adopt by same chooser; retire on abort/epoch/chooser change/key action) — `cloud-sign-in-late-readiness`.
- Sign-in controller races: late verify/email/Google after Back ignored; no duplicate verify; failed resend keeps first code; expired code keeps address — `cloud-sign-in-state` controller cases.
- Inference pre-warm debounce (one per minute, skip conditions) — `cloud-prewarm`.
- Action-history reconcile epoch fence — `connection-action-reconcile`.
- Composer send ownership races (superseded send, unconfirmed voice stop, changed draft) — `composer-send-ownership` (partly in `composer-dispatch.spec.ts`; verify).
- Native relay startup budget, duplicate STT readiness, pre-ready error codes — `cloud-speech-stream` cases 3-5.
- Native multipart WAV upload clears decoded PCM on every failure and replays a warming 503 once — `cloud-voice-profile` case 6.
- Cloud streaming Talk endpointing (400 ms window, continuation join, Stop in window) and streaming/batch refusal parity — `cloud-streaming-conversation`.
- Shared Java sign-in transport classification (upstream; needs a vendor test).
- Background account restore never opens the chooser / failed restore opens recovery — `connection-background-restore` (partly in `saved-signin-retry.production.spec.ts`).

## Shared helpers worth keeping
- `test/fixtures/jvm-tools.mjs` (`sharedSpeechSource`, `runJvm`, `fixture`): the one host JVM runner; keep for the JVM lane.
- `test/fixtures/browser-source.mjs` (17 importers): Vite-aware real-module loader; keep, it is the import path the integration files need.
- `test/fixtures/product-character-host.mjs`: keep only the core-state setup; drop its `vm` transplant of `scripts/cloud-resident-host.ts` (import the export).
- `test/fixtures/cloud-plugin-selection.mjs`: survives with the cloud-resident-host merge.
- `test/fixtures/committed-view-observation.mjs`: survives through the Quint refinement harness (to be ported to imports).
- `test/fixtures/cloud-voice-view.mjs`: 10+ importers, all transplants; retire with them.
- Committed Java fixtures `CloudVoiceLimitTest.java`, `CloudSpeechPolicyTest.java`, `CloudSpeechTimingsTest.java`, `CloudSpeechWireTest.java`: keep.

## Cross-file actions
- Three strip-types mechanisms (`test/support/strip-types.mjs`, `test/fixtures/ts-source.mjs`, `node:module` `stripTypeScriptTypes`); retire the last two with their transplant importers (C5).
- Same skip guard and `recordingLauncher` copied in three cloud-resident files; one copy in the merged file.
- Prepared-SDK tests run un-skipped in `browser.yml`, `android.yml` and `resident-prepare.yml`: run once (P3).
- `scripts/check-cloud-recording-signature.ts` runs both as a CI step and inside `cloud-voice-profile`: keep one.
- Product marker comments (`// return-gate:begin`, `// settings-reads:begin`) exist only for `comms-settings`: extract to modules and delete markers (D7).
- `cloud-personal-protocol` deletion goes with the D5 renderer deletion, together with `test/browser/cloud-personal-onboarding.spec.ts` and `scripts/test-cloud-personal-flow.ts`.
- `cloud-voice-profile` pins `connectPaired` (paired voice, D5): drop with that path.
- Env knobs nobody sets: `SETTINGS_SOURCE`, `ALPHA_READINESS_SOURCE` (T9).
- Upstream follow-ups (D14): tests for `cloud-speech-chunks.ts` and `CloudSignInPlugin.java` transport classification in `vendor/eliza`.

## Owner questions
- Keep `scripts/start-cloud-qa.ts` (no caller besides tests and a Quint harness)? Decides `cloud-qa-launcher.test.mjs`.
- Is the development Cloud resident host (`dev:cloud`, `scripts/cloud-resident-host.ts`) staying as a supported developer surface? If yes, the ~13 cases of the merged tooling file are worth keeping; if not, all four cloud-resident files go.
- Accept a temporary coverage gap for the sign-in readiness and controller races until the connection-ui split lets them be tested by import, or keep the transplants until then?
