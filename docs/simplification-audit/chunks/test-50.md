# Chunk test-50: verify-apks, video, view-navigation and voice host tests

25 files reviewed and all 25 pass today (`node --test`, run one file at a time on 2026-11-11). `verify-apks.test.mjs` takes
about 90 s. `voice-calm-cloud-errors` takes about 15 s. Every other file takes under 5 s.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| test/verify-apks.test.mjs | tooling (packaging CLIs + APK bytes) | KEEP | Move into `test/release/apk-verify-audit.test.ts`. Drop the runtime-profile refusals that `one-runtime-profile.test.mjs` also checks, the exact manifest count and the second zip helper |
| test/video-capture-limit.test.mjs | transplant | DELETE | Carry the size-limit save and the size-limit failure to `journeys/camera-photos.spec.ts` |
| test/view-navigation-settle.test.mjs | unit (real module, stub ports) | MERGE | `journeys/home-shell.spec.ts`: fence failure after claim; a lost positive result is never followed by a second |
| test/voice-assistant.test.mjs | unit of upstream code via shims + T1 + upstream JVM | DELETE | Duplicates `vendor/eliza/packages/voice/src/voice-assistant-session.test.ts` and `live-voice-session.test.ts`. Diff the case lists first; missing cases become upstream follow-ups |
| test/voice-call-interrupted-capture.test.mjs | transplant | DELETE | Carry the call pause and the `[WORKFLOW]` stripping to `journeys/voice.spec.ts` |
| test/voice-calm-cloud-errors.test.mjs | transplant | DELETE | Carry to `journeys/voice.spec.ts`: 429 Retry-After wait, bounded retries, 401 terminal line, on-device fallback |
| test/voice-capture-lifecycle.test.mjs | transplant of upstream | DELETE | Upstream owns it |
| test/voice-capture-retirement.test.mjs | unit of upstream (esbuild) | DELETE | Upstream owns it |
| test/voice-completed-action-context.test.mjs | transplant + projection check + upstream parsers | DELETE | Covered by `voice-owned-navigation.spec.ts` |
| test/voice-composer-recovery.test.mjs | unit (SSR render) | DELETE | Twin of the Playwright spec with the same name |
| test/voice-context-loss.test.mjs | transplant of upstream | DELETE | Upstream owns it |
| test/voice-copy-presentation.test.mjs | transplant + T1 | DELETE | Carry: unconfirmed cleanup blocks Talk and Transcribe with the notice |
| test/voice-credit-terminal.test.mjs | transplant of upstream | DELETE | Billing is covered by `billing-recovery.production.spec.ts` |
| test/voice-denied-recovery.test.mjs | unit + T1 + transplant | DELETE | Carry: denied mic → "Open app settings" → privacy settings → removed after a granted retry |
| test/voice-entry-timing.test.mjs | integration (real modules) + 2 transplant cases | MERGE | `test/voice-timing.test.mjs`, auto-send cases only. Remove the `review` policy cases together with the D8 switch |
| test/voice-fixture-failure-metadata.test.mjs | tooling (Playwright helper) | DELETE | T5 |
| test/voice-host-absent-admission.test.mjs | tooling (release) | MERGE | `test/release/voice-host.test.ts`; table-drive the overlay cases |
| test/voice-host-record.test.mjs | tooling (release) | MERGE | `test/release/voice-host.test.ts`, together with `android-stage-voice-models.test.mjs`; drop the assertions on constants in the committed record |
| test/voice-in-chat-only.test.mjs | source-text + transplant | DELETE | The rule is enforced on the built APK by `scripts/apk.ts:145-169`; startup `turnOff` is covered by `listener-invocation.production.spec.ts` |
| test/voice-owned-capture-cleanup.test.mjs | transplant + unused env knob | DELETE | Shares a carry with `voice-copy-presentation` |
| test/voice-prepared-navigation.test.mjs | transplant | DELETE | Carry: an unknown or mismatched view path makes no claim (`journeys/voice.spec.ts`) |
| test/voice-progress-presentation.test.mjs | transplant (dev path) | DELETE | Owner question 3 |
| test/voice-progress-state-forwarding.test.mjs | unit (dev path, esbuild stubs) | DELETE | — |
| test/voice-recovery-state.test.mjs | transplant (regex callback extraction) | DELETE | — |
| test/voice-repeated-interim.test.mjs | transplant | DELETE | Carry: a repeated phrase still shows its interim text |

Counts: KEEP 1, MERGE 4, DELETE 20.

## Corrections to `research/tests-host.md`

- `verify-apks.test.mjs` (line 1399) is not "a Python unittest". It is a Node integration test of the packaging CLIs.
- `voice-assistant.test.mjs` (line 1402) should not become the "voice integration core". Everything it imports is a one-line
  re-export of upstream `.eliza/client-features/packages/voice`. Upstream already has a 71-case suite with the same scenarios.
- `voice-capture-retirement.test.mjs` (line 1406) does not import an app module. It bundles the upstream voice session client.
- `voice-entry-timing.test.mjs` (line 1413) is mostly real-module integration. Only the last two cases use the transplant fixture.
- The research says `voice-host-absent-admission` and `voice-host-record` should be kept per tool family. Agreed. They are
  release tooling, they belong together with `android-stage-voice-models.test.mjs`, and the result should be one file.

## Behaviours that lose all coverage if the DELETEs happen without the carries

None of these has an assertion in `test/browser` today (checked with grep):

1. A phone call pauses voice with "Voice paused for a phone call." and nothing is transcribed or sent.
2. `[WORKFLOW]` markup in a reply is neither spoken nor shown in the voice panel.
3. Cloud voice 429/503: a quiet wait that honours Retry-After, retries capped at three, and a long wait ends calmly
   without a toast. The Quint `QuietVoiceRetry` model covers the budget but not the rendered copy.
4. With on-device speech, a Cloud voice refusal switches the conversation to the phone at once and does not resend the turn.
5. The denied-microphone "Open app settings" control: it exists, opens the app's privacy settings and goes away after a granted retry.
   This is a regression first found on an API 36 emulator.
6. After an unconfirmed mic cleanup, Talk, Transcribe and Back each show "Voice unconfirmed · restart app" and open no capture.
7. A voice navigation event whose id does not match its path, or names an unknown view, makes no claim request.
8. Repeating the same phrase in a later turn still shows its interim transcript.
9. A recording that reaches the size limit is saved shortened, and a limit too small for any chunk shows the size message.
10. View navigation: a fence failure after the claim settles one negative result, and a positive result is never followed by a
    second one.

Each item needs one case in the named journey spec. Together that is about 12 cases, mostly in `journeys/voice.spec.ts`
on the shared Capacitor voice fixture plus a Cloud voice route fake and `page.clock`.

Coverage that moves upstream, if missing there (follow-up under D14): the cases in `voice-assistant.test.mjs` with no upstream
twin. Likely candidates are "unconfirmed request/conversation id never plays" and "Notes review keeps input closed through
exact approval". The same applies to upstream mic-capture and client cases in `voice-capture-lifecycle`, `voice-capture-retirement`,
`voice-context-loss` and `voice-credit-terminal`.

## Shared helpers and fixtures

- `test/fixtures/cloud-voice-view.mjs` (16 importers) and `voice-markup.mjs` (2 importers in this chunk) are the transplant
  family. After this chunk's DELETEs, 8 of the cloud-voice-view importers here are gone. The fixture should go entirely once
  the rest of the voice family (`pixel-spoken-acks`, `voice-replies`, ...) is resolved.
- `test/fixtures/shared-batch-voice.mjs` (`voiceFakeClock`; 10 importers): this chunk removes 2 of them.
- `test/fixtures/browser-source.mjs` (16 importers): this chunk removes 1. It survives.
- `test/support/strip-types.mjs` (170 importers): this chunk removes 9. It goes when the transplant family is gone.
- `test/fixtures/voice-host-product.mjs` survives. Its two importers merge into one file.
- Worth keeping, as release-tooling support shared with the AOSP staging tests: the `completeAospLock`/`stageAosp` helpers
  and one zip writer from `verify-apks.test.mjs`.

## Cross-file actions

- When `voice-entry-timing` goes, delete `setVoiceSendPolicyForTests` and the `review` policy branch together (D8). Its other users,
  `voice-selection.test.mjs:123-129`, `test/browser/voice-timing.spec.ts:21` and `chat-voice-mode.spec.ts:98`, need the same change.
- `voice-assistant.test.mjs` is the last test-side reason for the shims `apps/app/src/runtime/voice-assistant.ts`,
  `live-segment-stream.ts` and `voice-turn-routes.ts` ("Alpha keeps this module path for its adapter and tests"). Once it is
  deleted, `voice-adapter.ts`/`agent-adapter.ts` can import `@elizaos/voice/*` directly (D4).
- `voice-prepared-navigation` and `voice-completed-action-context` slice `agent-adapter.ts`, `connection-ui.tsx` and
  `view-navigation.ts`. Delete them before the D1 splits and the formatter (D9). Check the Quint harness
  `specs/quint/refinement/application/voice-owned-navigation.mjs` for the same markers (T10 port).
- `one-runtime-profile.test.mjs`: drop its `verify-apks.ts`/`build-archive.ts` refusal rows, since this file keeps them.
- Nothing sets `ALPHA_VOICE_ADAPTER_SOURCE`, so it is a dead env knob (T9). It disappears with `voice-owned-capture-cleanup`.

## Owner questions

1. Does the agent still send the old view ids/paths `workflows` at `/apps/workflows` and `home` at `/home`? If not, the
   adapter's alias acceptance can be deleted along with the test case (`voice-prepared-navigation.test.mjs:71-73`).
2. Does D8 remove the `review` voice send policy completely, or does the Notes recorder keep a review step through it?
3. Does production (non-development) Cloud voice show server progress text as the turn status? If yes, add one journey case
   ("progress is shown, never saved as a message"). If it is development-only, nothing is carried.
4. Should the bespoke Playwright failure-metadata probe (`test/browser/voice-fixture-failure-metadata.ts`) stay at all, once
   Playwright traces are on the shared harness?
