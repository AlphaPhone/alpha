# specs/quint/refinement/application/launcher-observer.mjs
- Lines: 123 | Kind: Quint refinement harness (source campaign, `LauncherObserver`, live) | Verdict: KEEP (owner question: move upstream, P6/D14)
- Covers: one 120 ms debounce shared by package notifications, resume and visibility; stop disarms it and removes the native listener exactly once even when registration settles late; rejected removal contained (`.eliza/.../plugin-native-system/src/client/launcher.ts` only — no Alpha code). Duplicates: none. Callers/importers: `test/quint-launcher-observer.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | T10 | Reads the generated upstream file as text, prepends `const {setTimeout,clearTimeout}=__port;` and injects `__port.inspect` after `'  let pending: ReturnType<typeof setTimeout> | null = null;'`. | Timers can be replaced via `globalThis` with an imported bundle; the `active/pending` closure still needs an upstream snapshot. Keep the marker until upstream exposes it. | M: breaks on upstream bump. |
| 2 | all | P6 | Models upstream-only code; Alpha cannot change the implementation without an upstream change. | Owner question: move model + harness to `vendor/eliza` CI. | — |
| 3 | 36 | T2 | `new Function` eval. | `import()`. | L |

## Proposed end state
Unchanged 12 schedules here until moved upstream; then deleted from this repo with the model.
