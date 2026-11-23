# test/browser/accessibility-resilience.spec.ts
- Lines: 761 | Kind: Playwright regression specs (`chromium`, dev server, mostly `?mode=mock&start=` fixture deep links), 52 tests | Verdict: **MERGE**, splitting each block into the journey for its area
- Covers: specific defects the sweep found, now fixed. Camera and Maps controls stay reachable in landscape and at 200% text; menus and sheets over a scrim own focus and return it on Escape; the toast is a polite live region; dialog toasts sit on top of modals; Home dock clearance at 100–300% text; focus never lands under the dock; screen titles stay whole at 200%; the recovery screen takes focus. Duplicates: `subview-accessibility`, `remaining-subview-accessibility`, `photo-delete-accessibility` and `files-dialog-accessibility` overlap the "menus and sheets own focus" block. `home-compact-scroll` and `large-text-overlap` overlap the Home dock clearance block. The `obscured-by-dock` and `focus-obscured` sweep rules cover lines 448-473 and 520-553 generically. Importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 186, 337, 640 | A1 / D1 | It uses `openLegacyNotes` and `openLegacyAttachment` (the "Older notes" source), which is deleted under D1 / A2. It feeds four tests: the note-share focus case, render failure under a modal, and all three "toast while a top-layer dialog is open" tests. | Re-base the note share case on `openCanonicalNotes` (already imported on line 5). Re-base the modal-dialog cases on any surviving modal `<dialog>`, for example the Files `Move to` sheet or the canonical note source dialog. | High. These tests break when the legacy notes stack is deleted. |
| 2 | 392-438 | C3 / T4 | `homeUnderDock` and `readingOrderProblems` copy the clipped-box walk and a simplified TalkBack order that `accessibility-audit.ts` already provides (`auditPage({dock})` and `auditReadingOrder`). Line 460 already runs `auditPage({dock:true})` alongside them. | Use `auditPage({dock:true})` and `auditReadingOrder` only, and delete both local copies. | Low |
| 3 | 448-473 | cost / T4 | 2 shells × 4 scales = 8 tests, each audited at three scroll positions. The sweep already runs `dock` at 100/200/300% for Home in both shells. What is unique here is the "last tile above the bar at every scroll fraction" check. | Keep one test per shell that loops over the scales `[1, 2, 3]` (1.5 adds nothing that 1 and 2 do not). | Low |
| 4 | 629-636, 745-751 | T6 | It walks React fibres (`__reactFiber$` → `stateNode.toast`) to raise a toast. This is a backdoor into shell internals. | Raise the toast through a user action that produces one (for example deleting a file, then Undo, as on line 141), or through a dev-only `window.__alphaDev.toast` hook behind the `dev/` boundary (D6). | Medium. It breaks when `model.js` is split (D1 god module). |
| 5 | 318 | T6 | `import('/src/runtime/error-boundary.tsx')` → `showRecoveryScreen` is called from the page. The `alpha:force-render-error` event used on line 342 is the supported trigger for the render path. | Keep the startup case for now: there is no user path to a startup failure in a live page. List it as a dev hook. | Low |
| 6 | 25-53, 296-311 | T4 | Camera landscape (live + mock) and the photo editor in landscape overlap the sweep's landscape lane. What is unique here is the viewfinder size, the side-by-side layout, keyboard operation of mode and filter, and the return to portrait. | Merge into `journeys/camera-photos.spec.ts` as `landscape`. Keep the unique assertions and drop the `reachable` loops that the sweep repeats. | Low |
| 7 | 40, 70, 82, 376 | T5 | `page.screenshot({path: info.outputPath(...)})` writes evidence that nothing reads (B5). | Delete. | none |
| 8 | 162-263 | T4 | The table of ten popups that own focus. `subview-accessibility.spec.ts` and `remaining-subview-accessibility.spec.ts` (other chunks) test the same inert-page and Escape-returns-focus contract. | Make this table the single owner: move it into `journeys/accessibility.spec.ts` (`popups own focus`) and fold the other two specs into it. | Low |
| 9 | 11 | C6 | Inline `offline` seed. | Harness `connection: 'offline'`. | none |
| 10 | 93-101, 734-739 | T1-adjacent | "No find bar until opened" and "Home offers no notifications control" are absence checks with no interaction after the first view. They are cheap, but each guards against one removed control. | Fold into `journeys/browser.spec.ts` and `journeys/home-shell.spec.ts` as one assertion each, rather than separate tests. | none |
| 11 | 475-495 | D8 | Minified style (`async({page})=>{…}` on one line). | Reformat when moving (D9 Prettier). | none |

## Proposed end state
Split by area into journeys:
- `journeys/accessibility.spec.ts`: popups own focus (table), toast live regions, dialog toast (re-based off legacy notes), recovery screen.
- `journeys/home-shell.spec.ts`: dock clearance per shell over the scales, landscape Home, status-line clearance, focus above the dock in Settings, tap beside the dock.
- `journeys/camera-photos.spec.ts`: camera and photo editor in landscape.
- `journeys/maps.spec.ts`: directions and search at 200% and in landscape.
- `journeys/settings.spec.ts` and `journeys/notes.spec.ts`: title wholeness and the note editor header.

Local copies of the audit geometry are deleted. Fibre-walking toast raises are replaced by a user action or a dev hook. About 52 tests become about 30.
