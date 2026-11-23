# apps/app/src/browser/notice-action.ts
- Lines: 9 | Role: foreground predicate + per-action AbortController retired by navigation events | Verdict: MERGE into a new browser/foreground.ts (with screen-locked.ts)
- Importers: 5 (calendar.ts, daily.ts, device.ts, hosted-results.ts, notifications.ts). Text/path pins: specs/quint/application/manifest.json; refinement browser-hosted-result-notice.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | C3 (P5) | `noticeActionBlocked` is redefined as `locked` (notifications.ts:21), `blocked` (hosted-results.ts:17), negated `foreground` (location.ts:11), inline in password-provider.ts:23 and review.ts:10,35. | Rename `foregroundBlocked`, export from foreground.ts, replace all twins. | Low; update Quint harness path. |
| 2 | 6 | C6 | Retire-event list shares most entries with dialog retire lists. | Export `RETIRE_EVENTS` from foreground.ts. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| noticeActionBlocked | helper | 2 | 5 twins listed | foreground.ts |
| beginNoticeAction | helper | 4-9 | none | foreground.ts |

## Proposed end state
Contents move to foreground.ts; file deleted. Estimated lines after: 0 (current 9).

## Verification
browser-hosted-result-notice Quint harness, notification-action-lifecycle.spec.ts.
