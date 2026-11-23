# test/camera-capture-mode-patch.test.mjs
- Lines: 25 | Kind: source-text (runs `preparePatchedNative` from `scripts/prepare-patched-native.ts`, then regexes the prepared upstream `CameraPlugin.kt` and the whitespace-stripped `prototype/camera-adapter.ts`) | Verdict: DELETE
- Covers: (named) `patches/eliza/camera-capture-latency.patch`: Video mode pre-binds VideoCapture with the recording options and a mode change with no bound use case rejects `PREVIEW_STOPPED`. Duplicates: the behaviour half is in `test/camera-preview-recovery.test.mjs:54-79` (transplant) and on device. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | A8 | The patch it names no longer exists (`patches/` is absent; commit 12f54e311 "Consume reviewed shared fixes directly from upstream"). The Kotlin it greps is plain upstream now (`CameraPlugin.kt:146-458`). | Delete. | None |
| 2 | 13-22 | T1 / T5 | Regex over upstream Kotlin. | Delete (upstream owns it). | None |
| 3 | 23-24 | T1 | Regex over adapter source for `setCaptureMode({mode:wanted,quality:RECORDING.quality})`. | Delete; the camera journey's bridge fake can assert the quality passed to `setCaptureMode` and `startRecording` match. | Low |
| 4 | 10 | B2 | Skips when `vendor/eliza` is absent; the submodule is required. | Gone. | - |
| 5 | 12 | - | `preparePatchedNative` copies the native tree each run (cost). | Gone. | - |

## Proposed end state
Deleted. `journeys/camera-photos.spec.ts` (Video mode step) checks through the Camera bridge fake that the mode bind and
the recording request use the same quality.
