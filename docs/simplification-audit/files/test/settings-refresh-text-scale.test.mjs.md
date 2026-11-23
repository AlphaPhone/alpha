# test/settings-refresh-text-scale.test.mjs
- Lines: 99 | Kind: transplant (slices `refresh()` and `showTextScale` and `textScaleSettlement` out of `apps/app/src/prototype/settings-adapter.ts` by text, strips types, runs in `vm` with ~25 fake globals) | Verdict: DELETE (carry 2 cases to `journeys/settings.spec.ts`)
- Covers: Text-size writes and overlapping native device-fact reads: unrelated facts survive, the newest write wins, a failed write rereads facts and shows "Text size could not be saved." Duplicates: `test/browser/settings-device-facts.spec.ts:101` ("a text-size choice does not discard a held initial native facts read") covers case 1; `settings-text-scale-refresh` and `settings-text-scale-settlement` slice the same code. Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11, 28-30 | T2/D7 | Cut points `  async function refresh() {`, `  p.componentDidMount =`, `/** Device facts after a read.` pin comment text and indentation in the adapter. | Delete. | Low |
| 2 | 17-27 | T3 | Hand-stubs every Settings dependency (`device`, `system`, `notifications`, `photoLibrary`, `connectionController`...). | Delete. | Low |
| 3 | 57-99 | T2 | Overlapping writes and failed-write recovery have no browser case. | Carry: (a) two quick text-size changes, the later held then released first, show the later size; (b) a refused write shows the notice and keeps battery/model facts. | Med |

## Proposed end state
File deleted. `journeys/settings.spec.ts` gets the two cases above, driving the real Display page with the native fake for
`AlphaDevice.setTextScale`/`snapshot` returning held promises (same helper `settings-device-facts.spec.ts` already uses).
