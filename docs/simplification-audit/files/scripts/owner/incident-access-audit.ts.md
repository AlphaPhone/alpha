# scripts/owner/incident-access-audit.ts
- Lines: 156 | Kind: one-off owner incident tool (#658 step 2: who can still write to the affected repositories) | Verdict: DELETE (after the owner confirms #658 is closed)
- Covers: per repo, the actor's permission, outside collaborators, invitations, deploy keys, webhooks (host only); per org, membership, installations, audit-log action counts. Duplicates: none in the repo (the CI exposure tool reads different endpoints). Callers/importers: only `test/owner-incident-response.test.mjs` (`actorPermission`, `actorHasAccess`, `grantsAccess`, `hookRow`, `hostOf`, `keyRow`, `summarizeAudit`, `auditRepository`). No npm script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Forensic tool for one incident across 26 repositories, most of them not this product; only its unit test runs it. | Delete with the IOC file and the test. | Low |
| 2 | 36-38 | B1 | `catch { return '(unparseable)' }` in `hostOf`: specified fallback for a display value; fine while it exists. | n/a. | — |

## Proposed end state
Deleted. Organisation access auditing is an owner/security task outside this product repository; git history keeps the tool.
