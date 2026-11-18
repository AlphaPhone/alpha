# test/browser/app-navigation.ts
- Lines: 35 | Kind: Playwright helper (`returnToApps`) | Verdict: KEEP, MOVE/MERGE into `test/browser/harness/nav.ts` as `goHome()`
- Covers: returns to the app grid through visible controls (nested back buttons, Back to apps, Go Home, minimize the conversation). Duplicates: `workflow-navigation.ts`, `inbox-draft-navigation.ts`, `scan-review-navigation.ts`, `helpers/browser-calendar.ts` `openBrowserCalendar` (research §6). Callers/importers: 97 files under `test/` (git grep `app-navigation'`), including `agent-clock-handoff`, `aosp-contacts`, `browser-camera`, `browser-photo-edit` in this chunk.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | D10 | Hard-coded list of four nested back labels; any new nested page needs an edit here. | Keep, but key on a shared `data-alpha-back` attribute or role if the product exposes one. | Low. |
| 2 | 15-24 | D8 | Mis-indented `else` branch; three-way control flow is hard to read. | Early returns. | None. |
| 3 | whole | C5 | One of four navigation helpers. | Merge into `harness/nav.ts` with `openApp`, `back`, `openSettings`. | Low (97 importers to update mechanically). |

## Proposed end state
`harness/nav.ts` exports `goHome(page)` with this logic, plus the other navigation helpers; the file is deleted after a mechanical import rewrite. Survives every DELETE in this chunk (many KEEP/MERGE specs import it).
