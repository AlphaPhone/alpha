# specs/quint/refinement/application/camera-preview-retirement.md
- Lines: 24 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CameraPreviewRetirement` and its Chromium replay. Duplicates: the "how to run" block duplicates the test file name. Callers: none (documentation).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | B5 | Exact counts ("Three mounted Chromium schedules and 33 checkpoints") go stale on every schedule change. | Drop counts. | L |
| 2 | 19-20 | A8 | "The historical CameraSession model is unchanged" is a history note. | Delete the sentence. | L |
| 3 | 22-24 | — | Run command names `test/camera-rapid-leave.test.mjs` too; both exist today. | Keep, or replace with "run its `test/quint-*.test.mjs`". | L |

## Proposed end state
One paragraph: what the model states, what the replay drives (mounted Camera + Home in Chromium via the shared camera preview port), what is out of scope.
