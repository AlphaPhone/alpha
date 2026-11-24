# specs/quint/refinement/native/LiveCapturePorts.java
- Lines: 14 | Kind: harness support port (physical AudioRecord custody: hold open, fail start/release, starts during call) | Verdict: KEEP
- Callers/importers: `live-capture.mjs` (compiled list via `liveCaptureSources`), `live-capture-platform.mjs:15-30` (stub `AudioRecord`), `LiveCaptureTraces.java`, `LiveCaptureProbe.java` (DELETE). Survives the probe deletion (two remaining importers).
- Findings: none beyond the static-global style shared with the other ports (acceptable; one scenario per JVM).
- Proposed end state: unchanged.
