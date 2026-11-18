# test/use-in-email-review.test.mjs
- Lines: 225 | Kind: transplant via `test/fixtures/use-in-email-review.mjs` (reads `prototype/use-in-email-review.ts` and upstream `plugin-inbox/src/mailbox/use-in-email.ts`, strips imports and `export` by regex, evals in `vm` with a stub shell and stub Inbox) | Verdict: REWRITE as cases in `journeys/inbox.spec.ts`
- Covers: MVP-14 "Use in email": only finished plain replies over Inbox offer it; the review names account, destination and attachment policy; append-only into a non-empty draft; a changed destination/agent/Cloud account/chooser/hidden app refuses the insert; locking ends the review; too-long replies and drafts without room are blocked; nothing is ever sent. Duplicates: `test/browser/use-in-email.spec.ts` (fills the draft and never sends, other agent session refused, system Back cancels, set-aside draft wording, account-own message names no recipient) and `use-in-email.production.spec.ts`; `file-email.spec.ts`. Callers/importers: `npm test`. The fixture is also imported by `specs/quint/refinement/application/email-suggestion-review.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T2 | All 17 tests run a regex-rewritten copy of two modules, one of them upstream. | Delete; the journey drives the real build. | none |
| 2 | 205-225 | T5, T1 | `describeEmailTarget` wording lives in the upstream shared mailbox module; these are upstream wording units. | Keep only wording visible in a journey (set-aside draft, display-name spoofing: literal address leads). | low |
| 3 | 11-35, 74-79, 132-157 | T4 | Offer/review/cancel/other-session cases overlap `use-in-email.spec.ts`. | Drop duplicates. | none |
| 4 | 46-65, 175-203 | — | Changed destination then confirm against the refreshed one; Cloud account change; reply longer than draft; draft without room blocks rather than truncates. | Carry into the journey. | low |
| 5 | 159-173 | — | Locking the phone ends the review; unlocking does not restore it. | Carry. | low |
| 6 | 81-102 | — | Stale-callback races (retired review confirm, double confirm). | Not reliably drivable in Playwright; covered by the Quint `email-suggestion-review` model once its harness imports the real module. | medium |

## Proposed end state
File deleted; `use-in-email.spec.ts` (+ production twin) merges into `journeys/inbox.spec.ts` with these extra cases:
destination changed → "Changed" then confirm into the refreshed draft; Cloud account change; append says nothing is
replaced; too-long reply and no-room draft blocked; lock ends the review; spoofed display name shows the literal address.
The fixture survives only until `specs/quint/refinement/application/email-suggestion-review.mjs` is ported to import
`use-in-email-review.ts` (`installUseInEmailReview` is already exported from it and `describeEmailTarget` from the upstream mailbox module; the fixture strips `export` only to eval).
