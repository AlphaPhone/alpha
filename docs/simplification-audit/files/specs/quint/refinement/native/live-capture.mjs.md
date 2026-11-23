# specs/quint/refinement/native/live-capture.mjs
- Lines: 39 | Kind: Quint refinement driver (staged patched upstream voice capture classes: shared bridge parent, `LiveCaptureController`, `LiveVoiceCapture`, `LiveCaptureResource`; 20 scenarios) | Verdict: KEEP (delete the unused probe)
- Covers: live voice capture admission, permission flow, calls during opening/active capture, pause/destroy, open/release failures, stop tail/discard, replacement; model `NativeLiveCapture` (native manifest, live). Callers/importers: `test/quint-live-capture.test.mjs`, native aggregate `index.mjs:23,189` (T4), and `piped-capture.mjs`, `capture-frames.mjs` (import `liveCaptureSources`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | A7 | `probeLiveCapture` has no caller anywhere (grep of `test/`, `specs/`, `scripts/`); it is the only user of `LiveCaptureProbe.java`. | Delete both. | None |
| 2 | 8, 11-12 | D11 / C6 | Imports a *different* `currentNativeSource` from `shared-recording.mjs` than the rest of the folder uses; redefines `voice` path. | One resolver; import `voice` from `java.mjs`. | Low |
| 3 | 12 | D8 / D9 | One 300-character line choosing per-name between resolver and vendor path. | Two named lists. | None |
| 4 | 33 | — | Assumption says `LiveSegmentPipe` compiles but piped schedules are not driven here; `piped-capture.mjs` covers them (separate model). | Keep. | — |
| 5 | — | T4 | Aggregate duplicate. | Aggregate goes. | None |

## Proposed end state
`liveCaptureSources` + `checkLiveCapture` only; probe and its Java file deleted; one runner.
