# Chunk test-32: `test/fixtures` (Android stub trees and JS harnesses a–g)

64 files reviewed, 64 reports under `docs/simplification-audit/files/test/fixtures/`. All assigned files still exist.
Verdicts: 45 KEEP, 11 DELETE, 8 MERGE/REWRITE. 36 of the KEEPs are the `app-update-jvm` stub tree, which is compiled as a whole.

## Files

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `android-stubs/android/webkit/MimeTypeMap.java` | Android JVM stub | KEEP | move into the merged stub set; used only by `files-browser.test.mjs` |
| `app-update-jvm/**` (36 files: `ai/alphacompute/alphaphone/*` 5, `ai/eliza/.../ConnectionTransport`, `android/**` 23, `androidx/**` 4, `com/getcapacitor/**` 4) | Android/Capacitor JVM stub tree | KEEP | compiled as a directory by `test/app-update.test.mjs` (UpdateFlowTest) and 4 live Quint native update harnesses; `PackageInstaller.java` is an AOSP-behaviour model, not a stub |
| `calendar-provider-jvm/android/provider/CalendarContract.java` | Android JVM stub | KEEP | becomes the only CalendarContract (absorb the inline copy in `calendar-sync-snapshot-jvm.mjs`) |
| `automatic-update-android/OtaActivity.java` | disposable APK for a platform probe | DELETE | with `scripts/test-automatic-update-platform.ts`, which nothing invokes |
| `app-update-candidate.mjs` | tooling fixture (real git, synthetic API) | KEEP | release-tooling tests; use `git-fixture.mjs` |
| `appearance-preference.mjs` | transplant (10 anchors over 3 files) | DELETE | Quint `appearance-preference-admission` PORTs; journey `journeys/settings.spec.ts` |
| `assert-order.mjs` | helper for source-text order pins | DELETE | after its T1 callers go |
| `browser-daily-stores.mjs` | integration harness (real Calendar/Daily/Clock bundle) | KEEP | `test/integration/support/browser-daily.mjs` |
| `browser-external-handoff.mjs` | Quint refinement harness | MERGE | into `specs/quint/refinement/application/browser-external-handoff.mjs`, importing the real module |
| `browser-reminder-clock.mjs` | integration helper | KEEP | fold into the browser-daily harness |
| `browser-source.mjs` | module loader (esbuild, Vite flags) | KEEP | the single integration loader; add a stub-map option |
| `calendar-draft-handoff.mjs` | Playwright steps under node:test | MERGE | calendar journey helpers |
| `calendar-mounted-editor.mjs` | Vite+Chromium e2e inside `npm test`, source rewriting | REWRITE | Playwright fixture for `journeys/calendar.spec.ts` |
| `calendar-sync-snapshot-jvm.mjs` | JVM runner | MERGE | into `test/calendar-sync-snapshot.test.mjs` via `runJvm` |
| `camera-calendar-review.mjs` | Playwright helper with in-page import | MERGE | camera/calendar journey helpers |
| `camera-preview-port.mjs` | Playwright fake camera + monkey-patch | MERGE | `fakeCamera` fixture on the shared harness |
| `canonical-calendar-draft-owner.mjs` | unit bundle with stub ports | DELETE | Quint `canonical-calendar-draft` PORTs |
| `chat-attachment-composer.mjs` | transplant (6 slices of `agent-adapter.ts`) | DELETE | Quint `chat-attachments` PORTs; `journeys/chat.spec.ts` |
| `child-suite.mjs` | child-suite spawner | DELETE | after `scripts/test-*.ts` move into `test/` |
| `cloud-plugin-selection.mjs` | child-process entry (real SDK collector) | KEEP | runs in `android.yml`, which sets the env |
| `cloud-voice-view.d.mts` | types for a transplant | DELETE | with `cloud-voice-view.mjs` |
| `cloud-voice-view.mjs` | transplant (~15 files, regex import strip) | REWRITE | voice integration harness importing real modules, then delete |
| `committed-view-observation.mjs` | transplant over upstream + Alpha | DELETE | Quint driver PORTs; upstream export needed |
| `core-state-root.mjs` | tooling fixture | KEEP | release tooling, 9 Quint services harnesses |
| `development-scope-provider.mjs` | orphan | DELETE | no reference anywhere |
| `device-action-policy.mjs` | integration helper | MERGE | browser-view integration support |
| `first-send-draft-migration.mjs` | transplant | DELETE | Quint driver PORTs (a live mechanism, not legacy data) |
| `git-fixture.mjs` | hermetic git helper | KEEP | `test/support/git.mjs` |
| `google-account-panel.mjs` | transplant (esbuild + vm + jsdom, 13 faked specifiers) | DELETE | Quint `google-*` drivers PORT; settings/connection journey |

## Coverage at risk if the DELETEs land without replacements

- **Theme preference** (`appearance-preference.mjs`): boot order of query, stored and system theme; "Theme not saved" on a refused write; a `storage` change from another tab. A settings journey needs these.
- **Chat transcript attachment across an owner or conversation switch** (`chat-attachment-composer.mjs`): no Playwright spec is known to switch rooms mid-send.
- **First-send draft move** (`first-send-draft-migration.mjs`): CAS move of the room-less draft, retry cadence, and never overwriting the destination. Only the Quint harness would cover it once ported. The visible part needs a chat journey.
- **Per-owner Calendar draft slots** (`canonical-calendar-draft-owner.mjs`): held reads and writes and foreign-owner drafts. The `calendar-mounted-*` e2e fixtures cover part of it until they are rewritten.
- **Google panel guarded save and Cloud-switch abort** (`google-account-panel.mjs`).
- **Agent-prepared view navigation handshake** (`committed-view-observation.mjs`): lost replies, revoked installation, foreign client. Most of this is upstream behaviour; Alpha's client half needs the ported Quint driver.
- **Statement-order pins** removed with `assert-order.mjs` callers: "MMS journaled before `sendMultimediaMessage`" (`aosp-sms.test.mjs:206`) and "resend throttle set before the status check" (`cloud-email-resend.test.mjs:34,37`). These are real safety orders and need a JVM case that observes the order at runtime.
- **OtaActivity**: nothing runs it today, so deleting it loses nothing. It was the only attempt at platform evidence that an unattended update keeps Keystore keys.

## Shared helpers worth keeping

- `browser-source.mjs` is the one integration module loader. Give it a stub-map option. Then `browser-daily-stores.mjs:42`, `canonical-calendar-draft-owner.mjs:19` and `cloud-voice-view.mjs` stop running their own esbuild, `tsImport` or vm pipelines.
- `git-fixture.mjs` is the hermetic git helper. `app-update-candidate.mjs:16-17` has a local `git` that is not hermetic and can be broken by a developer's signing or hook config.
- `browser-daily-stores.mjs` plus `browser-reminder-clock.mjs` form the calendar and reminders integration harness.
- `camera-preview-port.mjs`'s synthetic `captureStream` camera can serve as the harness's fake camera.
- `calendar-mounted-editor.mjs`'s closed GET-only record port and foreign-request refusal (lines 92-112, 211-234) can become a Playwright fixture.
- `core-state-root.mjs` and `app-update-candidate.mjs` are tooling fixtures for the release-tooling suite.

## Cross-file actions

1. **One Android host-JVM stub set.** Merge `app-update-jvm`, `android-stubs`, `calendar-provider-jvm`, `reviewed-copies-jvm`, `note-recorder-jvm`, `secure-store-memory` and `scoped-calendar-jvm`. Duplicates found:
   - `android/net/Uri` has 3 copies with different constructors.
   - `Context` has 3 copies, `AtomicFile` 3, `ContentResolver` 3.
   - `Intent`, `Build`, `SystemClock` and `JSObject` have 2 copies each.
   - `CalendarContract` has 3 copies, one of them an inline string in `calendar-sync-snapshot-jvm.mjs:15`.
   The merge is blocked while the 4 Quint native update harnesses compile `test/fixtures/app-update-jvm` by path, so it moves together with those harnesses.
2. **Quint harnesses that live in or depend on `test/fixtures`.** `browser-external-handoff.mjs` imports `specs/quint/refinement/application/support.mjs` and is itself a harness. It moves into `specs/`. The transplant fixtures here (appearance, chat-attachments, first-send, canonical-calendar-draft, google, committed-view) are imported by live drivers listed in `specs/quint/refinement/application/index.mjs`. Porting a driver needs these product exports:
   - `settleFirstSendSlot`
   - composer `send` and `attachTranscript`
   - `readInitialTheme`, appearance listeners and options
   - `installCanonicalCalendarDrafts` with injected ports
   - `GoogleConnectionsPanel` with injected ports
   - the upstream view-route settlement function (upstream follow-up, D14)
3. **Source rewriting at Vite transform time** (`calendar-mounted-editor.mjs:181-190`, anchors `shell = value;` and `  function hideAccess(){`) and the `google-account-panel.mjs` injection at ` async function load(){`. Both block the `main.tsx`, `camera-adapter` and `google-connection-ui` splits and the formatter (D9). Replace them with one dev-only observation hook behind `ELIZA_DEV_ALLOW_TEST_MOCKS`, or with DOM reads.
4. **Legacy Quint drivers** `specs/quint/refinement/legacy/calendar-navigation.mjs` and `camera-session.mjs` import `calendar-mounted-editor.mjs` and `camera-calendar-review.mjs`. Retire them with `specs/quint/legacy` (P6) before rewriting those fixtures.
5. **`cloud-voice-view.mjs` carries fakes for deleted features**: paired voice (`createPairedVoice`, `getPairedVoiceBinding`, `pairedFactories`; D5) and legacy Notes storage `mode:'legacy'` (D1). Remove them together with the product deletions. 16 host tests and 2 `scripts/test-cloud-voice-*` depend on this file.
6. **Dead code and knobs in importers**:
   - `test/cloud-resident-full-profile.test.mjs:102-110` defines `collect()`, which is never called and would throw because it sends no `variants`.
   - `ALPHA_NATIVE_UPSTREAM_ROOT` (`calendar-sync-snapshot-jvm.mjs:11`) is set by nothing.
7. **Tombstones** to drop: "Codex's proposed host" and "3800a178e" (`google-account-panel.mjs:24,37`), "Issue #395" (`cloud-voice-view.mjs:47`), the out-of-date "StorageBrowserTest only" comment (`MimeTypeMap.java:2`).
8. **`calendar-draft-handoff.mjs:47-55` `reviewNote`** drives a note-to-event action whose menu controls "the owner removed". Either the product action is dead (A5) or the controls should come back.

## Owner questions

- `LEGACY_APP_UPDATE_TAG` (`app-stable`) is still read by `scripts/app-update-candidate.ts` and exercised by `app-update-candidate.mjs`. It keeps release version codes continuous across the package rename. Can it go? It concerns releases, not app data, so D1 does not cover it.
- Note-to-event and note-to-calendar (`toEvent` and `toCal`) have no menu entry, but the Quint calendar-handoff replay still drives them. Is the feature retired (delete the product action), or should the controls return?
- `OtaActivity` with `scripts/test-automatic-update-platform.ts`: delete them, or wire them into an emulator lane as evidence that an unattended update keeps Keystore keys and app data? This would be emulator evidence, not device acceptance.
- `PackageInstaller.java` models AOSP session behaviour from sources by line number, with no device check. Should it be reviewed and documented as a model alongside the Quint update models, given that the update harnesses' confidence rests on it?
