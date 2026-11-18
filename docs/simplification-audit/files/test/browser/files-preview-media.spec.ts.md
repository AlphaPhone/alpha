# test/browser/files-preview-media.spec.ts
- Lines: 64 | Kind: Playwright, chromium. A UI journey; the media is generated in the page (canvas PNG, MediaRecorder WebM, hand-built WAV) and imported through `registerPlugin('AlphaFiles')` (P2) | Verdict: **MERGE into `journeys/files.spec.ts`**
- Covers: Files previews a real image (decoded at its natural width), audio and video (controls shown, paused on open), and leaving with Back pauses and removes the playing element. An unpreviewable Office file offers "Download file" with the exact bytes. Duplicates: `video-*` specs cover the video editor, not the Files preview. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-33 | T7 | Media fixtures are synthesised per run (with a 4 × 100 ms `setTimeout` recording loop, T8). | Use committed tiny fixtures (`test/fixtures/media/{1px.png,silence.wav,short.webm}`) seeded through the harness. | none |
| 2 | 45 | — | `__previousFileMedia` keeps a reference to the element in order to assert it was paused after removal. This is acceptable (it checks a real resource-retirement rule). | Keep. | none |
| 3 | 38 | B5 | A screenshot with no assertion. | Drop it. | none |
| 4 | 54 | P2 | The `.docx` is seeded through `registerPlugin`. | Use the harness seed. | none |

## Proposed end state
A "preview" block in `journeys/files.spec.ts` with two tests: media preview and retire-on-Back, and the exact-bytes
download fallback. It uses committed media fixtures and the harness seed.
