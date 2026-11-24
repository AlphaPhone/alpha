# apps/app/src/prototype/calendar-availability-review.ts
- Lines: 50 | Role: Two owner reviews for an agent availability check: choose which on-phone calendars may be read (nothing preselected), then confirm the exact free/busy answer before it is shared. | Verdict: SIMPLIFY (small)
- Importers: 1 — `apps/app/src/prototype/agent-adapter.ts` (uses `availabilityReview`).
- Text/path pins: `test/support/feature-parity.mjs:349` only. Behaviour covered by `test/browser/calendar-availability.spec.ts` (through the agent action) and `test/calendar-availability.test.mjs` (runs a `scripts/test-*.ts` suite, T9).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 32 | A7 | `export function chooseAvailabilityCalendars` / `export async function confirmAvailabilityResult` have no importer (git grep: only this file); the public surface is `availabilityReview` (50). | Unexport. | None. |
| 2 | 5 | C3 | `element(tag,text)` factory — twin of `notes-query-review.ts:4-6` (`button/heading/paragraph`) and the inline `createElement` chains in ~14 dialog files. | Shared `prototype/dom.ts` `el(tag,{text,…})`. | None. |
| 3 | 13, 16-17, 23, 37 | D12 | Inline styles: fieldset reset, row flex, 24 px checkboxes, `opacity:.45` for the disabled Check, status dot. | CSS classes in the review dialog stylesheet. | Visual. |
| 4 | 37 | C6 | Hard-coded colours `#2e9d5b` (free) / `#d14343` (busy) — the product palette already has `--alpha-call-green`/`--alpha-ok-green` and `--alpha-call-red` (`product/alpha-product-registration.ts:68-69,121`). | Use the tokens (class `.availability-dot[data-status]`). | Visual: colour shade changes slightly in light/dark. |
| 5 | 21-25 | NEW (fake disabled) | `check` uses `aria-disabled` + opacity and re-validates on click instead of `disabled`. That keeps the button focusable for screen readers (deliberate), so keep the behaviour; only the style moves to CSS. | Keep; add a comment saying why `aria-disabled` is used. | None. |
| 6 | 6, 42 | C3 | Window/interval text `${format(start,tz)} to ${format(end,tz)}` written twice. | Use `windowText` for both (pass the interval). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `element` | helper | 5 | `notes-query-review.ts:4-6`; inline createElement chains in `calendar-approval-review.ts`, `browser-camera.ts:430-437`, `file-email-review.ts`, … | `prototype/dom.ts` |
| `windowText` | helper | 6 | inline at 42 | keep local |

## Proposed end state
≈44 lines on `openReview` (already used), shared `el()`, CSS classes and palette tokens, only `availabilityReview` exported.

## Verification
`test/browser/calendar-availability.spec.ts` (chromium), `test/calendar-availability.test.mjs`, accessibility sweep, `npm run verify`; Android emulator run of an availability request (real calendars) is separate from these.
