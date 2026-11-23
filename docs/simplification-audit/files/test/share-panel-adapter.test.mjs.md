# test/share-panel-adapter.test.mjs
- Lines: 30 | Kind: transplant (strips `import` lines from `share-panel-adapter.ts`, regex-extracts `unchangedSince` from `share-panel.ts`, stubs five names, imports as `data:`) | Verdict: DELETE
- Covers: The share panel stays current through refresh counters but closes when the selected photo or calendar event changes. Duplicates: `share-panel-watch.test.mjs` (same `unchangedSince`), `test/browser/dev-maps-share.spec.ts`, `maps-share-layout.spec.ts`. Callers/importers: `npm test` glob only; uses `test/fixtures/ts-source.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | T2 | Removes every import line and substitutes stubs by name; regex `^export function unchangedSince[\s\S]*?^}$`. | Delete. | Low |
| 2 | 9-14 | T3 | Fake `Shell` class with `S`, `vget`, `api`. | Delete. | Low |

## Proposed end state
File deleted. One case in `journeys/camera-photos.spec.ts`: open Share on a photo, change the selection, the panel closes.
