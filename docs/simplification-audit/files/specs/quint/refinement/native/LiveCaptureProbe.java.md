# specs/quint/refinement/native/LiveCaptureProbe.java
- Lines: 40 | Kind: one-shot probe on vendored `LocalSpeechBridgePlugin`/`LiveCaptureController` (call starts during permission prompt or during opening) | Verdict: DELETE (unused)
- Covers: a phone call that starts while live capture waits for permission or for `AudioRecord` to open must not start recording during the call. Duplicates: `LiveCaptureTraces` scenarios `permission-call`, `opening-call`, `opening-call-release-failure` drive the same sequence and observe `startsDuringCall`, `current`, `sources.released/running` against `NativeLiveCapture.qnt`. Callers/importers: only `probeLiveCapture()` in `live-capture.mjs:14-18`, which `git grep` shows has **no caller** (no test, script or CI step).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 / T4 | Dead harness plus dead export; behaviour covered by the campaign. | Delete this file and `probeLiveCapture` from `live-capture.mjs`. | none |

## Proposed end state
Gone.
