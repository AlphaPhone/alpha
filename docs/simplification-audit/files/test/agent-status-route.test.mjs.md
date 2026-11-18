# test/agent-status-route.test.mjs
- Lines: 30 | Kind: transplant (slices `prototype/workflow-authoring.ts` from `type AgentStatusShell =`, prepends imports, esbuild-bundles it with three inline stub modules) | Verdict: DELETE; REWRITE as one case in `journeys/settings.spec.ts`
- Covers: tapping "agent unavailable" on product Android opens Settings > Agent connection (Back returns to the caller); dev/browser builds open the connection chooser. Duplicates: none found in Playwright (grep `agent-connection`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | T2 | Cuts the file at a type-name marker and replaces three imports with stubs; any reordering breaks it. | Delete. | Low |
| 2 | 8 | D5 | Stubs `Capacitor.isNativePlatform` and `testMocksEnabled` to fake the product build. | Use the production Playwright project with a native bridge stub. | - |

## Proposed end state
File deleted. One case in `journeys/settings.spec.ts` (production project, Android bridge stub): with the agent stopped, tap the
status chip in Workflows, expect Settings > Agent connection, press Back, expect Workflows.
