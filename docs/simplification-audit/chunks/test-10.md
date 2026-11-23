# Chunk test-10: `test/browser/dev-*` specs, part 1 (35 files)

All 35 files are Playwright specs. The `chromium` project runs them against the dev build (`?mode=dev`, often `tools=1`).
None is in `scripts/storage-specs.ts`, so none runs on Firefox or WebKit. Per-file reports are in `files/test/browser/<name>.md`.

## Files

| File | Kind | Verdict | Target / cases carried |
|---|---|---|---|
| dev-calendar-series.spec.ts | UI + module-in-page (14 imports), 11 s real sleep | MERGE | `journeys/calendar.spec.ts`: two repeating-event cases (one occurrence; whole series with explicit scope) |
| dev-camera-focus.spec.ts | 2 UI + 5 unit tests of `BrowserCameraFocus` | MERGE | `journeys/camera-photos.spec.ts`: tap/keyboard focus clears on switch and Home |
| dev-camera-light.spec.ts | UI | MERGE | `journeys/camera-photos.spec.ts`: screen light, unfiltered photo, retires on switch/Home/ended |
| dev-clock.spec.ts | UI + 30 imports, audio fakes, sleeps | MERGE | `journeys/reminders.spec.ts`: set/list/delete; ring-snooze-dismiss (+ recurring); mock mode makes no handoff |
| dev-cloud-identity.spec.ts | personal-Cloud fixture | DELETE | (C4 / D5) |
| dev-cloud-scenarios.spec.ts | Dedicated provisioning fixture | DELETE | (C4 / D5) |
| dev-cloud-setup.spec.ts | Dedicated provisioning fixture | DELETE | (C4 / D5) |
| dev-connected-voice.spec.ts | controller override (paired voice) | DELETE | (C4) |
| dev-connection-actions.spec.ts | UI review cards + IDB/prototype/locks surgery, about 24 tests | REWRITE | `journeys/chat.spec.ts` "agent action approval": approve once + receipt; decline → unavailable; changed file not moved; two tabs execute once |
| dev-connection-pagehide.spec.ts | synthetic events + Storage patch | DELETE | — |
| dev-connection-setup.spec.ts | UI, local/cloud/remote profiles | MERGE | `journeys/dev-surface.spec.ts`: local profile chat + restore history |
| dev-contacts.spec.ts | UI on simulator store | MERGE | `journeys/telephony.spec.ts`: contact CRUD/favourite/Undo/reload |
| dev-content-question.spec.ts | 1 UI + 1 unit | MERGE | `journeys/files.spec.ts`: ask about a file, compose, send |
| dev-controls-accessibility.spec.ts | 8-way layout matrix of the dev toolbar | MERGE | `journeys/dev-surface.spec.ts`: one viewport; profile switch; absent in mock mode |
| dev-digest-delegation.spec.ts | simulator + prototype surgery | DELETE | (Q-HOST-5; if kept, one journey in workflows) |
| dev-digest-live.spec.ts | simulator + 2 unit tests; legacy envelope | DELETE | (Q-HOST-5) |
| dev-digest-schedule.spec.ts | 2 UI (duplicates of journey D) + 9 simulator-policy tests | MERGE | `journeys/workflows.spec.ts`: time-zone mismatch notice only |
| dev-digest-storage.spec.ts | module-in-page unit | DELETE | — |
| dev-display.spec.ts | 1 product UI + stand-in tests | MERGE | `journeys/settings.spec.ts`: Display text size persists, scales once |
| dev-file-picker.spec.ts | module-in-page unit | DELETE | — |
| dev-files.spec.ts | half UI, half unit | MERGE | `journeys/files.spec.ts`: new folder; PDF pages + Ask; sandboxed HTML; source link + 5 MiB limit; rename after reload |
| dev-hosted-journey.spec.ts | UI against `hosted-harness.ts` | MERGE | `journeys/notifications.spec.ts`: tap notice → retained output, switches persist, checks paused; notifications off |
| dev-hosted-results.spec.ts | module-in-page (duplicate of Quint refinement) | MERGE | `journeys/notifications.spec.ts`: shade hides result text, Clear all (1 step) |
| dev-image-question.spec.ts | UI + 1 unit | MERGE | `journeys/camera-photos.spec.ts`: ask about the camera frame; ask about a saved photo |
| dev-inbox-triage.spec.ts | UI on simulator mailbox | MERGE | `journeys/inbox.spec.ts`: triage; reply/forward; drafts |
| dev-inbox.spec.ts | UI on simulator mailbox | MERGE | `journeys/inbox.spec.ts`: compose-attach-save-restore-send-open; drafts |
| dev-incoming-attachments.spec.ts | simulator editor + CDP tracing; Wallet step | MERGE | `journeys/workflows.spec.ts`: email trigger saves exact attachment to Files; inbox step opens it |
| dev-incoming-call.spec.ts | UI on Phone simulator | MERGE | `journeys/telephony.spec.ts`: accept/end; decline → voicemail → Undo |
| dev-location.spec.ts | 2 UI + about 25 unit tests with fake geolocation | MERGE | `journeys/maps.spec.ts` Recenter; `journeys/workflows.spec.ts` away-from-Home condition |
| dev-maps-share.spec.ts | UI | MERGE | `journeys/maps.spec.ts`: share a place |
| dev-maps-voice.spec.ts | UI + in-page provider config | MERGE | `journeys/maps.spec.ts`: spoken guidance; guidance outside Maps |
| dev-message-attachments.spec.ts | UI on Messages simulator | MERGE | `journeys/telephony.spec.ts`: attachment round-trip; PDF intact |
| dev-messages-lifecycle.spec.ts | UI + `setTimeout`/`Date.now` override | MERGE | `journeys/telephony.spec.ts`: search after reload; swipe delete + Undo |
| dev-network.spec.ts | simulator tiles | DELETE | — |
| dev-notification-queue.spec.ts | module-in-page + simulator editor | DELETE | (covered by `dev-notifications.spec.ts`) |

Totals: 11 DELETE, 23 MERGE, 1 REWRITE, 0 KEEP. About 230 test executions shrink to about 45 journey steps or cases.

## Behaviour that loses all coverage if the DELETEs and dropped cases go

Most of these behaviours belong to browser stand-ins or simulators that the APK replaces. They are listed so the owner can decide.

- Calendar (browser stand-in): series delete detects a concurrent occurrence edit; moving a series keeps deleted and edited occurrences excluded; overlapping multi-day occurrence resolution.
- Camera focus mapping through mirrored 2x zoom (`camera-focus.ts`). The Quint model covers write serialisation, not the coordinate maths.
- Clock (browser stand-in): alarm and notification-tone volume, DND muting, and single-tab ownership of a due alarm.
- Development action executor: a journal write failure never dispatches; recovery after a failed terminal write does not repeat the effect; a lost reminder-creation response is recovered without a duplicate. The AP-04 product equivalent should get a resident-agent test.
- Digest scheduler policy (DST, clock jumps, the 30-minute window, expiry/revocation, two tabs) on the browser simulator. The agent's own policy lives upstream, and `test/digest-occurrence-delivery.test.mjs` and Quint cover parts of it.
- Digest live-source privacy (no body or attachment text in the stored result). This is lost only if Q-HOST-5 keeps live sources.
- Files: two concurrent renames have one winner; no partial folder after a duplicate-path import; mail attachment sha256 mismatch is refused; the content excerpt is capped at 12,000 characters.
- Cancelling OCR terminates its worker.
- `BrowserLocation` permission-request ownership, covering cancel, storage events, other tabs and timed-out fixes (about 16 tests, browser stand-in for `ElizaLocation`).
- `AlphaNotifications` stand-in: replacement keys scoped per source app; a stale removal cannot erase a replacement.
- Rollback on failed writes for display, network, contacts, phone, messages and inbox. This is simulator persistence only.

## Shared helpers worth keeping or creating

- `harness/camera.ts`: the canvas `getUserMedia` fake. It is duplicated in `dev-camera-focus:3-13`, `dev-camera-light:3-13` and twice in `dev-image-question`.
- Harness auto-fixtures for the offline selection seed (about 25 of the 35 files), the external-request fence (`dev-inbox`, `dev-connection-setup`, `dev-incoming-call`, `dev-incoming-attachments`, `dev-message-attachments`) and `pageerror` failure.
- `harness/storage.ts` `holdDocument(page, key)`: the `navigator.locks` barrier. Five files copy it. Only the two-tab "execute once" case needs it after the cleanup.
- `harness/seed.ts` for simulator mailbox, workflows and telephony state (replaces the inline JSON seeds), plus `harness/nav.ts` `swipeRow`.
- `hosted-harness.ts` stays. `journey-f-hosted-result.spec.ts` also imports it.
- `helpers/legacy-notes.ts` and the retained-source part of `helpers/browser-calendar.ts` lose two more importers here (`dev-connection-actions`, `dev-connection-setup`, `dev-calendar-series`). Both are A1 legacy paths.

## Cross-file actions

- Remove the duplicate Ask-mode test from `camera-controls.spec.ts` when `dev-image-question` merges.
- `dev-incoming-attachments` breaks when Wallet (D2) is deleted. Drop its Wallet step in the same change.
- `dev-digest-schedule`'s two UI tests duplicate `journey-d-digests.spec.ts`. Keep journey D.
- Delete `dev-cloud-*` and `dev-connected-voice` together with C4 (`development-cloud*.ts`, `getPairedVoiceBinding`). Remove the `cloud`/`remote` arms from `dev-connection-setup` at the same time.
- `dev-maps-voice.spec.ts:15` contains an unreachable `kind==='home'` branch.
- Screenshots written to fixed paths (`dev-files:12`, `dev-incoming-attachments:12,24`) and the CDP navigation tracing (`dev-incoming-attachments:5-10`) are leftover debugging and can go.

## Owner questions

1. Q-DEV-1: which development simulator surfaces stay? This covers Phone, Messages, Contacts, the local mailbox, Incoming email, location, network tiles, the development action queue and the development digest scheduler. The verdicts here assume that only their user-visible journeys survive.
2. Q-HOST-5 / Q-HOST-1: are hosted digests, "Cloud reads" delegation and hosted-result notices in PRD scope? The answer decides between DELETE and MERGE for `dev-digest-delegation`, `dev-digest-live`, `dev-hosted-journey` and `dev-hosted-results`.
3. Is the browser Clock alarms dialog a product surface or a stand-in for the native Clock? This decides whether `journeys/reminders.spec.ts` keeps its three Clock cases.
4. Should the AOSP-only Phone, Messages and Contacts views get a dev-build journey (`journeys/telephony.spec.ts`)? The alternative is to rely on `aosp-*.spec.ts` plus Android instrumentation.
5. Should the camera focus mirrored-zoom mapping maths keep a test, given that unit tests are not wanted?
