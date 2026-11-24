# test/agent-action-preferences.test.mjs
- Lines: 37 | Kind: unit (real `DeviceActions` via `fixtures/device-action-policy.mjs`, approve stubbed) + one transplant (lines 13) + one constant check (line 15) | Verdict: MERGE lines 8-12, 17-37 into `test/integration/device-actions.test.mjs`; DELETE lines 13 and 15
- Covers: which agent proposals may run directly (current request only, ask-first respected, recheck per action, uncertain outcome stops batch, protected types stay pending, four-action cap, navigation-only cards never auto-run). Duplicates: `test/direct-browser-grounding.test.mjs`, `test/browser-request-refusal.test.mjs` use the same fixture for neighbouring rules. Callers/importers: `npm test` glob; imports `scripts/native-view-policy.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | T2 | Slices `browser/device-preferences.ts` between markers, strips types, runs in `vm`. Also asserts "persists old preferences compatibly". | Delete; default preferences are visible in the Settings journey. | Low |
| 2 | 15 | T1-like | Asserts the content of a JSON constant from `scripts/native-view-policy.ts`. | Delete. | Low |
| 3 | 8-12, 17-37 | T3 | Policy matrix on the real class with `approve` replaced; this is the safety rule for direct agent actions. | Keep as cases of the device-actions integration file (real journal in memory, real approve path to a fake native port). | Medium if dropped |
| 4 | 8-37 | D8 | One-line tests hundreds of characters wide. | Reformat on move. | - |

## Proposed end state
Gone as a file. `test/integration/device-actions.test.mjs` holds one table-driven case per rule (current request only;
ask-first; per-action recheck; uncertain stops; protected types pending; reversible types run, capped at four; navigation
cards never run), sharing one fixture with `action-message-presentation` receipts, `browser-request-refusal` and
`direct-browser-grounding`.
