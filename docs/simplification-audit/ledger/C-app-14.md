# C-app-14 — apps/app/src/prototype/model.js (in-file cleanup)

Status: finished (two passes over the whole file).

## Done

- `model.js`: 73 `IC.x = IC.x || "…"` self-defaults became plain `IC.x = "…"` (no key is defined twice; the `||` could never take the left side). Keys stay next to their view. (B4)
- `model.js`: removed `HEADS` import and the unbound heads-up render values `headsSw`, `headsOpen`, `headsOk`, `headsX`, `headsReply` (no template/rail/test binding; `agent-adapter.ts` only assigns `out.headsOk`). Removed the unreachable `n === "heads"` branch in `preset` (the first line of `preset` already maps `"heads"` to `"home"`). (A5)
- `model.js`: dead locals/params: `pnIni(p, num)` → `pnIni(p)`; `var nm` in voicemail `add`; `var loc` in inbox compose `close`; `calMatch(list, t, api)` → `calMatch(list, t)` (3 callers); `var total` in `mapsNavTick`; `L.slice(0, 0).concat(` → `[].concat(`. (A7)
- `model.js`: identical-branch ternary `joinNext ? X : X` and its predicate removed. (NEW-IDENTICAL-TERNARY)
- `model.js`: unbound output fields removed: phone `clearKey`, calendar `noop`, workflows `noop`, notes `common.pinIcon/pinCss`, notes list `emptyMessage`, voice note `actCount`, `calIcon/calLabel/calText`, settings `persona` (+ its local), `openChar`, `scrollFix`. (A7, NEW-UNBOUND-VALUES)
- `model.js`: `formatTime` aliases `inboxClock`, `mapsClock` inlined; unused `notesNowLabel` deleted; `wfAmpm` (alias of `formatHours`) inlined; unused `ST_TOP` deleted. (D4, A7)
- `model.js`: impossible-state guards removed: `api.now == null ? Date.now() : api.now` (twice; `api(k)` always sets `now`), `(api.S && api.S.stack)`, `typeof pnRel/pnFmt === "function"` (4×), `typeof PN !== "undefined"` (2×), `VIEWS.files/notes/browser` existence checks (all registered unconditionally; dead `else` toasts removed), `(api.get("files") || {})` (vget always returns an object). (B4)
- `model.js`: try/catch removed around code that cannot throw: browser scroll reset timer, `brNoScroll`, `stUnscroll`, `stNoScroll`, `searchRef` `el.focus()` (2×). Kept the `setPointerCapture`, `requestFullscreen`, `focus/select` and `brPos` catches. (B1)
- `model.js`: duplicated handler bodies collapsed: notes checklist `addItem`/`newKey`, notes folder `createFolder`/`folderNameKey`, files `saveRn`/`rnKey` now share one local function each. (C3)
- `model.js`: `copy(view)` drops the `COPY &&` guard (both fixture modules export an object). "MVP-DEFERRED … restore" comments (4×) rewritten as present-tense rules. (B4, A8)
- `model.js`: issue-number comments `(#411)`, `(#416)`, `(#417)` removed, sentences kept. (A8)

## Deleted tests and formal artefacts

None.

## Pins left broken

None (all 45 Quint manifest symbol pins on model.js still match; text anchors of the slicing harnesses unchanged).

## Skipped

- `BR_START || {}`, `MAPS_SAVED || {}` (p1 #28): report is wrong, `fixtures.empty.js` exports `null` for both.
- Notes voice `bars`/`NOTES_WAVE` (p2 #7): `voice-adapter.ts:1189` reads `vo.bars`; not dead.
- Notes `toCal` (p2 #7): adapters and `test/browser/helpers/note-schedule-contract.ts` call `toCal`.
- `DAYS`/`MONS` aliases (p1 #7): `specs/quint/refinement/application/calendar-form-controls.mjs` transplants the month panel and injects `DAYS`/`MONS` by name.
- Heads-up `showHeads`, `headsDone`, its timers, `fireHeads` and the `heads` state field (p2 #4): `shell-core-fixture.mjs` slices up to `\n  showHeads() {`; `fireHeads` is bound in `development-rail.html` (dev surface, other owner); `fixtures.js` `HEADS` export is now unused there (owner of fixtures.js).
- Files `pv.sum/saveSum`, `fd.sortLabel/toggleSort`, other files scaffold keys (p2 #30/#31): Q-UI-30 Open (upstream files adapter contract).
- `try { api.set / api.setView } catch` toasts (p1 #25, p2 #17): Q-UI-27 Open.
- Fixture simulator move/delete (p1 #14-#20, p2 #2/#3/#26/#27/#31/#32/#33, Settings add-account flow): Q-DEV-1 Open; moves are stage F.
- Notes legacy branches (p2 #9): `moveNoteToTrash`/`notesFolders` branches already removed by A2.
- Calendar `meet.lumen.example` link (p1 #23): Q-CAL-7 Open.
- Render side effects → `incoming` (p1 #21), module globals → per-shell state (p1 #22), people/time/find helper consolidation (p1 #8/#10/#11/#12, p2 #18/#19), inline-CSS → classes (p1 #37, p2 #20), splitting (p1 #40, p2 #42), formatter (p1 #38): cross-file or stage F, or `PN`/`CAL_PENDING` are Quint/test pins.
- Dev-rail values (p2 #5), simulated shade (p2 #38/#39): Q-DEV-9 / cross-file with `development-rail.html`.
- `typeof document/ResizeObserver` (p2 #16): Node transplant tests still run that code.
- Browser `onLeave` `(api && api.st) || {}` guard: `test/quint-fixture-busy-latch.test.mjs` pins that exact line text.
- `NOTES_RED` (unused): deleting it leaves `--alpha-notes-red` unused and fails `test/theme-palette.test.mjs`; delete together with the token in `alpha-product-registration.ts`.
- `bars` hoist in `renderVals` (p2 #6): changes array identity per render; perf only.
- `mockAttentionRows` shim (p1 #39): other files (`mock-attention.ts`, `data-adapter.ts`).
- IC unused keys / duplicate paths (p1 #5/#6): `icon-catalog.json` (other owner) is keyed by the same names.

## Verification

- `npx esbuild apps/app/src/prototype/model.js`: parses.
- `npx tsc --noEmit -p .`: exit 0 (whole project at the time of the run).
- Quint manifest symbol pins on model.js (same regex as `scripts/quint-lib.ts`): 45/45 present.
- Text-anchor diff (every string literal in test/specs/scripts files that mention model.js and occurs in model.js, before vs after): no anchor lost through my edits (the only differences come from test files other implementers changed).
- `node --test` over the 24 host tests that mention model.js: 142/143 pass. The one failure (`restored-history-limits.test.mjs`, `isRecord is not defined`) transplants `runtime/connection-ui.tsx` (another owner's file); the baseline run before my edits failed in `notes-recorder-controls.test.mjs` for a similar other-owner reason, which now passes.
- Quint application refinement harnesses run individually: `checkCalendarFormControls`, `checkSettingsPageFocus`, `checkVoiceTranscriptFollow` passed with inputs unchanged. `checkAccessibleToastLifetime`, `shellNavigation`, `developmentSurfaces`, `developmentDevice`, `filesTree` aborted with "input changed during checking" (other implementers editing shared inputs concurrently); `checkCameraPreviewRetirement` and `checkCanonicalCalendarEditorClose` timed out starting their browser page. Not conclusive; rerun in stage D.
- The full `npm run quint:refinement` cannot start: `loadModels` fails on a missing symbol in `files-index.ts` (another owner).
- Not run: `npm run verify`, build, bundle audit, Playwright, Android build.
