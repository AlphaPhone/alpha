# test/browser/native-video-library-change.spec.ts
- Lines: 107 | Kind: Playwright spec, chromium, 9 tests (1 + 3-way loop + 3-way loop + 2); real Photos UI over a monkey-patched `Capacitor.nativePromise` | Verdict: MERGE into `journeys/camera-photos.spec.ts`
- Covers: while a native "Save video copy" is pending, the app's own library-change notifications do not cancel it; revocation, source change or removal do cancel it; a receipt waits for held source validation; a revoke during receipt acknowledgement does not expose the source; a late receipt does not replace a newer selection. Duplicates: partly `video-edit.spec.ts` (editor UI), none for the invalidation rules. Callers/importers: none; imports `helpers/photos-bridge.ts`, reads `android/video-fixture/src/main/assets/qa-source.mp4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-30 | T7, C5 | Hand-written override of `Capacitor.nativePromise` for `AlphaPhotos` video methods, in-page. One of the 57 bridge fakes. | Move to a `photosBridge(page,{videoEdit:'held'})` option with `complete()`, `hold()`/`release()` and `revoke()/change()/remove()` controls. | Low |
| 2 | 77-79 | T6 | Patches `Storage.prototype.removeItem` to inject a revoke at the moment the pending-copy key is cleared. Couples to the key `alpha.photos.pending-copy.v1`. | Keep (it is the only way to hit that interleaving) but behind the bridge fixture: `revokeOnAcknowledge`. | Low |
| 3 | 51, 60 | ok | Two parameterised loops (3 cases each) share the same open-and-save prelude. | Keep the cases; one prelude via fixture. Consider one case per rule instead of three for "invalidates" (the three sources share one code path). | Low |
| 4 | 44, 49, 98 | T6 | Asserts `mediaFixture.calls`, `cancelCount`, `localStorage` pending key. | Fixture counters are the native boundary, acceptable. Drop the `localStorage` read (line 98) and assert the viewer instead. | None |

## Proposed end state
One `video copy while library changes` step group in `journeys/camera-photos.spec.ts` on the shared photos bridge fixture: own notification keeps Save; revoke/change/remove cancel (one parameterised case); held validation gates the receipt; revoke during acknowledgement hides the copy; late receipt keeps newer selection. About 50 lines.
