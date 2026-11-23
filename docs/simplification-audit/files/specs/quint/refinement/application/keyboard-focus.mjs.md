# specs/quint/refinement/application/keyboard-focus.mjs
- Lines: 83 | Kind: Quint refinement harness (source transplant, `KeyboardFocus`, live) | Verdict: PORT (with the model MERGE into `KeyboardDetectors`)
- Covers: composer focus vs IME visibility — native "hidden" blurs the composer only after a visible state, voice handoff keeps it, browser viewport fallback only without a native signal, background keeps draft and selection (`apps/app/src/prototype/chat-overlay-motion-adapter.ts`). Duplicates: `KeyboardDetectors` model/harness covers the same adapter region (model report: MERGE). Callers/importers: aggregate `index.mjs` only — no per-model wrapper, so it runs only inside the 18-minute aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18 | T2/T10 | Concatenates two slices of the adapter cut at `'function clearScrimPress('`…`'function watchDockScrimPress('` and the **tab-indented** `'\t\tconst free = keyboardFreeHeight();'`…`'\n\t};\n\tp.componentDidUpdate'`, strips types and runs them in `vm` with injected `keyboardFreeHeight`/`isEditing`. | Export the keyboard watch (native visibility listener, `dockKeyboardWatch`, `dockHiddenWatch`) from a module and import it; fold into the KeyboardDetectors harness. | H: Prettier (D9) or any edit between anchors breaks it. |
| 2 | 16 | B1/bug | `readFileSync(source)` with a repo-relative path resolves against the process cwd, unlike every sibling (`support.mjs` `read()`); running from any other directory fails. | Use `read()`/`root`. | L |
| 3 | 54-56 | T10 | Binds `MainActivity.java` as a source although no Java executes (its own assumption says so). | Drop from sources and from the manifest entry. | L |
| 4 | 66-77 | C5 | Builds traces by hand instead of `trace()`/`checkpoint()`/`boundInputs()` from `support.mjs`. | Use the shared helpers. | L |
| 5 | 83 | A7 | `if (process.argv[1] === …) console.log(…)` CLI entry; no script calls it (grep: no reference). | Delete. | — |

## Proposed end state
Merged into the KeyboardDetectors harness: imports an exported keyboard watch, uses `support.mjs`, seven scenarios carried over, run by the manifest runner (so it is no longer aggregate-only).
