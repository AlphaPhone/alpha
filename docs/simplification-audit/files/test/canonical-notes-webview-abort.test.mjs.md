# test/canonical-notes-webview-abort.test.mjs
- Lines: 72 | Kind: mixed: transplant (vm-loads `canonical-notes-controller.ts` with a hand-written CJS loader; string-rewrites `canonical-notes-ui.ts` and evals it with 11 injected stubs) + source-text (line 34 regex over `connection-ui.tsx`) | Verdict: DELETE; carry 2 cases to `journeys/notes.spec.ts`, 1 to the WebView compatibility check
- Covers: Notes works on WebView 113 without `AbortSignal.any`; retire cancels a pending read; retired controllers cannot attach listeners; default note titles number up across notes and Trash; dropped unsaved edit is reported on connection change; Undo waits for an in-flight save. Duplicates: `test/quint-canonical-notes-controller.test.mjs` (retire/cancel), `test/quint-canonical-notes-mutation.test.mjs` (Undo vs save), `test/abort-signal-compat.test.mjs` (the `anyAbortSignal` fallback), `test/browser/notes-trash*.spec.ts` (Undo). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-23 | T2/C3 | Home-made CJS module loader (`load`/`require` over `vm`) duplicating `test/fixtures/browser-source.mjs`. | Delete. | None |
| 2 | 34 | T1 | `assert.doesNotMatch(source,/AbortSignal\.any\(/)` over `connection-ui.tsx` and `agent-calendar-client.ts`. A real compatibility rule (minimum WebView), but text-matching. | Move to the production bundle audit: fail if the built JS calls `AbortSignal.any` (or `AbortSignal.timeout`) on the minimum-WebView target. | Low |
| 3 | 36-44 | T2/D7 | Strips imports/exports from `canonical-notes-ui.ts` and injects 11 parameters positionally; any new import breaks it. | Delete. | None |
| 4 | 45-51 | T3 | "New note 3" numbering across notes and Trash; visible behaviour. | `journeys/notes.spec.ts`: create note with "New note" and "New note #2" in Trash -> "New note 3"; leaving an untouched new note saves nothing. | Low |
| 5 | 52-57 | T3 | "Dropped edit" notice on connection change; visible. | `journeys/connection-cloud.spec.ts` or notes journey: switch connection with unsaved edit -> notice names the note. | Low |
| 6 | 58-72 | T4 | Undo-while-saving is the Notes mutation model's subject. | Keep Quint only. | Low |

## Proposed end state
Deleted. The `AbortSignal.any` rule becomes a build-output check; numbering and dropped-edit notice become Notes
journey steps; retire/cancel/Undo stay with the canonical-notes Quint refinements.
