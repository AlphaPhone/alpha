# android/video-fixture/src/main/assets/qa-source.json
- Lines: 42 | Role: description of the generated `qa-source.mp4` (size, sha256, quadrant colours, tones, expected edit) | Verdict: DELETE
- Importers: none (grep `qa-source.json`: 0 hits outside docs). Its `sourceClasses` name `android/app/src/main/java/ai/alphacompute/alphaphone/VideoCopyEdits.java` and `VideoEditSpec.java`, which no longer exist (the editor moved upstream to `ai.eliza.plugins.media`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-42 | B5 / A8 | Unread provenance with stale paths (`"sourceClasses": ["android/app/src/main/java/…/VideoCopyEdits.java", …]`). | Delete with the module. When `qa-source.mp4` moves to `test/fixtures/`, keep at most a one-line note of the ffmpeg generation in the spec that reads it. | None |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`git grep qa-source.json` empty.
