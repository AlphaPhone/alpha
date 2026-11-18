# test/digest-delegation-host.test.mjs
- Lines: 14 | Kind: source-text (regex over `hosted-live-source-ui.tsx` and `hosted-digest-ui.tsx`) | Verdict: DELETE
- Covers: `CloudDelegationPanel` mounts only on Android, and billing is one line in the schedule review. Duplicates: `test/browser/dev-digest-delegation.spec.ts` drives the browser delegation branch. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-11 | T1 | Pins the import line, a JSX ternary and a match count. | Delete. If the browser-host rule matters, a production-project journey asserts the panel is absent (no secure-slot error toast) on web. | Low. |
| 2 | 12-14 | T1 | Pins copy layout of the billing line with a regex over JSX. | Delete. | None. |
| 3 | whole | owner | Cloud read delegation is under question in other reports (Q-HOST-5); if retired, nothing replaces this. | - | - |

## Proposed end state
Deleted.
