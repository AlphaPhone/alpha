# specs/quint/application/KeyboardFocus.qnt
- Lines: 33 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: MERGE into `specs/quint/application/KeyboardDetectors.qnt`
- Covers: composer focus vs Android IME visibility: hiding the native keyboard blurs the composer, voice handoff keeps it, viewport fallback only without native signal (`chat-overlay-motion-adapter.ts`; manifest also lists `MainActivity.java`). Duplicates: KeyboardDetectors (same adapter region). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `keyboard-focus.mjs` only in `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`) (no per-model test)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-15 | — | Quint `safety` is only a type check: `draft == "keep"` and `selection == 2` are never written. The real value is the refinement observing the DOM draft/selection. | Carry the draft/selection preservation as refinement observations in the merged harness. | L |
| 2 | harness 16-18 | T2/T10 | Slices `function clearScrimPress(`…`function watchDockScrimPress(` and `\t\tconst free = keyboardFreeHeight();`…`\n\t};\n\tp.componentDidUpdate` (tab-indented anchors). | Import the exported dock watch (KeyboardDetectors port). | H: any reformat breaks it |
| 3 | manifest | T10 | Lists `MainActivity.java` but no harness touches Java. | Drop the Java source or add a native refinement; do not claim it. | L |
| 4 | 16-32 | C5 | Six runs (floating keyboard, initial hidden, other field, browser fallback, native ordering, voice handoff). | Move all six into KeyboardDetectors as runs. | M |

## Proposed end state
- File deleted after its actions and six runs move into KeyboardDetectors.qnt.
- Manifest row removed; `keyboard-focus.mjs` removed from the aggregate index.
