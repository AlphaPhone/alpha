# test/toast-undo-offer.test.mjs
- Lines: 123 | Kind: transplant (slices `prototype/model.js` from `  later(fn, ms, grp)` to `  /* ---- per-app state ---- */`, ~55 lines, wraps them in a fake `class Shell` in `vm`) | Verdict: REWRITE two cases into `journeys/home-shell.spec.ts`; DELETE the rest
- Covers: toast queue with Undo: a passive message waits behind a visible Undo offer; Undo still runs after a later message; consecutive Undo offers keep order; focus on a removed Undo button does not hold the next message; a delayed close commit cannot replace a newer retry Undo. Duplicates: `test/browser/shell-toast.spec.ts` "passive notices keep the current Undo and show the latest notice afterward" (l.42), "consecutive deletion notices retain both exact Undo callbacks" (l.53), "keyboard focus on Undo holds the toast" (l.64). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-31 | T2, T10 | Two comment/text markers in `model.js`; stage F splits `model.js` and breaks it. | Delete. | none |
| 2 | 33-52, 67-80 | T4 | Same behaviour as `shell-toast.spec.ts` l.42 and l.53. | Delete. | none |
| 3 | 54-65 | — | "Undo still runs after a later message, and the waiting message follows" is not in the spec. | Carry into the journey (delete a note, raise a notice, tap Undo, note is back, notice follows). | low |
| 4 | 106-123 | — | React commit race (retry Undo not replaced by an old close commit) cannot be driven reliably from Playwright. | Carry as "a failed Undo that offers Retry keeps Retry visible" with a bridge fault; the exact commit interleaving loses coverage. | medium |
| 5 | 91-104 | — | Focus on a removed Undo button. | Carry as one keyboard step in the existing focus case. | low |

## Proposed end state
Deleted. `shell-toast.spec.ts` merges into `journeys/home-shell.spec.ts` (driving real deletions instead of reaching
`toast()` through the React fiber, T6), plus: Undo after a later notice, Retry Undo stays, focus leaving a removed Undo.
