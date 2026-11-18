# scripts/owner/forged-branch-scan.ts
- Lines: 126 | Kind: one-off owner incident tool (#658: scan every remote branch/tag for forged-commit markers without checkout) | Verdict: DELETE (after the owner confirms #658 is closed)
- Covers: ls-remote heads/tags; ancestry to forged commits; marker paths (`init`, `.env`, `.vscode/*`, fonts dir, `.orc`); `node init` package scripts; content patterns in package.json/tasks/root configs. Duplicates: `merge-review.ts` applies the same IOC markers to one merge diff (`markerPatterns`, `forgedMarkers`); local `git` wrapper is one of 17 (`merge-review.ts:148`, `emulator-campaign-check.ts`). Callers/importers: only `test/owner-incident-response.test.mjs` (imports `contentMarkers`, `initScripts`, `parseLsRemote`, `pathMarkers`, `scanExitCode`, `scanHead`). No npm script, workflow, or other script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Incident forensics run by hand during incident response; kept alive only by a test in `npm test`. | Delete with its IOC file, its test cases and the other incident tools. | Low |
| 2 | 31-35 | C3 | Local `git` spawn wrapper. | n/a after delete. | — |
| 3 | 98-124 | — | Read-only and well-scoped; if the owner wants a reusable "scan remote for marker files" tool, it should take the IOC file as an argument rather than a committed incident file. | Owner choice. | — |

## Proposed end state
Deleted. No product, build or CI behaviour loses coverage. If kept, move to an owner/security repository with its IOC data.
