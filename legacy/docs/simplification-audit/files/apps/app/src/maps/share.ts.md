# apps/app/src/maps/share.ts
- Lines: 8 | Role: re-exports upstream `placeShare`/`routeShare` and opens Alpha's share panel for a map share, resolving `'shared' | 'copied' | 'closed'` | Verdict: SIMPLIFY
- Importers: 1 app (prototype/maps-adapter.ts:10). test/cloud-maps-session.test.mjs:87 bundles it with stubs keyed on the specifiers `'../runtime/share-panel'` and `'../runtime/text-share'`; test/browser/maps-share-layout.spec.ts:5 imports it in-page.
- Text/path pins: test/cloud-maps-session.test.mjs:87-90 (import specifiers must stay as written); test/support/feature-parity.mjs:332.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | D8 | Two lines of ~240 and ~430 characters holding six statements, an inline options object and a `.then(async()=>copied?await copied.then(...):...)` chain | One statement per line: build `snapshot`, build `options`, `await openSharePanel(options)`, then `return copied ? copied.then(() => 'copied', () => 'closed') : 'closed'` (make the function `async`) | Low; the 'Copy link resolves copied only after the copy settles' test pins the ordering, which this keeps |
| 2 | 4 | D4 | `export { placeShare, routeShare, type MapShare } from '.../share.ts'` — pass-through of upstream names; maps-adapter could import them from upstream directly | Drop the re-export; maps-adapter imports `placeShare`/`routeShare` via the alias | Low |
| 3 | 7 | C5 | The same `openSharePanel({title, current, external: () => shareSelectedText(snapshot), email: ..., copy: () => copySelectedText(...)})` wiring is written three times: here, prototype/notes-share-adapter.ts:13, prototype/share-panel-adapter.ts:23,32 | Add `shareTextSnapshot(snapshot, {current, copyText, copyLabel, onError})` to runtime/text-share.ts (or share-panel.ts) and call it from all three | Medium: each site has its own toast/error policy — pass them as options |
| 4 | 6 | B4 | `Object.freeze({title,text})` on a local object that never escapes beyond the callbacks below | Drop the freeze | None |
| 5 | 1-3 | D13 | deep relative import | alias | Low |

User-visible copy to keep: `'Copy link'`, `'Copy text'`.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `shareMap` | helper | 5-8 | notes-share-adapter.ts:12-13 `share`, share-panel-adapter.ts:23,32 (same panel wiring) | thin wrapper over a shared `shareTextSnapshot` in runtime/text-share.ts |

## Proposed end state
~10 short lines: one `async function shareMap(data, signal)` that builds the snapshot and delegates to the shared helper; no re-export of upstream names.

## Verification
test/cloud-maps-session.test.mjs (share cases), test/browser/maps-share-layout.spec.ts; notes and calendar share specs if the shared helper lands; `npm run verify`.
