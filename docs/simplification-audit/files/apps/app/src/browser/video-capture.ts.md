# apps/app/src/browser/video-capture.ts
- Lines: 89 | Role: browser camera video recorder with size/duration limits (admitVideoChunk LemmaScript-verified) | Verdict: KEEP
- Importers: 1 (prototype/browser-camera.ts). Text/path pins: LemmaScript-files.txt; specs/quint/native/manifest.json; refinement native/video-recorder.mjs; test/video-capture-limit.test.mjs (strips types from source), test/quint-video-recorder.test.mjs, test/browser-camera-storage.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 70, 83 | C3 | "finish after 5 s deadline" timeout is written in finish() path and again in stop(). | Single `armDeadline(session)`. | Low. |
| 2 | 30, 72 | B1 | `try{recorder.stop()}catch{}` — stopping an already-stopped recorder; acceptable. | Keep with comment. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Capture/Session | type | 3-4 | none | stay |

## Proposed end state
Unchanged apart from one deadline helper. Estimated lines after: 87 (current 89).

## Verification
LemmaScript, test/video-capture-limit.test.mjs, video-recorder Quint harness, dev-sensors.spec.ts.
