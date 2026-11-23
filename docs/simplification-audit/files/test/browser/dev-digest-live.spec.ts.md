# test/browser/dev-digest-live.spec.ts
- Lines: 25 (3 call sites, 4 tests) | Kind: Playwright `chromium`, dev build; 1 UI loop over email/calendar plus 2 module-in-page tests | Verdict: **DELETE** (owner question Q-HOST-5)
- Covers: a reviewed live email or calendar digest source reads bounded fresh data and never retains private body text; stale account revisions fail before reading; an empty calendar digest preserves calendar source initialisation. Duplicates: none. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | P7, Q-HOST-5 | Live Google sources are part of the same delegation feature as `dev-digest-delegation`; the reader under test is `browser/digest-live-sources.ts` (browser stand-in). | Delete with the delegation decision. | Medium: "a digest result never contains PRIVATE body/attachment text" has no other test. |
| 2 | 7 | A1 | Calendar arm writes the legacy envelope `{version:1,legacy:localStorage.getItem(...),value}` into `alpha.browser.calendar.v1`. | Gone (envelope removed by D1). | none |
| 3 | 10-16 | T6, P3 | Calls `developmentDigestRequest` directly and wraps `Storage.prototype.getItem` to count reads. | Delete. | Low |
| 4 | 17-25 | T6 | `page.route` fake HTML page, then imports `calendar-store`, `digest-live-sources`, `calendar` and calls them. | Delete. | Low |

## Proposed end state
Deleted, pending Q-HOST-5. If live sources stay, carry the privacy assertion (no body text in the stored result, checked through the panel's execution details) into the workflows journey.
