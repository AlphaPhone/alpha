# specs/quint/refinement/application/cloud-connection-notices.md
- Lines: 27 | Kind: model/harness prose | Verdict: KEEP (trim)
- Covers: describes `CloudConnectionNotices` (plan and sign-in-expiry notices stack). Callers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-8 | A8 | First paragraph narrates the earlier overlapping-layout bug ("In the mounted baseline ... they had the same position"). | Delete; describe current behaviour only. | L |

## Proposed end state
Two short paragraphs: the stacked-notice rule and what the Chromium replay drives.
