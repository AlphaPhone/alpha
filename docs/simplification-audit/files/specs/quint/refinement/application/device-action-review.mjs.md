# specs/quint/refinement/application/device-action-review.mjs
- Lines: 161 | Kind: Quint refinement harness (imports the real module with `bundledSource`) | Verdict: KEEP
- Covers: an agent-proposed device action is reviewed against the exact current screen, journaled, dispatched at most once, never replayed from a terminal journal, refused when stale/expired/foreign/ask-first. Duplicates: run twice (per-model `test/quint-device-action-review.test.mjs` and the aggregate via `index.mjs:2`) (T4). Callers/importers: `refinement/application/index.mjs`, `test/quint-device-action-review.test.mjs`.
- Model: `specs/quint/application/DeviceActionReview.qnt`, live (sources `runtime/device-actions.ts`, `runtime/alpha-client.ts`, `browser/device-preferences.ts`; all exist).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 108 | – | Good pattern: `bundledSource('apps/app/src/runtime/device-actions.ts')` imports the real `DeviceActions` class; no source slicing. | Keep; this is the target shape for other harnesses. | – |
| 2 | 5-6, 106-107, 156 | B5 | `captureSources([driver])` + `extraSources` (the test passes its own file path as a "source"). | Drop driver/test self-hashing once receipts go (ci-and-formal §2.8). | Low |
| 3 | 109-155 | B4 | Global `Date.now` monkey-patch restored in `finally`. | Acceptable; or pass a clock port if `DeviceActions` accepts one. | Low |
| 4 | 10-104 | D8 | Dense statement soup (`f.decisions++;record(...)`, 200-char lines). | Format with Prettier (D9). | Low |
| 5 | 128-135 | – | Six stale-context schedules are written inline; readable but repetitive. | Fold into the options table. | Low |

## Proposed end state
Same harness, formatted, without self-hashing. One runner (the per-model test); remove it from the application aggregate
when aggregates are deleted. Lane: `runtime/device-actions.ts`, `alpha-client.ts`, `device-preferences.ts`, the model.
