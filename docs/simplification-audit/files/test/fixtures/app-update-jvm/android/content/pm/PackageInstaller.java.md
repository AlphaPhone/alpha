# test/fixtures/app-update-jvm/android/content/pm/PackageInstaller.java
- Lines: 133 | Kind: fixture (Android/Capacitor host-JVM stub) | Verdict: KEEP (part of the app-update JVM stub tree)
- Covers: the substantive piece: a model of AOSP PackageInstallerSession/Service behaviour per SDK level (active counts, validation, seal, accept/install/destroy across sdk 29-37, a stale-progress read on 12/12L, reboot rereads, one-shot `failAt` phases, hooks for races). It is what UpdateFlowTest and the update Quint harnesses exercise the plugin against. Duplicates: none. Callers/importers: `test/app-update.test.mjs` (compiles the whole tree via `javaFiles(fixture('app-update-jvm'))` with real `AlphaDevicePlugin` update members, `PluginWorkers`, `AlphaUpdateStatusReceiver`, `UpdateConfirmationReceipt`, upstream `RuntimeUpdatePause` and `test/fixtures/UpdateFlowTest.java`), and four live Quint native harnesses that compile the same directory recursively: `specs/quint/refinement/native/update-barrier.mjs:13-16`, `update-composition.mjs:16`, `update-staging.mjs:20`, `runtime-update-pause.mjs:16,53`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 165-171, 177-182 | - | Behaviour is transcribed from AOSP sources by line number, not verified on a device; the comment says so. This is a model, and it should be named and reviewed like one. | Keep; consider moving the AOSP-behaviour notes into the Quint model docs that cite it. | Medium: wrong transcription = false confidence about real-device updates (AGENTS.md: a JVM run is not device acceptance). |
| 2 | 172-295 | D8 | Dense one-line methods (`commit`, `read`, `reboot`). | Reformat when touched. | none |

## Proposed end state
Keep as part of the one Android host-JVM stub set (see chunk summary: merge `app-update-jvm`, `reviewed-copies-jvm`, `note-recorder-jvm`, `secure-store-memory`, `scoped-calendar-jvm`, `android-stubs`, `calendar-provider-jvm` into `test/jvm-stubs/` or `android/app/src/test` stubs). The directory is compiled as a whole, so no single stub can be dropped while `UpdateFlowTest` and the four update harnesses run. It moves with the update harnesses when `specs/quint/refinement` stops importing from `test/fixtures` (ci-and-formal: specs depends on test).
