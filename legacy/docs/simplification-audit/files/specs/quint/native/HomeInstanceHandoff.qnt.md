# specs/quint/native/HomeInstanceHandoff.qnt
- Lines: 141 | Kind: Quint model (live) | Verdict: KEEP
- Covers: the launcher `MainActivity` keeps one page owner: a second instance hands off to the live task (by task id for a standard task, by a marked HOME start for a home-type task), stops handing off after three unanswered starts, a front start that makes a new instance ends hand-off, relaunch keeps the stored task kind, every intent is delivered once. Duplicates: `RendererBackgroundRebuild`/`RendererRecovery` share the MainActivity platform but model other behaviour; `test/quint-home-instance-handoff.test.mjs` re-runs this exact campaign (T4). Callers/importers: `quint:check` (8 runs, 4 witnesses); `specs/quint/refinement/native/home-instance-handoff.mjs` (Quint ITF traces replayed on the real `MainActivity.java` via `HomeInstanceHandoffReplay.java`, `MainActivityPorts.java`, `main-activity-platform.mjs`), registered in `refinement/native/forward-replays.mjs:31,50,63`; manifest `symbols` pin 10 names in `MainActivity.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — (good) | Real `MainActivity.java` is compiled whole with Android/Capacitor port stubs and replayed step by step against model ITF traces: the robust style. | Keep. | — |
| 2 | `main-activity-platform.mjs:562-583` | T10 (mild) | The platform reads `MainActivity.java` text to enumerate `registerPlugin(X.class)` and the Maps action constant (`static final String ACTION_SHOW_MAPS="…"`) to generate stubs. A rename of a plugin class breaks generation but not semantics. | Acceptable; alternatively compile against the real plugin classes. Low priority. | Low |
| 3 | manifest `symbols` | T10 | Ten regex symbol pins (`handOff`, `moveLiveTaskToFront`, `liveInstance`, `unackedFrontStarts`, `MAX_UNACKED_FRONT_STARTS`, …) duplicate what the javac replay already enforces (a missing member fails compilation). | Drop `symbols`; keep `sources`. | Low |
| 4 | test wrapper | T4 / B5 | `test/quint-home-instance-handoff.test.mjs` runs `checkHomeInstanceHandoff()` again (also run by the native aggregate through `forward-replays.mjs`), asserting `traces === 64` and `reached.length === 6`; `forward-replays.mjs:42,58,64` asserts the same constants. | Delete the per-model wrapper; in `forward-replays.mjs` replace exact counts by `> 0` and the required-action/witness checks. | Low |
| 5 | 12, 86 | — | `MAX_UNACKED = 3` mirrors `MAX_UNACKED_FRONT_STARTS`; checked by replay. | None. | — |

## Proposed end state
Model and replay harness unchanged. The duplicate wrapper test and the symbol pins are removed; exact trace counts
become positivity checks. This stays the main proof of HOME-role hand-off logic; device HOME-role behaviour remains
an emulator/device obligation (AGENTS.md: an APK build or host replay does not prove it).
