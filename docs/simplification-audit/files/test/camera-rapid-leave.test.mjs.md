# test/camera-rapid-leave.test.mjs
- Lines: 34 | Kind: e2e inside `node:test` (Chromium via `test/fixtures/calendar-mounted-editor.mjs` with `observeCamera`, `test/fixtures/camera-preview-port.mjs` controlling synthetic MediaStreams) | Verdict: DELETE (T4)
- Covers: leaving Camera while the preview is starting or ready retires it before Home commits, never starts a preview against the old view, and re-entering starts cleanly. Duplicates: `specs/quint/refinement/application/camera-preview-retirement.mjs` (run by `test/quint-camera-preview-retirement.test.mjs`) uses the same fixture and port with schedules "leave while a preview is pending, deliver it late, then reopen" (line 76) and "leave while a ready track is visible, then reopen" (line 79). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Same two scenarios as the Quint replay on the same fixture. | Delete. | None |
| 2 | 6 | T8 | 240 s timeout; Chromium in the host suite. | Gone. | - |

## Proposed end state
Deleted. `test/fixtures/camera-preview-port.mjs` and `calendar-mounted-editor.mjs` stay for the Quint harness.
