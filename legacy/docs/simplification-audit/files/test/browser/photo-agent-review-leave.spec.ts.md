# test/browser/photo-agent-review-leave.spec.ts
- Lines: 21 | Kind: Playwright, chromium; seeds a photo via `/src/prototype/browser-camera.ts` and calls `deviceLibraryAgent().runView()` from `/src/prototype/photo-library-adapter.ts` in page | Verdict: MERGE into `journeys/camera-photos.spec.ts` (agent review section), one case
- Covers: an agent share or album-create review belongs to the Photos visit that opened it; while open it refuses another agent operation; leaving Photos ends it so it neither reappears nor blocks the next one. Duplicates: none found. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | T6 | The agent tool call is made by importing `deviceLibraryAgent` and calling `runView` directly. | Drive it through chat with the harness agent stub emitting a `photos_share` tool call, if the stub supports view operations; otherwise keep this single import as the documented agent boundary. | Medium. |
| 2 | 6 | T6 | Photo seeded through `importBrowserPhoto` (same seed in 8 Photos specs). | One harness `seedPhoto(page, {color,width,height})` helper. | None. |
| 3 | 8 | T7 | share and album variants exercise the same review ownership. | Keep `share` only. | Low. |

## Proposed end state
One case in the Photos journey: agent opens a share review, a second agent operation is refused with "Finish the open review first.", Back to Home and reopening Photos shows no review and the next operation opens. Shared `seedPhoto` helper.
