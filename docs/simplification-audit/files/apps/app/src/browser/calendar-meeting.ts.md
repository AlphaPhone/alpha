# apps/app/src/browser/calendar-meeting.ts
- Lines: 15 | Role: origin-local "meeting room" dialog with camera/microphone preview toggles. | Verdict: SIMPLIFY
- Importers: 1 (`browser/calendar.ts:11,172`). Text/path pins: `test/browser/calendar-accessibility.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 13-14 | C4 | Copied dialog kit: theme-token loop `['bg','fg','s2','line']`, dark detection, `alpha-back`/`pagehide`/`alpha:device-state`/`visibilitychange` add/remove, focus restore, `document.body.append`. | `openOwnedDialog` from the shared dialog kit. | Medium (back capture order) |
| 2 | 11-12 | B1 | `catch{…showError('Camera could not start. Try again.')}` — specified user-facing fallback. | Keep. | — |
| 3 | 6 | D12 | Inline `video.style.cssText`. | CSS class. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `button(name)` | helper | 7 | small button builders in `clock.ts:61`, `domain-recovery.ts` | dialog kit |

## Proposed end state
~12 lines of meeting logic over the dialog kit; could share a `calendar-dialogs.ts` with `calendar-response.ts`.

## Verification
`test/browser/dev-calendar-meeting.spec.ts`, `test/browser/dev-calendar-meeting-lifecycle.spec.ts`.
