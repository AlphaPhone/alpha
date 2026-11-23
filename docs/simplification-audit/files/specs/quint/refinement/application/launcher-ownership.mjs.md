# specs/quint/refinement/application/launcher-ownership.mjs
- Lines: 190 | Kind: Quint refinement harness (source campaign, `LauncherOwnership`, live) | Verdict: KEEP (owner question: move upstream, P6/D14)
- Covers: inventory read waits for both list and dial-role replies; only the current generation publishes; native handoff keeps exact package/activity/profile; cancel fences old reads and launches (`.eliza/.../plugin-native-system/src/client/launcher.ts`; manifest also pins `mobile-launcher.ts` and `home-shell.ts`, which this harness does not load). Duplicates: none. Callers/importers: `test/quint-launcher-ownership.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-30 | T10 | Text injection after `'  let lifetime = 0;'` exposing `state, generation, lifetime`. | Same as LauncherObserver: needs an upstream snapshot. | M |
| 2 | manifest | T10 | Manifest pins `apps/app/src/prototype/home-shell.ts` though the harness never loads it; every home-shell edit re-selects this model in changed-model CI. | Pin only `launcher.ts`. | L |
| 3 | 36 | T2 | `new Function` eval. | `import()`. | L |
| 4 | all | P6 | Upstream-only behaviour. | Owner question. | — |

## Proposed end state
15 schedules unchanged; manifest sources narrowed to what runs; moves upstream with the other two launcher models if the owner agrees.
