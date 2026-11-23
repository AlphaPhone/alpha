# scripts/test-mobile-workflow-bundle.ts
- Lines: 56 | Kind: integration (copies the real `dist-mobile` agent bundle, stages the authenticated workflow worker, boots it under Bun, observes the workflow route registration) | Verdict: KEEP, MOVE to `test/resident/mobile-workflow-bundle.test.ts` (keep npm alias)
- Covers: the packaged mobile agent bundle registers `@elizaos/plugin-workflow` routes without a source checkout. Duplicates: none. Callers/importers: `package.json` `agent:test-mobile-workflow-bundle`; `.github/workflows/resident-android.yml:329` (`mobile-bundle` phase).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 51, 55 | B5 | Child prints `ALPHA_MOBILE_WORKFLOW_BUNDLE {...}` with constant booleans (`fullRuntimeReadiness:false`, `nativeExecution:false`), parent re-prints it. | Exit code is the result; print only the route count. | None |
| 2 | 25-29 | B3 | Re-validates the bundle manifest's own extension file names and `expectedAt` shape. | Keep the copy, drop the regex asserts (the bundle build owns the format). | Low |
| 3 | 37-51 | D8 | Program as a template string. | Move to `test/resident/fixtures/workflow-bundle-probe.mjs` and pass paths as args. | None |

## Proposed end state
~40 lines in `test/resident/`, same CI phase, no evidence JSON line.
