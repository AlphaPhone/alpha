# apps/app/src/prototype/telephony-review.ts
- Lines: 68 | Role: The on-phone confirmation sheet for agent-proposed calls, texts and contact changes: a module-level pending review, its template values, and the shell hook that renders it and cancels on hide/unmount. | Verdict: SIMPLIFY (small)
- Importers: `apps/app/src/main.tsx:25,185` (`installTelephonyReview`), `apps/app/src/prototype/agent-adapter.ts:26` (`askTelephonyReview`). Template binds `telephonyReview.open/rows/hasBody/body/dismiss` (`template.html:64-72`). Text/path pins: `test/support/feature-parity.mjs:432` only (no dedicated test found by path).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27, 34 | A7 | `export function contactChangeLines`, `export function presentTelephonyReview` — 0 importers outside this file. | Drop `export`. | None |
| 2 | 20 | B2 | `(typeof document !== 'undefined' && document.hidden)` in renderer-only code. | `document.hidden`. | None |
| 3 | 12-15 | C6 | `ICON` path strings are verbatim copies of `IC.phone`, `IC.send`, `IC.check`, `IC.trash` in `model.js:37,41,61,85`. | Return icon *names* and let the template resolve them (research P16), or import `IC` keys. | Low (visual) |
| 4 | 37, 43, 50 | D12 | Inline style values computed in JS (`decoration`, `color: 'var(--mut)'`, `weight`, `bg: 'var(--alpha-call-green)'`). | Return state flags (`struck`, `added`, `tone`) and style via CSS classes. | Low (visual) |
| 5 | 11, 60, 65 | D3 / P6 | Module singleton `pending` + `repaint` closure captures the last mounted shell. | Acceptable for a single shell; keep, or hold on the shell instance. | — |
| 6 | 56-59 | B2 | `mount?.call`, `unmount?.call` on base methods that always exist. | Call directly. | None |
| 7 | 28-31, 49 | C3 | "numbers then emails" line list built twice (`contactChangeLines` and the delete branch). | One `contactLines(record)` helper. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Pending` | type | 10 | the generic "pending" type family (`C1` list) | stays (local) |
| `ICON` | const | 12-15 | `model.js` `IC.phone/send/check/trash` | icon names |
| `contactChangeLines` | helper | 27-32 | — | stays (unexported) |

## Proposed end state
~62 lines: unexported presenters, icon names instead of path data, one contact-lines helper, no `typeof document` guard.

## Verification
No host test targets this file; agent-flow coverage is through `agent-adapter` (`test/sms-agent-flow.test.mjs` and Playwright AOSP telephony specs). Add/keep one Playwright check of the sheet before restyling (#3/#4). Device acceptance for calls/texts is separate.
