# Chunk test-22: test/browser (simulator-* … voice-entry-context)

27 files: 25 Playwright specs, 2 helpers. All files existed at review time. Reports are under
`files/test/browser/<name>.md`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| simulator-concurrency.spec.ts | chromium, module-in-page (dev writer) | DELETE | — |
| simulator-recovery.spec.ts | chromium, dev-surface UI + 2 module calls | MERGE | `journeys/dev-simulator.spec.ts` |
| simulator-save.spec.ts | chromium, dev-surface UI + 1 module call | MERGE test 1, DELETE test 2 | `journeys/dev-simulator.spec.ts` |
| source-reference-integrity.spec.ts | chromium, module-in-page (browser stand-in) | DELETE | — |
| speak-replies.spec.ts | chromium, UI + transport backdoor, tombstone checks | MERGE 1 case, DELETE rest | `journeys/voice.spec.ts` |
| standalone-shell.spec.ts | chromium, real UI (33 tests) | MERGE (split) | `journeys/home-shell.spec.ts` + `journeys/chat.spec.ts` |
| startup-access.spec.ts | chromium, component test on a 2nd Vite server with module substitution | REWRITE | `journeys/startup-permissions.spec.ts` (production lane) |
| startup-permissions-walkthrough.spec.ts | chromium, real UI with permission-API fakes | MERGE | `journeys/startup-permissions.spec.ts` |
| storage-usage.spec.ts | chromium + firefox/webkit, UI + plugin backdoor | MERGE | `journeys/files.spec.ts` (storage lane) |
| subview-accessibility.spec.ts | chromium, real UI | MERGE | `journeys/accessibility.spec.ts` |
| summary-source-note.spec.ts | chromium, UI + backdoors, legacy Notes | MERGE | `journeys/notes.spec.ts` |
| telephony-fixture.ts | helper (fake telephony bridge), 1 importer | MERGE | `harness/bridge.ts` |
| unified-automations.spec.ts | chromium, real UI + controller patch | MERGE | `journeys/workflows.spec.ts` |
| upstream-client-features.spec.ts | chromium, module-in-page (upstream + stand-in) | DELETE | — (upstream follow-up) |
| upstream-map-plane.spec.ts | chromium, UI + 1 module-in-page + 2nd Vite server | MERGE | `journeys/maps.spec.ts` |
| use-in-email.production.spec.ts | production, real UI, no injection | KEEP | basis of `journeys/inbox.spec.ts` |
| use-in-email.spec.ts | chromium, UI + shell capture/`agentSay` | MERGE unique cases, then DELETE | `journeys/inbox.spec.ts` (production) |
| user-selected-settings.production.spec.ts | production, real UI | MERGE | `journeys/settings.spec.ts` |
| video-edit.spec.ts | chromium, mostly module-in-page (browser encoder stand-in) | MERGE UI cases, DELETE rest | `journeys/camera-photos.spec.ts` |
| video-timestamp-boundaries.spec.ts | chromium, module-in-page | DELETE | — |
| view-focus.spec.ts | chromium, module on synthetic markup | REWRITE | `journeys/accessibility.spec.ts` |
| view-navigation-react.spec.ts | chromium, real chat over hosted pairing | MERGE | `journeys/chat.spec.ts` (resident harness) |
| view-navigation.spec.ts | chromium, module-in-page protocol client | DELETE (carry 2 cases) | `journeys/chat.spec.ts` |
| voice-assistant-fixture.ts | helper (production voice bridge), 4 importers | MERGE | `harness/voice.ts` |
| voice-assistant.production.spec.ts | production, real UI | KEEP | basis of `journeys/voice.spec.ts` |
| voice-composer-recovery.spec.ts | chromium, route-replaced product module + prototype patches | MERGE selected, DELETE rest | `journeys/voice.spec.ts` |
| voice-entry-context.spec.ts | chromium, UI + shell capture, legacy Notes | MERGE | `journeys/voice.spec.ts` |

Totals: DELETE 5 (simulator-concurrency, source-reference-integrity, upstream-client-features,
video-timestamp-boundaries, view-navigation); KEEP 2 (use-in-email.production,
voice-assistant.production); MERGE/REWRITE 20.

## Behaviours that lose coverage if the DELETEs happen as proposed

Each of these is checked only in this chunk. They need a replacement step, or an owner decision that the behaviour does not matter:

- **Browser encoder fallbacks for video editing** (codec support/constructor/start failure, unsupported timestamp
  encoder, delayed playback ack, cancellation releasing streams), plus **frame/tone-accurate trim**
  (`video-edit.spec.ts` cases 6-11, `video-timestamp-boundaries.spec.ts`). These only matter if browser video editing is a
  product surface. On Android, `camera-adapter.ts:289` uses `nativeLibrary.saveVideoEdit`.
- **Source reference rejects changed bytes** (`source-reference-integrity.spec.ts`) in the browser stand-in. The native
  plugin must be covered by Android instrumentation instead.
- **Workflow attachment receipt replay after delete** (`upstream-client-features.spec.ts` test 2).
- **Navigation protocol refusal matrix** (`view-navigation.spec.ts`): owner change, new epoch, cancel, shell-switch failure
  settling `switched:false`, noncanonical automations paths. The privacy refusals (record parameters, credential surface)
  are carried into the chat journey. The host navigation tests cover some of the rest.
- **Dev simulator writer internals** (`simulator-concurrency.spec.ts`): Web Locks unavailable, storage changed outside the lease.
- **view-focus internals**: same-frame resize race; old uninstaller. Intentionally dropped.
- The unique `use-in-email.spec.ts` cases (reply to your own message with no recipient, launcher full-height geometry,
  off-screen draft append) are lost **unless** they are carried into the production spec as proposed.
- The `voice-composer-recovery.spec.ts` honesty states (unconfirmed mic on error, failed or pending Stop, Connecting…) are lost
  unless they are re-driven through native failures in the production voice harness.

## Shared helpers worth keeping

- `voice-assistant-fixture.ts` becomes `harness/voice.ts`. Its `heard`-body validation and its throw on unknown
  `AlphaVoiceCloud` methods are good defaults.
- `telephony-fixture.ts` becomes `harness/bridge.ts` `telephony()`, with the in-page WAV builder moved to `harness/media.ts`.
- Helpers to extract from repeated code: `expectTabStaysOutOf(page,'[inert]')` (from subview-accessibility and
  standalone-shell), `expectHalfSheet(page)` (the formula is copied 7× in standalone-shell),
  `failStorageWrites/Removals(key)` (from the simulator specs), `forbidPermissionPrompts()` (from user-selected-settings),
  `browserPermissions({deny})` (from startup-permissions-walkthrough), and the `frames()` per-frame sampler
  (standalone-shell).

## Cross-file actions

- **Legacy Notes (A1/D1):** `summary-source-note`, `standalone-shell` (Notes fade case) and `voice-entry-context` use
  `helpers/legacy-notes.ts` (`openLegacyNotes`, "Previous notes"). Move them to the current Notes source, then delete
  the helper.
- **Wallet (D2):** `simulator-recovery.spec.ts:13-14` and `simulator-save.spec.ts:14` seed or expect `wallet`. Edit them
  in the same change that removes Wallet from `browser/apps.ts`. `view-navigation.spec.ts` uses `wallet` as an
  unknown view id.
- **Old-bridge compatibility (A1):** the `summary-source-note` "older document bridges" case protects the optional
  `sourceReferenceVersion` branch in `prototype/note-source-adapter.ts:99`. Delete them together.
- **Legacy untyped recordings (A1):** the `video-edit` last case protects octet-stream acceptance in `browser/video-edit.ts`.
- **Hosted pairing (D5):** after `view-navigation-react` moves to the resident harness, check whether anything still
  drives `connectionController.pair('remote', …)` (rg found 3 specs). If nothing does, the `hosted.pair` test-mocks path
  can go.
- **Storage lane:** update `scripts/storage-specs.ts:18` (it lists `storage-usage.spec.ts`) when that spec moves.
- **Second Vite servers:** `startup-access.spec.ts` and `upstream-map-plane.spec.ts` each start their own Vite server
  (cold transform per worker). The rewrite removes the first. The second needs a runtime switch for the Maps base URL.
- **Env knob nothing sets:** `REQUIRED_NO_SCREENSHOTS` (only in `startup-permissions-walkthrough.spec.ts`).
- **D13:** `standalone-shell.spec.ts:3` imports `.eliza/client-features/.../gestures/constants`.
- **Upstream follow-up (D14):** the isolation test of the upstream Files package (`upstream-client-features` test 1).

## Owner questions

1. Is browser video editing (`browser/video-edit.ts` via `prototype/browser-camera.ts`) a supported product surface, or
   only a development stand-in? This decides whether any encoder fallback or trim-accuracy test survives.
2. D19: does the Phone/Messages/Contacts/Inbox/Workflows development simulator, with its "Saved app recovery" dialog,
   stay? If it does not, `journeys/dev-simulator.spec.ts` is not needed and both simulator specs are deleted.
3. Are the AOSP telephony views (`aosp-telephony-views.spec.ts` + `telephony-fixture.ts`) in the MVP image, given that
   Phone/Messages/Contacts are "deferred" in `browser/apps.ts`?
4. Once view navigation is covered on the resident path, can the hosted-pairing test harness in `connection-ui.tsx` be deleted?
5. Should the browser (four-permission) startup walkthrough keep its own journey, or is the native seven-step checklist
   on the production lane enough?
