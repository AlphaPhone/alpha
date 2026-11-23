# test/browser/inbox-folders-compatibility.production.spec.ts
- Lines: 29 | Kind: Playwright journey (production project, flag-off build via `flag-off-android`), 4 parametrised cases | Verdict: MERGE into `journeys/inbox.spec.ts` (production describe: "mail folder menu"), 2 cases
- Covers: on the release bundle the "Other mail folders" menu opens, stays within a 360/412 px viewport, supports ArrowDown/End/Escape/Tab/Back dismissal and focus return, selecting Starred updates the trigger — both with the Popover API and without it (`showPopover` deleted to imitate WebView 113). Duplicates: folder switching in `inbox-folders-drafts.spec.ts:45-55` (dev lane). Callers/importers: production project; imports `flag-off-android` (`flagOffAndroid`, `fenceNetwork`, `residentHome`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | — | Research (`tests-browser.md` row) calls this a "legacy-data path"; that is wrong. `legacy` here means a browser without the Popover API (old WebView), not old app data. D1 does not apply. | Keep the no-popover case while the minimum supported WebView lacks `showPopover` (owner question: minimum WebView; `lib/abort.ts` still carries a WebView 113 fallback, so 113 is still a target). | Medium if deleted |
| 2 | 6 | T7 | 2 widths x 2 modes. | 1 width x 2 modes. | Low |
| 3 | 19 | B5 | Screenshot artefact. | Drop. | — |
| 4 | 12 | — | Asserts no Cloud sign-in notice: incidental, belongs to the connection journey. | Drop. | Low |

## Proposed end state
Two production cases (popover / no popover) in `journeys/inbox.spec.ts` covering open, bounds, keyboard, Back, Escape, selection and Tab dismissal. File deleted.
