# test/telephony-presenters.test.mjs
- Lines: 84 | Kind: unit (direct import of pure formatters in `prototype/telephony-presenters.ts`, `prototype/locale-time.ts`) | Verdict: REWRITE card cases into `journeys/telephony.spec.ts`; DELETE the formatter units
- Covers: short time labels, initials, number keys and display numbers, thread titles, call rows, Home Messages and Phone card selection/grouping. Duplicates: `test/browser/aosp-telephony-views.spec.ts` "Home shows one Messages card and one Phone card" (l.16). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-42 | T3 | Formatter units (`shortWhen`, `initials`, `displayNumber`, `clockLength`, `threadTitle`). | Delete; rendered rows in the journey show them. | low |
| 2 | 27-30 | — | `numberKey` keeps `+44 415…` distinct from a US `415…` number: a real correctness rule (wrong contact name on a foreign number). | Carry one journey case: a +44 caller is not labelled with the US contact. | low |
| 3 | 52-84 | — | Card rules: only unread threads, newest first, two rows, none when nothing unread; missed calls grouped per caller, withheld calls not merged, card target recents vs voicemail. | Carry into the Home cards journey with fixture data. | low |

## Proposed end state
File deleted. `journeys/telephony.spec.ts` Home-cards case (AOSP profile, telephony fixture) asserts: unread-only Messages
card with two newest rows, Phone card grouping missed calls by caller plus new voicemail, two withheld calls shown as two
rows, no card when nothing is new, tap target recents vs voicemail, and a +44 number not matched to a US contact.
