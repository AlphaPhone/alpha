# specs/quint/native/MediaLifecycle.qnt
- Lines: 110 | Kind: Quint model (live) | Verdict: KEEP
- Covers: selected media identity and lifecycle fences: a read is admitted only while foreground, unlocked, permitted and on the current epoch; review binds the source revision; only reviewed bytes are published; cancelled captures leave no temporary bytes; denied scope empties the catalog; replacing a selection stops playback. Duplicates: `application/PhotosWindow`, `VideoEditReview`, `VideoRecorder` model the renderer windows/editors around it (different scope); `test/browser/*photo*`/`*video*` specs drive the preview UI. Callers/importers: `quint:check` (6 runs); `refinement/native/ComponentTraces.java:91-122` `media()` (javac of `android/.../NativeReadEpoch.java` and upstream `SelectedPhotoCopy.java`), run from `refinement/native/index.mjs:112-131`; obligation `index.mjs:216`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | T10 / §2.3 | Eight sources pinned (`photo-library.ts`, `browser-camera.ts`, `photo-library-adapter.ts`, `video-edit-review.ts`, `NativeReadEpoch.java`, `SelectedDocumentAccess.java`, `AlphaPhotoLibraryPlugin.java`, `browser/files.ts`); the harness executes `NativeReadEpoch.java` and upstream `SelectedPhotoCopy.java` only. The renderer pins make every Photos/Files UI edit re-run Apalache. | Trim to the executed Java (+ `AlphaPhotoLibraryPlugin.java` if a later harness compiles it). | Low |
| 2 | manifest `abstractions[3]` | A8 | "Files Photos collections reference the existing media rows…" — `apps/app/src/browser/files.ts` has no collections today (`grep -c collection` = 0). Stale text. | Delete that abstraction sentence. | None |
| 3 | 11 | — | Older `check(condition)` style. | Optional `.expect`. | None |
| 4 | 61-72 | — | One `invalidate(reason)` action covers revoke/pause/lock/source change with one epoch bump: compact. | None. | — |

## Proposed end state
Model unchanged. Manifest `sources` trimmed to the executed Java and the stale Files-collections abstraction
removed. It remains the native media read/review/publish proof; the preview UI stays with the camera-photos journey.
