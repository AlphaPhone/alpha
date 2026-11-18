# specs/quint/refinement/native/index.mjs
- Lines: 265 | Kind: Quint refinement **aggregate** (73 imports; ~70 campaigns incl. six inline Java groups; 37 prose obligations; model-state inventory) | Verdict: DELETE after extracting its unique campaigns
- Covers: runs every native refinement campaign in one process and asserts (in `test/quint-native-refinement.test.mjs`) that each native manifest model has a passing receipt. Duplicates: about 50 of its campaigns already have their own `test/quint-*.test.mjs` (e.g. `quint-credential-leases`, `quint-native-gmail-background`, `quint-listener-*`, `quint-live-capture`, `quint-indicator-provider`, `quint-keyboard-dictation-cloud`, and the nine forward replays). Callers/importers: only `test/quint-native-refinement.test.mjs:4` (timeout 2,400,000 ms; "exceeded 20 minutes"); `scripts/check-quint-refinement.ts:65` names `runNativeRefinement` for the `quint:refinement` script.

## Campaigns with no other runner (grep of `test/` for each imported function)
`checkKeyboardDictation`, `checkCredentialCoordinator`, `checkDeletionCoordinator`, `checkResetOrchestration`,
`residentLifecycleTraces` (ResidentRuntime via `local-agent.mjs`), `voiceTraces` (VoiceSession via `renderer.mjs`),
`checkBrowserUnderlay`, the five `checkTelephony*`, `checkAlwaysOnListenerIndicatorReadback`, and the inline groups
`FinitePolicyTraces` (VadSegmentation, RendererRecovery, ResidentScheduling), `ComponentTraces`, `JournalTraces`,
`PlaybackTraces`, `ResidentTraces`, `ProducerTraces`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 92-200 | T4 | ~50 campaigns run twice per verify (own test + here); the aggregate alone is 20-40 min. | Delete the aggregate and its test once the list above has per-model tests. | High if done before #2 |
| 2 | 96-161, 162-189 | T9 | Six Java groups and three campaigns are defined inline here and nowhere else. | Move each inline group to its own driver module (`finite-policy.mjs`, `component-traces.mjs`, `journal-traces.mjs`, `playback-traces.mjs`, `resident-traces.mjs`, `producer-traces.mjs`) with a `test/quint-<model>.test.mjs`; add tests for the aggregate-only checks. | Medium |
| 3 | 201-243 | B5 / A8 | 37 hand-written obligation sentences returned to a test that only checks two of them exist. | Delete; scope notes belong in the manifest entry or README. | None |
| 4 | 244-256 | B5 | Model-state inventory computes "unexecuted transitions/unobserved fields" and only appends them to obligations; never fails. | Delete, or make it a failing check in one place (`check-quint-refinement.ts`) if owners want action coverage enforced. | Low |
| 5 | 116, 98 | A3/A7 follow-up | `ComponentTraces` compiles `app+'NativeReadEpoch.java'` (product DELETE candidate, no product caller per specs-34). | Drop `media()`/NativeReadEpoch when the product file goes. | Low |
| 6 | 80-91, 113-140 | P6 | `PlaybackTraces`, `ResidentTraces`, `ProducerTraces`, `JournalTraces` and most `ComponentTraces` sources are upstream-only (`vendor/eliza/...`). | Path-filter those tests to `upstream.lock.json`; upstream follow-up (D14). | None |
| 7 | test file | coverage gap | The aggregate test is the only place asserting "every native manifest model has a receipt". | Replace with a cheap check in `scripts/check-quint.ts`: every live model lists a refinement test file that exists. | Low |

## Proposed end state
File deleted. One `test/quint-<model>.test.mjs` per campaign, each path-filtered; inline groups live in their own drivers;
`check-quint.ts` enforces that every live model names a runner. `quint:refinement --families=native` (if kept) runs the
per-model tests by glob instead of this module.
