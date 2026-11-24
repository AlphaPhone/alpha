# test/agent-camera-capture.test.mjs
- Lines: 5 | Kind: tooling wrapper (`runChildSuite('test-agent-camera-flow.ts')`; the script slices `prototype/camera-adapter.ts` and the generated `plugin-native-camera` sources by text markers) | Verdict: DELETE (wrapper and `scripts/test-agent-camera-flow.ts`)
- Covers: an agent-requested camera capture uses the existing adapter and action journal without replay. Duplicates: `test/browser/agent-camera-capture.spec.ts` (same name; four modes `capture`, `lost-ack`, `old-message`, `ask-first` through the real shell, journal and adapter with a synthetic bridge). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | T9 | Wrapper around a child script. | Delete. | None |
| 2 | script 11-20 | T2 | The script slices `camera-adapter.ts` at eight text markers and strips the shared camera session out of `.eliza`. | Delete. | None |
| 3 | - | T4 | The Playwright spec already drives the same journey through the real UI. | Keep the spec (to become part of `journeys/camera-photos.spec.ts`). | Low |

## Proposed end state
Both files deleted. Camera capture by agent request is covered by the browser journey (planned
`journeys/camera-photos.spec.ts`, absorbing `agent-camera-capture.spec.ts`).
