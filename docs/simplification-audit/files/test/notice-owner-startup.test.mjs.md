# test/notice-owner-startup.test.mjs
- Lines: 51 | Kind: transplant (type-strips everything above `export function ConnectionChooser()` in `runtime/connection-ui.tsx`, regex-removes `ResidentRecoveryPanel`, runs it in `vm.runInNewContext` with ~40 injected globals) + source-text (lines 44-51) | Verdict: DELETE
- Covers: cold start keeps the notice-owner fence until the connection controller resolves identity; signed-out cold start still starts the resident; a failed start retires the persisted owner without a retry timer; legacy `offline` selection migrates to `resident`. Duplicates: `test/browser/local-agent-availability.spec.ts`, startup specs; the coordinator half duplicates `notice-owner-coordinator.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 20-22 | T2, D7 | Slices `connection-ui.tsx` at `export function ConnectionChooser()` and a regex over `function ResidentRecoveryPanel(`; replaces `import.meta.env`. Blocks the `connection-ui.tsx` split. | Delete. | None |
| 2 | 35-39 | A1 | "retired local-only choice migrates to the resident": migrate-on-read of a stored `{kind:'offline'}` selection that cannot exist on this package (D1). | Delete the case and flag the migration code for deletion. | None |
| 3 | 44-51 | T1 | Three regexes pinning exact formatting of `connection-ui.tsx` and `workflow-adapter.ts`. | Delete. | None |
| 4 | 25-42 | - | Cold-start fence resolves once; failed start retires the owner and schedules no retry. | Rewrite as `journeys/startup-permissions.spec.ts`: cold start with a stored sign-in shows the agent ready only after restoration; a revoked credential lands signed out with no repeating retry notice. | Medium |

## Proposed end state
Deleted. Two startup assertions go to `journeys/startup-permissions.spec.ts` (dev agent-mock harness with a revoked/valid stored credential). The legacy-selection migration is reported as a delete candidate in `connection-ui.tsx`.
