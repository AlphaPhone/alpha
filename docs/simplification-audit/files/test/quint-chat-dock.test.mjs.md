# test/quint-chat-dock.test.mjs
- Lines: 42 | Kind: Quint replay harness inside the test (ChatDock simulator traces) + transplant (type-strips the `// chat-release:begin/end` region of `chat-overlay-motion-adapter.ts` into a `data:` module) + one source regex | Verdict: PORT: import `chatRelease`, move to `specs/quint/refinement/application/chat-dock.mjs`, register in `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: every settled drag in ChatDock traces takes the detent `chatRelease` decides, and remembered height follows the model, on a roomy and a short screen. Duplicates: `test/chat-release.test.mjs` (unit cases of `chatRelease`), `test/browser/full-chat-grabber.spec.ts` (pointer capture in a page). Callers/importers: `npm test` glob only; not in any family aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | T2/T10 | Slices the marker region although `chatRelease` is already `export`ed (`chat-overlay-motion-adapter.ts:153`). | `import {chatRelease}`; delete the `chat-release:*` markers once `test/chat-release.test.mjs` is gone too. | Low |
| 2 | 16 | T1 | Regex pins the adapter's release statement `chat: next.chat === "hidden" && !collapsed ? this.rest() : next.chat,`. | Delete; the browser spec covers the adapter wiring. | Low |
| 3 | 21-42 | keep | 500 traces x 60 steps checked against the real decision function. | Keep in the driver. | Low |
| 4 | 38-41 | P8 | `seen.size >= 24` and a vocabulary coverage loop. | Drop or keep as one driver assertion. | Low |
| 5 | all | T4 | `test/chat-release.test.mjs` unit cases are redundant once this replay runs on the real export. | Delete `chat-release.test.mjs` (its chunk). | Low |

## Proposed end state
A `chat-dock.mjs` driver that imports `chatRelease` and replays ChatDock traces; one runner entry. No marker region, no regex.
