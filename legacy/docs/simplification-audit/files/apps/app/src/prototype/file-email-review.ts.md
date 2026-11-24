# apps/app/src/prototype/file-email-review.ts
- Lines: 47 | Role: Modal "Attach to email" review for a selected file or capture: reads the bytes on explicit action, re-reads before insert, inserts into the bound draft only if the source and target are unchanged. | Verdict: SIMPLIFY (rebuild on `openReview`)
- Importers: `camera-adapter.ts:9,1194`, `selection-adapter.ts:1,152` (`reviewFileEmail`).
  Text/path pins: `specs/quint/application/manifest.json:529` (FilesAndSharing source list) and `specs/quint/application/FilesAndSharing.qnt:1`, `specs/quint/application/README.md:45`; `specs/quint/refinement/application/boundaries.mjs:28-33` (loads by path, calls `reviewFileEmail`); `specs/quint/refinement/application/photos-window.mjs:20` and `test/selection-ask-readiness.test.mjs:7` (stub the `./file-email-review` specifier); `test/browser/file-email.spec.ts`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-29 | C4 | Re-implements the dialog lifecycle that `source-review-dialog.ts openReview()` owns: `previous` focus return, `holdPhoneInert`, the identical theme-token copy (`const theme=document.querySelector('.os');if(theme){…for(const token of ['bg','fg'])dialog.style.setProperty('--source-'+token,…)}`), `alpha-back` capture, `visibilitychange`, `pagehide`, `oncancel`/`onclose` | Build the body inside `openReview(label, region, signal, build)`. The extra close triggers here (`launcher-home`, window `blur`) become `AbortController.abort()` listeners owned by the caller of `openReview`; return `() => controller.abort()` to keep the `() => void` contract callers use as `closeQuestion` | Medium: `openReview` adds `role=region`+`tabIndex=0` to content and focuses content instead of Cancel; check `test/browser/file-email.spec.ts` and the boundaries replay |
| 2 | 13-21, 29 | D12 / C3 | Hand-written `createElement` chains with inline `style.cssText` (label row, spinner, visually-hidden "Checking") | Use the proposed `prototype/dom.ts` `el()` helper and CSS classes (`.visually-hidden` already exists? — otherwise add one) | Low visual |
| 3 | 30, 41 | B3 | Two layers of "changed" checks: `checked()` compares the review digest with the read value, then `confirm` compares a fresh `checked()` with `file` by sha/size/name/mime | Keep both — they are the specified re-read before insert (FilesAndSharing.qnt); fold into one `sameFile(a,b)` helper | None |
| 4 | 36, 44 | B1 | `catch(error){if(!ended)status.textContent=error instanceof Error?error.message:'Unavailable';}` | Keep (specified: show the reason in the dialog) | None |
| 5 | 3 | D13 | `'../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/use-in-email.ts'` | `@eliza/*` alias | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SelectedFile` | type | 5 | `MailAttachment & {size, sha256}` shape also in `runtime/inbox-attachment.ts` (review result) | `runtime/inbox-attachment.ts` export |
| dialog scaffold (focus, inert, theme tokens, back/visibility/pagehide) | helper (inline) | 12-28 | `source-review-dialog.ts openReview` (canonical), `summary-note-review.ts:9`, `note-web-source-adapter.ts:14`, `note-source-adapter.ts:53`, `runtime/calendar-sync-settings.ts:205`, `browser/content-question.ts:9` | `openReview` |
| `checked` | helper | 30 | none | stays |

## Proposed end state
~35 lines: an `openReview` call whose `build` creates destination/details/checkbox/status and the Attach button, plus the async read/re-read logic; callers still receive a close function.

## Verification
`test/browser/file-email.spec.ts`, `specs/quint/refinement/application/boundaries.mjs` replay (FilesAndSharing), `test/selection-ask-readiness.test.mjs`, `npm run test:browser`.
