# Chunk test-06: Playwright specs `agent-clock-handoff` … `browser-reminder-edit-recovery`

35 files under `test/browser/` (34 specs, 1 helper), about 3,050 lines. Every file still exists at review time; every
`/src/...` module they import also still exists. Per-file reports are in `files/test/browser/<name>.md`.

## Files

| File | Kind | Verdict | Target |
|---|---|---|---|
| agent-clock-handoff.spec.ts | chromium dev; inline bridge + pairing UI + backdoors; 20 tests | REWRITE | `journeys/reminders.spec.ts` (Clock handoff, production harness; 7 cases) |
| agent-conversation-migration.spec.ts | chromium; module-in-page on the dev agent simulator; legacy + personal Cloud | DELETE | — |
| album-storage-migration.spec.ts | chromium+ff/webkit; mostly module-in-page; legacy key | MERGE | `journeys/camera-photos.spec.ts` (album rename/reload step) |
| all-view-context.production.spec.ts | production journey | MERGE | `journeys/chat.spec.ts` (context); capability test → `journeys/reminders.spec.ts` |
| aosp-contacts.spec.ts | chromium UI, inline bridge | MERGE | `journeys/telephony.spec.ts` |
| aosp-phone.spec.ts | chromium UI, inline bridge | MERGE | `journeys/telephony.spec.ts` |
| aosp-telephony-views.spec.ts | chromium UI on `telephony-fixture.ts` | KEEP (becomes the base) | `journeys/telephony.spec.ts` |
| app-navigation.ts | helper, 97 importers | KEEP → MOVE | `harness/nav.ts` `goHome()` |
| appearance-storage.spec.ts | chromium+ff/webkit UI + storage probes | MERGE | `journeys/settings.spec.ts` (appearance) |
| assistant-draft-recovery.spec.ts | chromium UI + store probes/patches | MERGE | `journeys/chat.spec.ts` (draft continuity) |
| assistant-draft-review.spec.ts | chromium UI | MERGE | `journeys/chat.spec.ts` |
| assistant-draft-storage.spec.ts | chromium+ff/webkit; module-in-page; native recovery backup (D3) | DELETE | — |
| assistant-surface-close.spec.ts | chromium; React-fiber shell patching | REWRITE | `journeys/home-shell.spec.ts` |
| attachment-accessibility.spec.ts | chromium; seeded via imports | MERGE | `journeys/inbox.spec.ts` |
| attachment-lifecycle.spec.ts | chromium; module-in-page | DELETE | — |
| billing-recovery.production.spec.ts | production journey | MERGE | `journeys/connection-cloud.spec.ts` (subscription) |
| browser-agent-playback.local.spec.ts | live lane, opt-in | KEEP | live lane |
| browser-agent-tts.spec.ts | chromium, local-agent profile only; module-in-page | DELETE | — |
| browser-audio.spec.ts | chromium; browser voice/note-audio stand-in, module-in-page | DELETE | — |
| browser-camera.spec.ts | chromium UI (synthetic camera) | MERGE | `journeys/camera-photos.spec.ts` |
| browser-chat-overlay.spec.ts | chromium UI geometry | MERGE | `journeys/browser.spec.ts` |
| browser-cloud-bootstrap.spec.ts | chromium; dev cloud bridge, module-in-page | DELETE | (optional step in `journeys/connection-cloud.spec.ts`) |
| browser-cloud-dev.spec.ts | chromium; spawns own Vite servers; dev bridges | DELETE | (owner: Node integration test of dev bridges) |
| browser-copy-link.spec.ts | chromium UI | MERGE | `journeys/browser.spec.ts` |
| browser-credential-cas.spec.ts | chromium; module-in-page | DELETE | — |
| browser-external-handoff.production.spec.ts | production journey | MERGE | `journeys/browser.spec.ts` (production) |
| browser-external-handoff.spec.ts | chromium; factory harness via `/@fs` | MERGE (3 cases) | `journeys/browser.spec.ts` (production) |
| browser-foreground.spec.ts | chromium; Device-controls simulator | DELETE | — |
| browser-host-disclosure.spec.ts | chromium, local-agent profile only | DELETE | — |
| browser-list-focus.spec.ts | chromium UI + fiber reads + Quint trace | MERGE | `journeys/browser.spec.ts`; Quint trace leaves e2e |
| browser-navigation.spec.ts | chromium; 6 plugin-level + 3 UI | MERGE (UI) / DELETE (rest) | `journeys/browser.spec.ts` |
| browser-paste-fallback.production.spec.ts | production journey | MERGE | `journeys/browser.spec.ts` (reading) |
| browser-photo-edit.spec.ts | chromium+ff/webkit; 5 UI + 7 library-level | MERGE (UI) / DELETE (rest) | `journeys/camera-photos.spec.ts` |
| browser-profile-unsupported.production.spec.ts | production journey | MERGE | `journeys/browser.spec.ts` (failures) |
| browser-reminder-edit-recovery.spec.ts | chromium+ff/webkit; UI + 6 `BrowserDaily.prototype` patches | REWRITE | `journeys/reminders.spec.ts` (4-5 cases) |

Counts: KEEP 3 (aosp-telephony-views as base, app-navigation as helper, browser-agent-playback live), DELETE 10,
MERGE/REWRITE 22.

Corrections to `research/tests-browser.md`: `browser-cloud-dev` is not a Browser-app journey (it tests the browser
dev host's Cloud bridge and two extra Vite servers), so it is a DELETE, not a merge into `browser.journey`;
`agent-conversation-migration` also exercises the personal-Cloud simulator (D19) besides the legacy reader;
`assistant-draft-storage` contains the test-mocks native recovery backup that D3 deletes.

## Behaviours that lose all browser coverage if the DELETEs happen

Be honest about these; each needs a replacement or an owner "accept":

1. **Assistant-draft store compare-and-swap between two windows** (`assistant-draft-storage` test 2) and the native draft
   recovery CAS contract shape (tests `native draft recovery bridge contract`). Partly kept by the "competing tab" step
   in the chat journey, only if multi-window stays a product case.
2. **Browser secret store CAS without Web Locks and the browser transport's automation-write allow-list**
   (`browser-credential-cas`). Dev-host only, but the allow-list is a security rule; a Node integration test of
   `createBrowserConnection` would replace it.
3. **Local-agent TTS failures never fall back to browser speech** (`browser-agent-tts`). Replace with one step in
   `journeys/voice.spec.ts` on the resident harness if the rule matters for the product.
4. **Photo edit lost-reply / no-duplicate-copy recovery and rollback** (`browser-photo-edit` tests 2-5, 7-8). These test the
   browser photo library's receipts; the APK uses native Photos. Accept or cover in Android instrumentation.
5. **Reminder edit durable-intent ordering** (no dispatch before durable store, completion ownership, receipt boundary;
   `browser-reminder-edit-recovery`). Four cases are carried; the hash/lock-pausing ones are lost.
6. **Web Browser stand-in fences** (stale frame load, sandboxed inner navigation, file-input isolation;
   `browser-navigation`). The native WebView path is Android code; cover there if wanted.
7. **Credential changed during restore → "Account changed"** (`browser-cloud-bootstrap` test 4): product logic in
   `connection-ui.tsx`; optional step in the connection-cloud journey.
8. **Dev bridge credential profile, revoke-on-sign-out and resident Cloud speech route** (`browser-cloud-dev`):
   tooling; Node integration test only if the bridges stay.
9. **Lock-screen hiding of workflow notices** (`browser-foreground`): only covered via the dev simulator.
10. Object-URL revocation of attachment previews (`attachment-lifecycle`): no user-visible effect; accepted loss.

## Shared helpers worth keeping

- `app-navigation.ts` (`returnToApps`) → `harness/nav.ts` `goHome()`; 97 importers.
- `telephony-fixture.ts`: becomes `harness/plugins/telephony.ts`; add an `{image:false}` standalone shape (absorbs the
  two inline bridges in `aosp-contacts`/`aosp-phone`) and a hold-contacts-list switch.
- `flag-off-android.ts` + `resident-stub.ts`: target harness for the rewritten Clock handoff, draft and reminder cases.
- New: `harness/plugins/browser.ts` replacing four in-file `AlphaBrowser` stubs (`browser-external-handoff.production`,
  `browser-paste-fallback.production`, `browser-profile-unsupported.production`, and the dev twin) with options for
  commit-on-navigate, `reviewQuestion` answers, `create` failure and `openExternalBrowser` rejection.
- New: one camera fixture option (stream / deny / hold) replacing three getUserMedia stand-ins in `browser-camera`.
- `helpers/settled.ts` / geometry-stability poll (already in `browser-chat-overlay:34`) to replace fixed sleeps.

## Cross-file actions

- `scripts/storage-specs.ts`: remove `assistant-draft-storage`, `album-storage-migration`, `appearance-storage`,
  `browser-photo-edit`, `browser-reminder-edit-recovery` (5 of its entries come from this chunk).
- `.github/workflows/browser.yml:178-183`: the local-agent profile step runs `browser-agent-tts`,
  `browser-host-disclosure` and `host-reminder-recovery`; with the first two deleted, only `host-reminder-recovery`
  (other chunk) keeps that second dev-server step alive.
- `specs/quint/refinement/check-traces.mjs` loses its `browser-list-focus` caller; the BrowserSession focus trace
  should be produced in the formal lane (`application/browser-tab-lifecycle.mjs`) if it is wanted.
- `apps/app/src/runtime/native-recovery-backup.ts` (D3) loses its only test; `browser/domain-recovery.ts:24` is its
  other importer and the "Download old copy" button there (A1) loses its last browser test
  (`agent-conversation-migration`, `album-storage-migration`).
- `browser/device-controls.tsx:40` "Photo album recovery" and the dev agent-history recovery lose their only specs.
- `test/browser/helpers/connection-diagnostics.ts` loses two importers here (`agent-clock-handoff`,
  `agent-conversation-migration`).
- `ALPHA_BILLING_SHOTS` and `ALPHA_REAL_LOCAL_TTS`: no setter in the repo; drop the first, keep or drop the second
  with the live lane.

## Owner questions

1. Is a second renderer window (two tabs / assistant surface as a separate WebView) a product case? Five appearance
   tests, the draft conflict case, the album cross-tab refresh and the bookmark two-tab merge depend on it.
2. Do the Vite dev bridges (`scripts/browser-cloud-dev-bridge.ts`, `scripts/local-agent-dev-bridge.ts`) stay, and if so
   should they get a Node integration test in place of `browser-cloud-dev.spec.ts`?
3. Should the BrowserSession tab-focus Quint trace be kept in the formal lane, or dropped with the e2e harness call?
4. Do the AOSP telephony renderer paths (Phone, Messages, Contacts) stay in this repo's browser lane (decides whether
   `journeys/telephony.spec.ts` exists)?
5. Is the browser transport's automation-write allow-list (`createBrowserConnection`) a security rule that needs a
   replacement integration test, or dev-host-only plumbing?
