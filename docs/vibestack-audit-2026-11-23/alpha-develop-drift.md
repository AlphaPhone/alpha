# Alpha `develop` commits not on `vibestack` (2026-11-23 18:10Z)

Alpha `develop` f29c9cdc3 against `vibestack` b0a0e72a8. `develop` stays on the legacy app, so none of these can be
merged: each needs its behaviour written into the Vibestack app, Android or scripts. Commits already ported are listed
so nobody ports them twice.

## Unowned: need a port

### 208ea0ad4 Land reviewed v119-demo Android, updater, diagnostics, voice formatting, and workflow guard fixes on develop

Five separate fixes in one commit. Port each on its own: the in-call activity and presentation changes (launcher manifest, `AlphaCallActivity`, `AlphaCallPresentation`, `AlphaInCallService`), the view-request diagnostic (`ViewRequestDiagnostic.java`, `alpha-client.ts`), spoken-text formatting (`speech-format.ts`, `local-speech-text.ts`, `batch-conversation.ts`), the app-update producer, signing-input and update-channel script changes, and the workflow guard in `agent-adapter.ts`. `app.config.json` changed too.

  - `android/app/src/launcher/AndroidManifest.xml`
  - `android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaCallActivity.java`
  - `android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaCallPresentation.java`
  - `android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaInCallService.java`
  - `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java`
  - `android/app/src/main/java/ai/alphacompute/alphaphone/ViewRequestDiagnostic.java`
  - `android/app/src/test/java/ai/alphacompute/alphaphone/AlphaCallPresentationTest.java`
  - `app.config.json`
  - `apps/app/src/prototype/agent-adapter.ts`
  - `apps/app/src/prototype/local-speech-playback.ts`
  - `apps/app/src/prototype/voice-adapter.ts`
  - `apps/app/src/runtime/alpha-client.ts`
  - `apps/app/src/runtime/connection-ui.tsx`
  - `apps/app/src/runtime/local-speech-text.ts`
  - `apps/app/src/ui/voice/batch-conversation.ts`
  - `apps/app/src/ui/voice/speech-format.ts`
  - `docs/alpha-cloud.md`
  - `docs/development.md`
  - `scripts/ci/app_update_producer.py`
  - `scripts/ci/private-artifact-identity.json`
  - `scripts/ci/qualified-app-update.py`
  - `scripts/ci/verify-cloud-signing-input.sh`
  - `scripts/local-agent-dev-bridge.ts`
  - `scripts/update-channel.ts`
  - `specs/quint/refinement/application/read-aloud.mjs`
  - `specs/quint/refinement/native/request-withdrawal-platform.mjs`
  - `specs/quint/refinement/native/request-withdrawal.mjs`
  - `specs/quint/refinement/native/resident-coordinator.mjs`
  - `specs/quint/refinement/services/protected-app-update-promotion.mjs`
  - `test/app-update-candidate.test.mjs`
  - `test/cloud-signing-input.test.py`
  - `test/deliver-app-update.test.mjs`
  - `test/fixtures/app-update-candidate.mjs`
  - `test/fixtures/shared-batch-voice.mjs`
  - `test/local-agent-voice-bridge.test.mjs`
  - `test/local-speech-text.test.mjs`
  - `test/qualified-app-update.test.mjs`
  - `test/view-request-diagnostic.test.mjs`

### 95992588b Add on-demand Pixel carrier and SIM setup (from ba94498491)

New native plugin `AlphaCarrierSetupPlugin` registered in `MainActivity`, a renderer runtime module, Settings rows, phone context, and PRD and development-doc text. On `vibestack` this needs a spec rule under `apps/app/spec/telephony/phoneInfo.md` or `settings`, the plugin registration, and the Settings UI.

  - `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCarrierSetupPlugin.java`
  - `android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java`
  - `apps/app/src/prototype/agent-adapter.ts`
  - `apps/app/src/prototype/context-selection.ts`
  - `apps/app/src/prototype/settings-adapter.ts`
  - `apps/app/src/runtime/carrier-setup.ts`
  - `apps/app/src/runtime/phone-context.ts`
  - `docs/development.md`
  - `docs/prd.md`
  - `test/browser/settings-device-facts.spec.ts`
  - `test/carrier-setup.test.mjs`

### 56a6ad2b7 Model the Home-host browser return in GoogleBrowserReturnClaim (from 0e5878898f)

Legacy Quint model and its Java trace fixture only. On `vibestack` the Home-host browser return has no model: the open-items doc lists `GoogleBrowserReturnClaim` among the missing Java-side host models. Carry the new case into `apps/app/spec/account` when that model is written.

  - `specs/quint/native/GoogleBrowserReturnClaim.qnt`
  - `specs/quint/native/manifest.json`
  - `specs/quint/refinement/native/GoogleBrowserReturnClaimTraces.java`
  - `test/quint-google-browser-return-claim.test.mjs`

### 23f73b6a7 Fix sign-in probe state, typed phone numbers, phone-only plans and Back after code (from 489dfaa9f0)

Four sign-in fixes in the legacy runtime: probe state, typed phone numbers, phone-only plans, and Back after the code step. Check each against `apps/app/spec/account` and `apps/app/src/account`; the round-one account audit (`alpha-settings-account-cloud.md`) did not cover phone sign-in case by case.

  - `apps/app/src/runtime/cloud-protocol.ts`
  - `apps/app/src/runtime/cloud-sign-in.ts`
  - `apps/app/src/runtime/connection-ui.tsx`
  - `test/cloud-phone-login.test.mjs`

### f53a3af01 Report whether a native file search is complete (from ff79f04ce8)

Android only. `AlphaFilesPlugin` exists on `vibestack`; apply the same change there and carry the completeness flag into `apps/app/src/files`.

  - `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaFilesPlugin.java`
  - `test/browser/flag-off-android.ts`

## Signing and release pins

`android/release-signer.json` and `android/signing/alpha-key-manifest.json` differ between the branches: `develop` carries
the producer pins through v119 (5e73a32ea) and the Home and Phone role OTA target (b5cc999f9, #1356). A `vibestack` build
that is to update a phone running a `develop` release must carry the same signer record, or the update is refused.
Copy both files from `develop` and re-run the signing tests. Twenty-seven pin commits reduce to this one file state.

## Already on `vibestack`

- 413437f6c "Ask for the address-only position when too few networks are visible": `vibestack` 14f5a614f.
- cf1516d71 / #1463 "Look the phone up behind a chat turn that has no position": `vibestack` b0a0e72a8.

## Owned by another session

- #1455 (Browser page captured ahead of the turn) and #1465 (open Browser tabs from chat, eliza pin d9cf4f680b): Browser session. The upstream half of #1465 is draft elizaOS/eliza#40331.
- #1453 gaps (Browser close-all wording and private tabs, view-step ordering, voice conversation kept, contact card changes): Chat view session.
- #1457 and #1464 (Maps directions to a selected place, "directions to it") and #1459 ("Sure." acknowledgement): the pins point at eliza `develop` commits whose behaviour must exist on eliza `vibestack`; migration session, branch `claude/vibestack-develop-delta` (eliza develop #40060-#40299).
- #1456 (voice acknowledgement spoken as soon as its status arrives): ported as #1458.

## Legacy-only, nothing to port

- f80684d2d (Calendar-to-Maps journey test date), b48d66b79 (clock frozen in approval refinement fixtures), cdae31e18 / #1460 (audit runbook text; copy the doc if the runbook is kept).
