# apps/app/src/runtime/mail-sender-image.ts
- Lines: 12 | Role: maps a sender email domain to a bundled decorative icon (`/icons/senders/<domain>.png`), skipping shared personal-mail providers and reserved TLDs. | Verdict: KEEP
- Importers: 1 (`prototype/inbox-cloud-adapter.ts`). Text/path pins: `scripts/inbox-adapter-fixture.ts:5`, `test/mail-sender-image.test.mjs:3`, `test/support/feature-parity.mjs:551`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C6 | The 14 brand domains are listed here and again in `apps/app/public/icons/senders/sources.json` (`icons[].domain`) next to the 14 PNGs; adding an icon needs both edits. | Import the list from `sources.json` (`import senders from '../../public/icons/senders/sources.json'`, map `.domain`) or keep the array and add a build-time check. | Low; bundle includes the small JSON. |
| 2 | 8 | — | Shared-provider list is policy; keep. | Keep. | — |

## Local types and helpers
None beyond the inline brand list (twin: `public/icons/senders/sources.json`).

## Proposed end state
~10 lines with the brand list derived from `sources.json`; output paths unchanged.

## Verification
Inbox list Playwright journey with a known brand sender; `test/mail-sender-image.test.mjs` if kept.
