# Chunk specs-05: application Quint models FirstSendDraftMigration … NativeViewSubscription

33 files, all listed in `specs/quint/application/manifest.json`, so all are live and checked by `scripts/check-quint.ts`.
Every modelled source file still exists. None of the models covers only a feature that DECISIONS deletes. The Hosted*
models cover the live hosted background/digest inbox, not the D5 paired or hosted-agent code. GoogleCalendarLinkFlow
covers the agent-side sync that D4 keeps. The work in this chunk is in the **harnesses**: models stay passing, text
slicing becomes imports, and duplicate runners go.

| File | Kind | Verdict | Harness tie today | Target / action |
|---|---|---|---|---|
| FirstSendDraftMigration | model | KEEP; PORT | fixture slices `agent-adapter.ts` (`function settleFirstSendSlot(`) | export `settleFirstSendSlot` from a runtime module |
| FixtureBusyLatch | model (dev fixture views) | KEEP; PORT | test slices `model.js` `latchPatch`; manifest pins literal call text | export `latchPatch` from `shell-helpers.js`; file pins |
| GoogleAccessPublication | model | KEEP; PORT (minor) | real esbuild bundle + `new Function`; imports `deferred` from `specs/quint/legacy` | `support.mjs` `deferred` + `sourceModule` |
| GoogleCalendarAccessChoice | model | KEEP; PORT | `test/fixtures/google-account-panel.mjs` transplant of `google-connection-ui.tsx` | shared real-bundle panel fixture |
| GoogleCalendarDisconnect | model | KEEP; PORT | comment-marker injection in `google-accounts.ts` | injectable cleanup observer port |
| GoogleCalendarLinkFlow | model | KEEP; PORT | several code-string insertions in `google-accounts.ts` | ports as parameters of `linkGoogleCalendar` |
| GoogleCalendarLinkPublication | model | KEEP; PORT (marker) | real bundle + virtual ports + ` function accountRead(){` marker, Chromium | becomes the shared panel fixture; **remove from C3 delete list** |
| GoogleConsentAdmission | model | KEEP; PORT | `google-account-panel.mjs` transplant | shared panel fixture |
| HomeFailureNotice | model | KEEP; PORT | marker `  const shell = createMobileShellLauncher({` | exported notice decision in `home-shell.ts` |
| HomeGesture | model | KEEP; PORT | marker `  let swallow = '';` + `focusTile` rewrite | exported gesture controller |
| HomeSurface | model | KEEP | **imports `home-cards.ts`** | none (file pins) |
| HostedBackgroundAdmission | model | KEEP; PORT | `sourceContext` whole-file transplant | `sourceModule` |
| HostedDigestMutation | model | KEEP; EDIT with B297 | Chromium mount (via refresh harness), `legacy` seeds | drop `"legacy"` journal phase and its 4 harness cases with the D1 code change |
| HostedDigestRefresh | model | KEEP; PORT | marker `\tconst mounted = useRef(true);`, Chromium | observe via ports/DOM; module map follows dev/ split |
| HostedNoticeQuestion | model | KEEP | **real esbuild import** | none |
| InertHold | model | KEEP; PORT | test strips `modal-inert.ts` to reach private `owners` | import; observe `phone.inert` |
| InlineModalFocus | model | KEEP | **real esbuild import** | file pins |
| KeyboardDetectors | model | KEEP; absorbs KeyboardFocus; PORT | test slices `chat-overlay-motion-adapter.ts` | export dock keyboard watch |
| KeyboardFocus | model | MERGE into `KeyboardDetectors.qnt` | tab-indented slices of the same adapter | move native-visibility actions + 6 runs |
| KeyboardGeometry | model | KEEP | **imports `canvas-geometry.ts`** | none |
| LauncherFavorites | model of upstream code | KEEP here; upstream follow-up | marker in generated `.eliza` `mobile-launcher.ts` | move upstream (D14) |
| LauncherObserver | model of upstream code | KEEP here; upstream follow-up | marker in generated `launcher.ts` | move upstream |
| LauncherOwnership | model of upstream code | KEEP here; upstream follow-up | marker in generated `launcher.ts` | move upstream |
| ListFocus | model | KEEP; PORT | whole-file strip + vm | `sourceModule` |
| MapPlaneOwnership | model | KEEP; PORT | strips `maps-adapter.ts` into vm | exported plane controller in `maps/map-plane.ts` |
| MapsEventReturn | model | KEEP; PORT | marker in `maps-adapter.ts` + concatenated strip | state into `maps-event-return.ts` |
| MapsRerouteOwnership | model | KEEP; PORT | imports helpers from `specs/quint/legacy/maps/check-maps-refinement.mjs` | move 4 helpers to a live support module |
| MapsShareChoice | model | KEEP; PORT | tail slice from `export function installMapsChatAdapter(` | `maps-chat-adapter.ts` module |
| MediaCopyIntent | model | KEEP | **real bundle via `loadProductModule`** | none |
| ModalScrimOwnership | model | KEEP | **real modules + `phone.css` in Chromium** | drop `checkClientFeatures` import |
| ModalToastForwarding | model | KEEP; PORT | strips `toast-layer.ts`, reads private `installed` | `sourceModule` + DOM observation |
| MountedUpdateAdmission | model | KEEP; PORT | slices `main.tsx` and `settings-adapter.ts`, gate marker, hash checks (B5) | `runtime/mounted-update.ts` export; drop hashes |
| NativeViewSubscription | model | KEEP; PORT | `sourceContext` transplant | import with a fake port |

Counts: KEEP 32 (6 already import-based and need no harness change, 3 are upstream-only models), MERGE 1, DELETE 0.

## Behaviours that would lose coverage
- None of the DELETEs is in this chunk. The real risk is the **order of deletion** of shared fixtures:
  - `delete-candidates.md` C3 lists `test/fixtures/google-account-panel.mjs` and `specs/quint/refinement/application/google-calendar-link-publication.{mjs,md}`.
    They still serve GoogleCalendarAccessChoice, GoogleConsentAdmission and GoogleCalendarLinkPublication. Those models
    cover the live Google panel, not the client Calendar sync stack. If C3 is applied as written, three live models lose
    refinement. Port the two transplant harnesses first and drop the link-publication harness from C3.
  - Retiring `specs/quint/legacy` (P6) breaks GoogleAccessPublication (`legacy/core/source-support.mjs` `deferred`) and
    MapsRerouteOwnership (`legacy/maps/check-maps-refinement.mjs` `geo/mountClosedMaps/route/start`) unless those helpers
    move first.
- KeyboardFocus merge: its six runs and the DOM draft/selection preservation observation must be carried into
  KeyboardDetectors. Otherwise the native-IME/voice-handoff focus behaviour loses its only coverage.

## Shared helpers worth keeping
- `specs/quint/refinement/application/support.mjs`: `sourceModule`/`bundledSource` (the target pattern), `deferred`, `tick`,
  `boundInputs`. `sourceContext` is the transplant helper. It shrinks as harnesses port and is deleted when unused.
- `notes-files-media-itf.mjs` `loadProductModule` (bundle + port stubs + rewrite) duplicates `bundledSource`. Keep one (C3).
- `shell-model-traces.mjs` (`modelTraces`/`replay`) and `services/maps-model-traces.mjs` are two trace-replay drivers for the same job. Merge them.
- `test/fixtures/modal-scrim-chromium.mjs` is a good integration fixture (real modules + CSS in Chromium).

## Cross-file actions
1. Product exports needed for the ports: `settleFirstSendSlot` (agent-adapter → runtime module), `latchPatch` (→ `shell-helpers.js`),
   a dock keyboard watch (from `chat-overlay-motion-adapter.ts`), the Home notice decision and gesture controller (`home-shell.ts`),
   `maps-chat-adapter.ts`, plane controller in `maps/map-plane.ts`, return state in `maps-event-return.ts`,
   `runtime/mounted-update.ts` (from `main.tsx`), the settings idle policy, and cleanup/link ports on the Google Calendar link module (google-accounts split).
2. Replace the manifest `symbols` pins on these rows with file pins. FixtureBusyLatch pins literal call text and blocks Prettier (D9).
   InertHold, InlineModalFocus, MapPlaneOwnership, MapsShareChoice and KeyboardDetectors pin private local names.
3. Remove the duplicate run (T4). 21 of the 24 models of this chunk in `refinement/application/index.mjs` run both from their per-model
   `test/quint-*.test.mjs` and from `test/quint-application-refinement.test.mjs`. Keep one runner per campaign.
4. HostedDigestMutation: drop the `"legacy"` journal phase and its harness seeds in the same commit as B297.
5. Drop B5 ceremony: exact witness and trace counts in `test/quint-map-plane-ownership.test.mjs` and `test/quint-maps-share-choice.test.mjs`;
   projection hash checks in `mounted-update-admission.mjs`; `checkClientFeatures` imports inside harnesses.
6. Fix manifest sources that claim coverage no harness exercises: `MainActivity.java` (KeyboardFocus), `AlphaDevicePlugin.java`
   (MountedUpdateAdmission, unless `native/update-barrier.mjs` is its refinement), `home-shell.ts` (LauncherObserver/Ownership).
7. CI: run the Google panel, hosted digest and Maps harnesses (Chromium) only when their manifest sources change (P1).

## Owner questions
- LauncherFavorites, LauncherObserver and LauncherOwnership verify upstream-generated launcher code, including upstream legacy
  favourites migrations (v1 / bare v2 / `alpha:workflows`). Should they move to `vendor/eliza` upstream (D14), or stay here as Alpha's guard on the pinned revision?
- FixtureBusyLatch models development-fixture views in `model.js`. Do those three fixture views (workflow step, settings check,
  browser-agent step) survive the D19 dev-simulator scope? If not, delete the model, its manifest row and its test with them.
- C3 correction: confirm that `google-calendar-link-publication.{mjs,md}` and `test/fixtures/google-account-panel.mjs` are not part
  of the Calendar sync deletion. They test the live Google panel.
