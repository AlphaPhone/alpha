# Chunk specs-19: specs/quint/native (AlwaysOnListener … MessageThreads)

| File | Kind | Verdict | Target / harness note |
|---|---|---|---|
| `AlwaysOnListener.qnt` | Quint model (D7 live) | MERGE | into `AlwaysOnListenerIndicatorReadback.qnt`, renamed `AlwaysOnListener` (carry the `image` gate if still in product) |
| `AlwaysOnListenerIndicatorReadback.qnt` | Quint model (audit twin) | KEEP (canonical, rename) | move harness `native/conformance.mjs` to `refinement/native/always-on-listener.mjs` |
| `ApplicationComposition.qnt` | Quint composition | KEEP (simplify in place) | frame helpers, setups once; harness hashes served graph only |
| `BatchCaptureCompletion.qnt` | Quint model | KEEP model, PORT harness | extract `captureConversationAudio` from `voice-adapter.ts` into an exported module |
| `BrowserUnderlay.qnt` | Quint model of upstream Kotlin | KEEP, gate on `upstream.lock.json`, upstream follow-up | — |
| `CanonicalNotificationTap.qnt` | Quint model | KEEP model, PORT harness | compile `AlphaCanonicalNotifications`/`AlphaNotificationsPlugin` whole with ports |
| `ContactsBook.qnt` | Quint model (esbuild import harness) | KEEP | replace vacuous `repeat`; trim sources |
| `ControllerComposition.qnt` | Quint composition | DELETE | Calendar half models deleted `calendar-sync-host.ts` (D4); rest covered by `ApplicationComposition` |
| `CopyReceipt.qnt` | Quint model of browser preview backend | DELETE (owner Q) | preview photo-edit stays in `journeys/camera-photos.spec.ts` |
| `DeletionJournal.qnt` | Quint model (Java harnesses) | KEEP | replace vacuous `repeatStage` |
| `DeviceActions.qnt` | Quint model, superseded | DELETE | covered by `NativeSmsDispatch`, `NativeReminderDelivery`/`NativeClockReview`, `ContactsBook` |
| `GoogleBrowserReturnClaim.qnt` | Quint model of upstream auth Java | KEEP, gate on upstream pin, upstream follow-up | — |
| `HomeInstanceHandoff.qnt` | Quint model (ITF replay on real MainActivity) | KEEP | drop symbol pins and duplicate wrapper test |
| `KeyboardDictation.qnt` | Quint model | KEEP | fix proxy invariant; remove duplicate replay in `test/keyboard-dictation.test.mjs` |
| `KeyboardDictationCloud.qnt` | Quint model | KEEP | — |
| `ListenerLeaseProducer.qnt` | Quint model of upstream SystemUI | KEEP, fix empty `sources`, upstream follow-up | — |
| `ListenerLeaseRecovery.qnt` | Quint model | MERGE (partial) | crash-history half into `NativeListenerStore.qnt` |
| `MediaLifecycle.qnt` | Quint model | KEEP | trim sources; remove stale "Files collections" abstraction |
| `MessageThreads.qnt` | Quint model (esbuild import harness) | KEEP | delete duplicate `test/message-draft.test.mjs` |

## Coverage that would be lost
- `ControllerComposition`: nothing for live code (Calendar host already deleted, and the harness cannot load today because
  `ports.mjs` imports deleted files). Carry `lateVoiceReplyCannotUseReplacementTest` and the three real-browser voice
  scenarios (`voice-open-signin`, `voice-pending-replacement`, `voice-hidden`) into `ApplicationComposition` / its
  `composition/index.mjs` harness, or the renderer voice/sign-in interaction loses its real-browser composition check.
- `DeviceActions`: none if `NativeReminderDelivery` has a stale-revision-fire case (it has `oldAndEarlyAlarmsDoNotPostTest`).
- `CopyReceipt`: the formal proof of copy/receipt atomicity in the browser preview photo library (IndexedDB) is lost;
  only `browser-photo-edit.spec.ts` (journey) remains. Production Android edits are unaffected (`MediaLifecycle`).
- `AlwaysOnListener` merge and `ListenerLeaseRecovery` partial merge: none if the `image` gate and the three crash
  non-counting scenarios (reboot/update/permission) are carried.

## Shared helpers worth keeping
- `refinement/native/telephony.mjs` `capture()` (esbuild bundle + call exports): the target style for every PORT here.
- `refinement/native/java.mjs` + `MainActivityPorts.java` / `itf-replay.mjs`: whole-class javac with ports; target for
  `CanonicalNotificationTap`.
- `copy-receipt.mjs` Vite `transform` hook that hashes only served modules: reuse in `composition/index.mjs` instead of
  `sourcePaths()` before `CopyReceipt` is deleted.

## Cross-file actions
1. ControllerComposition deletion (one change): `.qnt`, manifest entry, `refinement/composition/controllers.mjs`, Calendar
   parts of `composition/ports.mjs`, `composition/index.mjs:1,142`, `refinement/native/index.mjs:224`,
   `test/quint-native-refinement.test.mjs:15,23`, rewrite `test/quint-composition-refinement.test.mjs` to assert the
   `ApplicationComposition` receipt; `services/CalendarLinkedSync.qnt` then loses its last importer (services chunk).
2. DeviceActions deletion: manifest entry, `JournalTraces.java` `smsTraces()` + `DeviceActions` key, `native/index.mjs:222`.
3. CopyReceipt deletion: manifest entry, `refinement/native/copy-receipt.mjs`, `native/index.mjs:70,94`,
   `test/quint-copy-receipt.test.mjs`.
4. Always-on merge: rename Readback → `AlwaysOnListener`; delete `ComponentTraces.listeners()`; move
   `native/conformance.mjs` listener part to `refinement/native/` and its Maps part to the Maps harness.
5. Listener crash merge with `NativeListenerStore` (other chunk's file) and `ComponentTraces.leases()` breaker part.
6. Duplicate replays to delete: `test/quint-home-instance-handoff.test.mjs`, Quint block of `test/keyboard-dictation.test.mjs`,
   `test/message-draft.test.mjs`; replace exact counts in `forward-replays.mjs` with `> 0`.
7. Manifest hygiene: trim `sources` to executed files (ContactsBook, DeletionJournal, DeviceActions, KeyboardDictation,
   MediaLifecycle, MessageThreads, AlwaysOnListener, ListenerLeaseRecovery); set `ListenerLeaseProducer.sources`
   (currently `[]`); drop `symbols` on HomeInstanceHandoff.
8. CI: gate `BrowserUnderlay`, `GoogleBrowserReturnClaim`, `ListenerLeaseProducer` (upstream-only) on `upstream.lock.json`;
   list them as D14 upstream follow-ups.
9. PORTs: `BatchCaptureCompletion` (needs product extraction from `voice-adapter.ts`, must land before Prettier/D9),
   `CanonicalNotificationTap`.

## Owner questions
- Is a formal model of the browser preview photo library (`CopyReceipt`, `!Capacitor.isNativePlatform()` path) wanted,
  or is the journey enough? Recommended: delete.
- Does the always-on listener still gate on image admission (the `image` field only the coarse model has)?
- Is the "direct" (Direct Cartesia) keyboard dictation route a shipped product route?
- Should upstream-only models (BrowserUnderlay, GoogleBrowserReturnClaim, ListenerLeaseProducer) be moved upstream,
  or stay here gated on the pin?
