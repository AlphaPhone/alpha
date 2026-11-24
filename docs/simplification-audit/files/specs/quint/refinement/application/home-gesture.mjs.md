# specs/quint/refinement/application/home-gesture.mjs
- Lines: 205 | Kind: Quint refinement harness (source campaign, `HomeGesture`, live) | Verdict: PORT
- Covers: Home edit gestures — one pointer owns a press/drag, the 450 ms hold, retired surfaces (drawer, view, inert, unmount) own nothing, keyboard reorder refocuses the same key, add-sheet/Back unwind (`home-shell.ts` with upstream `navigation.ts`). Duplicates: none at this depth; Playwright home specs (if any) only click. Callers/importers: `test/quint-home-gesture.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-27 | T10 | Two literal seams in `home-shell.ts`: injects `__port.inspect` after `  let swallow = '';` and **replaces** `const focusTile = (key: string) => requestAnimationFrame(` with a port call — the harness changes product behaviour, not just observes it. | Export the gesture controller (press/drag/swallow state + handlers) from home-shell and take the focus scheduler as a parameter (default `requestAnimationFrame`). | M: any reformat breaks the exact string match. |
| 2 | 11, 15-17 | D13 | Reaches `upstream renderer: mobile-shell/navigation.ts` by path. | `@eliza/*` alias (stage F). | L |
| 3 | 70-72 | T2 | `new Function` eval with injected `setTimeout/clearTimeout/CSS/document`. | `import()` the bundle; patch timers via the port parameter. | L |
| 4 | 58-60 | — | Fake `setTimeout` asserts `delay === 450`; the hold constant is pinned by the harness. Acceptable: it is a model constant. | Keep, or import the constant once exported. | — |
| 5 | 73-88 | C5 | `Host` class duplicates `home-failure-notice.mjs:63-76`. | Shared `homeHost()` helper. | L |

## Proposed end state
Harness imports an exported gesture controller with an injected focus scheduler and timer port; no text seams; 20 schedules kept; one runner.
