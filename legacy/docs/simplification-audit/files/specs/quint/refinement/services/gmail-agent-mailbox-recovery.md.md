# specs/quint/refinement/services/gmail-agent-mailbox-recovery.md
- Lines: 13 | Kind: harness README | Verdict: KEEP, SIMPLIFY
- Covers: describes the GmailAgentMailboxRecovery replay. Duplicates: `assumptions` in `gmail-agent-mailbox-recovery.mjs`. Referenced by nothing (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | B5 | "The 45 traces compare 299 checkpoints" exact counts drift with every scenario change. | Drop counts. | Low |
| 2 | 3-9 | — | Otherwise a clear statement of what is checked and what is out of scope. | Keep. | — |

## Proposed end state
Same text minus counts.
