# test/browser/photo-permitted-batch.spec.ts
- Lines: 82 | Kind: Playwright, chromium; UI batch favorite over `helpers/photos-bridge` with an extra `AlphaPhotos.changeMany` handler; wraps `Component.prototype.renderVals`/`toast` to capture the shell and toasts | Verdict: MERGE into `journeys/camera-photos.spec.ts` (native batch section), 9 tests → 3
- Covers: native batch changes are sent in reviewed chunks of 500 covering every selected id in order; declining a chunk stops later chunks; leaving Photos or revoking access mid-batch stops later chunks and stale results; an unknown outcome reports uncertainty ("501 favorited · 500 not confirmed") and is not replayed. Duplicates: `photo-batch.spec.ts` (browser store batch and decline), `permitted-photos.spec.ts` (revocation). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18, 55, 68 | T6, D2 | Wraps `Component.prototype.renderVals` to capture the shell for `shell.goHome()`, and `Component.prototype.toast` to record toasts. | Press Home through the UI; assert toast text on screen (already asserted at l.66). | None. |
| 2 | 38-46 | T7 | Three sizes (500/501/1001) for one chunking rule. | 1001 only (shows 500,500,1 and order). | None. |
| 3 | 47-51 | T7 | Decline at chunk 1 and 2. | Chunk 2 only. | None. |
| 4 | 63-72 | T7 | Unknown outcome at 500 and 1001. | 1001 only. | Low. |
| 5 | 52-61, 73-82 | T4 | Leave-Photos and permission-retirement both hold chunk 1 and assert no later request. | One parametrised case over {Home, revocation}. | None. |
| 6 | 11 | T7 | Adds a plugin method by mutating `PluginHeaders`. | Typed bridge handler. | Low. |

## Proposed end state
Three cases: (1) 1001 items go out as 500/500/1 in selection order and report "1001 favorited"; (2) decline at chunk 2 or an unknown outcome at chunk 1 stops/never replays and reports the uncertain count; (3) Home or revocation during held chunk 1 sends nothing more and shows no stale result. Uses `helpers/photos-bridge`; no prototype patches.
