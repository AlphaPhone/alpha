# test/reminder-capability-negotiation.test.mjs
- Lines: 76 | Kind: integration-ish (real `DeviceActions`, `selectDeviceCapabilities`) + one T1 | Verdict: MERGE into `test/integration/calendar.test.ts`
- Covers: Browser declines device reminder creation; native platforms keep only offered capabilities; an unnegotiated browser reminder proposal cannot reach approval/execution; native creation stays pending review. Duplicates: `test/device-capability-selection.test.mjs` tests `selectDeviceCapabilities`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T9 | Self re-exec under tsx. | – | Low |
| 2 | 40-43 | T1 | Counts `await deviceCapabilities(` occurrences in `connection-ui.tsx` (expects 3). | Delete. | Low |
| 3 | 71-76 | A1? | "legacy reminder compatibility": the agent op `create_reminder` still reaches pending review. That is a wire format from the agent, not stored data, but it is labelled legacy. | Owner question: does the pinned upstream agent still emit `create_reminder`? If not, delete with its presentation branch. | Medium |
| 4 | 25-38 | T4 | Overlaps `device-capability-selection.test.mjs`. | Merge the two capability tables. | Low |

## Proposed end state
- Capability and pending-review cases in the calendar integration file; no source count.
