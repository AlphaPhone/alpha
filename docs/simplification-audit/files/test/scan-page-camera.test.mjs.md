# test/scan-page-camera.test.mjs
- Lines: 34 | Kind: transplant (strips imports and types from `prototype/scan-page-camera.ts`, runs in `vm` with jsdom and fake stream) | Verdict: DELETE
- Covers: once the camera track ends, Retake is disabled and the reviewed capture is not discarded. Duplicates: `test/browser/scan-page-camera.spec.ts` and `scan-native-page-camera.spec.ts` (both drive "Retake capture"). Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-22 | T2 | Regex-removes `import` lines and evals the file. | Delete. | Low |
| 2 | 29 | T3 | Re-enables the disabled button by hand to call its handler. | Goes with the file. | Low |

## Proposed end state
File deleted. If the browser specs do not end the track, add `track.stop()` via `page.evaluate` on the fake stream in
`journeys/camera-photos.spec.ts` and assert Retake is disabled.
