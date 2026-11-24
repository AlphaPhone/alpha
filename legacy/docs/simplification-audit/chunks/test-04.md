# Chunk test-04: host tests `test/browser-*` (command-refusals .. web-features)

28 assigned files, 27 present (`browser-tab-host-identity.test.mjs` is already deleted). Per-file reports are in
`files/test/<name>.md`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| browser-command-refusals | transplant (adapter slices) | DELETE | cases to `journeys/browser.spec.ts`; duplicate of navigation-creation:34-44 |
| browser-construction | transplant of upstream Java + host JVM | DELETE | instrumented cookie-policy test + upstream host tests |
| browser-deletion-recovery | unit (esbuild import) | DELETE | Quint orphan harness + calendar delete journeys |
| browser-errors | unit | DELETE | `browser-profile-unsupported.production.spec.ts` |
| browser-external-handoff-refinement | Quint wrapper + duplicate scenarios | DELETE | aggregate `quint-application-refinement` already runs it; fixture survives |
| browser-host-modal | transplant (markers) + source-text | DELETE | also remove `// host-modal:begin/end` markers (D7) |
| browser-host-source-closure | tooling (hash self-checks) | DELETE | Android build's duplicate-class check is the evidence |
| browser-journal-retention | integration (real stores, in-memory port) | MERGE | `test/integration/calendar-reminders.test.mjs`, 8 cases, smaller loops |
| browser-local-transcription | unit | DELETE | duplicate of `browser-speech.spec.ts`; 1 case to `journeys/voice.spec.ts` |
| browser-navigation-creation | transplant (4 slices) | DELETE / REWRITE | `journeys/browser.spec.ts`, 5 cases |
| browser-note-pending-audio | transplant (whole voice.ts) | DELETE / REWRITE | `journeys/notes.spec.ts`, 4 cases |
| browser-notification-clear | transplant (whole notifications.ts) | DELETE / REWRITE | `journeys/notifications.spec.ts`, 4 cases |
| browser-popup-opener | transplant | DELETE | `journeys/browser.spec.ts`; Quint tab-lifecycle replays the same code |
| browser-presentation-lifecycle | transplant | DELETE | `journeys/browser.spec.ts`; Quint surface-presentation replays the same region |
| browser-proof-export | tooling (spawns `scripts/ci/export-browser-proof.ts`) | KEEP, SIMPLIFY | move to `test/tooling/ci-proof-export.test.mjs`; research "A" label was wrong |
| browser-provider-transport | unit (forced DEV env) | MERGE | `browser-cloud-dev-bridge.test.mjs` (connection-cloud integration), 2 cases |
| browser-reading-capability | source-text + transplant | DELETE | instrumented reading tests; 1 case to `journeys/browser.spec.ts` |
| browser-receipt-order | transplant (6 slices incl. connection-ui) | DELETE / REWRITE | `journeys/browser.spec.ts` + 1 case in `journeys/chat.spec.ts` |
| browser-request-refusal | integration-ish (real DeviceActions) | MERGE | `test/integration/device-actions.test.mjs` with `direct-browser-grounding` |
| browser-reviewed-link-provenance | transplant | DELETE | 1 case to `journeys/notes.spec.ts`; Quint `note-web-source-dialog` |
| browser-saved-transcript-audio | transplant (private-member slice) | DELETE / REWRITE | `journeys/notes.spec.ts`, 2 cases |
| browser-session-persistence | transplant + unit + source-text | DELETE / REWRITE | `journeys/browser.spec.ts`, 4 cases; `createSessionSaver` tests go with D20 |
| browser-site-permissions | upstream test re-run + source-text | DELETE | upstream CI + instrumented tests |
| browser-startup-permissions | unit | DELETE / REWRITE | `journeys/startup-permissions.spec.ts`, 3 cases |
| browser-streamed-speech | transplant (whole voice.ts) | DELETE / REWRITE | `journeys/voice.spec.ts`, real MSE + `page.route` |
| browser-tab-host-identity | (missing) | already deleted | none |
| browser-voice-cancellation | transplant (whole voice.ts, 24 positional deps) | DELETE / REWRITE | `journeys/voice.spec.ts`, 3 cases |
| browser-web-features | source-text (63 regexes) | DELETE | instrumented browser tests; loopback rule to the APK audit |

Totals: DELETE 23 (12 of them with cases carried to a journey), MERGE 3, KEEP 1 (simplify), already gone 1.

## Coverage at risk if the DELETEs land before the replacements

These behaviours have no other host, Playwright or instrumented coverage today. A journey or integration case is
needed before or with the delete:
- Browser tabs: close/switch while a native tab is still being created, tab limit closing the half-created tab,
  popup return-to-opener and popup cap (native-only paths; covered formally by `browser-tab-lifecycle.mjs`, which
  itself slices text).
- Browser session persistence: Clear browsing data against a slow launch read or an in-flight save; save failure
  notice and retry (formally covered by the session-persistence replay, which slices the same text).
- Agent-opened page: receipt-before-presentation ordering, "Not synced yet" on receipt failure, presentation
  waiting for the carrying chat request (two live regressions, 2026-10-30 and `tj-79465dcbc873b2`).
- Notes voice recording recovery after reload: claimed/ambiguous canonical create never creates a second note or
  discards bytes; segment text survives reload.
- Saved-note audio re-transcription windows and refusal after deletion.
- Notification Clear all: lock between check and write dismisses nothing; per-row outcomes in a mixed batch.
- Speech cancellation races: readiness check not cancelling in-flight speech; hide/pagehide cancelling both STT and
  TTS; streamed Cloud clip download cancelled on Stop.
- Startup permissions in the web build: denied never re-prompts; late notification rejection after the deadline.
- Native page withdrawal under overlays/modals on Android: only device runs prove this
  (`BrowserDialogLifecycleInstrumentedTest`); the host tests only prove the slice against fakes.
- WebView construction rules (no WebAuthn converter, profile isolation, file/content access off): device-only;
  instrumented cookie-policy test covers part, the WebAuthn-converter guard has no device test.

## Shared helpers and fixtures

- `test/fixtures/browser-daily-stores.mjs`: keep (real Calendar/Reminder/Clock modules over an in-memory Documents
  port; 4 other tests and 3 Quint harnesses import it). Basis for the calendar-reminders integration file.
- `test/fixtures/device-action-policy.mjs`: keep (5 other importers); it loads `runtime/device-actions.ts` through
  `browser-source.mjs`, so it is a candidate to become the device-actions integration harness.
- `test/fixtures/browser-external-handoff.mjs`: keep while the Quint harness imports it; PORT its `sourceContext`
  load of `prototype/browser-external-handoff.ts` to a plain import.
- `test/fixtures/jvm-tools.mjs`: survives (146 importers), loses three importers here.
- `test/support/strip-types.mjs`: loses 9 importers here; survives elsewhere (220 references).
- Journey harness needs (for `journeys/browser.spec.ts`): one typed Capacitor `Browser` bridge fake that records
  `navigate`/`command`/`present`/`close`, can hold `navigate` and tab creation, emits `tabOpened`/`stateChanged`,
  and fakes `browsingState`/`saveBrowsingState`/`clearBrowsingData`/`readingSupport`. Voice/notes journeys need the
  dev local agent fixture with holdable `speechRequest`.

## Cross-file actions

1. Delete the `// host-modal:begin|end` markers in `apps/app/src/prototype/browser-adapter.ts` with
   `browser-host-modal.test.mjs` (D7).
2. D20: delete `createSessionSaver` and `saveRetryDelay` from `apps/app/src/browser/browser-poll.ts` (no
   production importer), with the `browser-session-persistence` saver tests, the `createSessionSaver` entry in the
   `browser-tab-lifecycle.mjs` harness context and the manifest text at `specs/quint/application/manifest.json:5203`.
   Keep `surfacePollIdle`/`surfaceIdleForView`/`retryDelayForCount` if Lemma still proves them and production uses
   them (`surfacePollIdle` is used at `browser-adapter.ts:636`; check `retryDelayForCount` is reachable, otherwise it
   goes with the saver and its Lemma entry).
3. Formal PORT list from this chunk: `browser-surface-presentation.mjs` (slices `nativeUnderlay..openBrowserView`
   and `hide..ensure`), `browser-tab-lifecycle.mjs` and `browser-session-persistence.mjs` (slice
   `forgetTabs..clearSiteData`), `note-web-source-dialog.mjs`, `browser-external-handoff` fixture. Each needs the
   region extracted from `browser-adapter.ts` into an exported module (stage F split) before the harness can import.
4. `scripts/ci/export-browser-proof.ts`: remove the unused `totalBytes`/`readBytes` receipt fields (no reader in
   `scripts/` or `.github/`) with the byte-total test case.
5. Production audit: add "no loopback downloads in production APK" (`ELIZA_DEV_ALLOW_TEST_MOCKS=false`) to the APK
   audit if the owner wants that rule kept after `browser-web-features` goes.
6. Upstream follow-ups (D14): address-input classification cases, WebView tab construction rules, site-permission
   record test and download/cookie rules belong to upstream `plugin-native-browser-surface` tests.

## Owner questions

- `apps/app/src/browser/voice.ts:51-57` keeps a branch for "Older pending rows contain no completion markers". It
  also handles a crash between the audio write and the segment-journal write. Keep it as crash recovery only, or
  delete it as a legacy reader (D1)?
- Is a device test wanted for "first-run access panel over a loaded page hides the native page" (the API 36
  regression `browser-host-modal` was written for)? No host test can show it.
- Is a WebAuthn-converter guard on device wanted (`browser-construction` was the only check)?
