# apps/app/src/prototype/calendar-approval-review.ts
- Lines: 30 | Role: Modal review dialog for one agent Calendar approval: re-reads the request at open and at the tap, shows the fields, returns approve/reject only if the shown presentation is unchanged. | Verdict: SIMPLIFY (rebuild on `openReview`)
- Importers: 1 — `apps/app/src/prototype/calendar-approval-adapter.ts:4`. Class `calendar-approval-review`/`calendar-approval-primary` styled in `phone.css`.
- Text/path pins: `test/browser/calendar-approval-queue.spec.ts:9` (T6: imports `reviewCalendarApproval` in page), `test/calendar-approval-ui.test.mjs:62` (esbuild bundle, T2/T3), `test/quint-calendar-approval-review.test.mjs` + `specs/quint/refinement/application/calendar-approval-review.mjs` (Quint replay), `specs/quint/application/manifest.json:4159`, `test/support/feature-parity.mjs:348`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-18, 26-28 | C4/P12 | Hand-rolled `<dialog>` lifecycle: `holdPhoneInert`, focus return, `alpha-back` capture, `pagehide`, `visibilitychange`, `alpha:device-state`, `oncancel/onclose`, and the theme-token copy `for(const token of ['bg','fg','s2','mut','line','acc'])dialog.style.setProperty(…)` — what `source-review-dialog.ts openReview` does (it copies only `bg`,`fg` as `--source-*`). | Use `openReview('Calendar change','Details',signal,build)`; extend `openReview` with the extra tokens (or define tokens globally, see automations.css report #7) and the `alpha:device-state` abort. | Medium: the Quint review replay and the approval-queue spec pin the current DOM (section vs div role=region, button order Close/Decline/Approve). |
| 2 | 14, 19 | D12 | Inline styles on `dl`, `dt`, `dd` (`display:grid…`, `fontWeight='600'`, `margin:0 0 12px;white-space:pre-wrap`). | Classes in `phone.css` next to `.calendar-approval-review`. | Visual only. |
| 3 | 19, 22 | D8 | `show` and `choose` bodies are single 600-character lines. | Format. | None. |
| 4 | 5 | C1 | Callback-heavy signature (`read`, `signal`, `current`, `onRead`, `labels`) — fine, but `current:()=>void` that throws is the same fence idiom as approval-adapter. | Keep; adopt the shared fence helper if introduced. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| dialog scaffolding (`finish/abort/visibility/back`) | inline helper | 16-18, 27 | `source-review-dialog.ts openReview`, `file-email-review.ts:12-15`, `summary-note-review.ts:9`, `note-web-source-adapter.ts:14`, `note-source-adapter.ts:53`, `browser-camera.ts:428-446`, `runtime/calendar-sync-settings.ts:205`, `browser/content-question.ts:9` | `openReview` |
| theme token copy | inline | 9 | `source-review-dialog.ts:7`, `workflow-filters.ts:14` | global tokens or `openReview` |

## Proposed end state
≈20 lines: `reviewCalendarApproval` builds its content and footer inside `openReview`, keeping the read-at-open, re-read-at-tap and "presentation unchanged" rule exactly; styles moved to CSS.

## Verification
`test/browser/calendar-approval-queue.spec.ts`, Quint `calendar-approval-review` replay (`test/quint-calendar-approval-review.test.mjs`), accessibility sweep (dialog focus/Back), `npm run verify`; emulator check of Back and app-switch closing the dialog.
