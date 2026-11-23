# test/quint-canonical-notification-tap-refinement.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `CanonicalNotificationTap`, driver `specs/quint/refinement/native/canonical-notification-tap.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: native canonical tap slots and bridge keep custody and acknowledgement. Product code: `AlphaCanonicalNotifications.java`, `AlphaNotificationsPlugin.java`, `AlphaLocalAgentPlugin.java`, `MainActivity.java`, upstream `NotificationsHostPlugin.java`, `ForegroundNoticeGate.java`, `NativeNotificationRoute.java`; model live (in `specs/quint/native/manifest.json`). Duplicates: the same campaign runs again in `runNativeRefinement()` (`specs/quint/refinement/native/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `canonical-notification-tap.mjs`; the campaign also runs in the native aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===9`, `checkpoints===176`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/native/canonical-notification-tap.mjs`): javac-compiles real Java incl. pinned upstream files read through `upstream-native-source.ts`. | No change needed for the tie. | Low |

## Proposed end state
File deleted. `CanonicalNotificationTap` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
