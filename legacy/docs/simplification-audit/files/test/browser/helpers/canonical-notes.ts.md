# test/browser/helpers/canonical-notes.ts
- Lines: 62 | Kind: Playwright fixture (in-page agent Notes record server) | Verdict: **REWRITE** as `harness/plugins/notes.ts`
- Covers: a closed `/api/notes/state` + `/api/views/notes/interact` server (create/update/delete/restore with revision checks, read/save failures, response loss, delay) for the canonical Notes UI; optional dictation answers. Duplicates: none for canonical Notes (the legacy path is `legacy-notes.ts`). Callers/importers: 10 specs (`accessibility-resilience`, `canonical-notes*` ×4, `legacy-notes-access`, `note-calendar-handoff`, `notes-audio-journey`, `notes-permission-recovery`, `notes-photos-list-focus`) and `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs` (imports it and pins its text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-30 | P3 | Wraps `CanonicalNotesController.prototype.refresh` to record "accepted reads". | Assert on the server request ledger and visible list instead. | Low; only the Quint notes-view harness reads `acceptedReads` (check before removing). |
| 2 | 31-32 | P3 | Wraps `BrowserDaily.prototype.perform` for dictation. | Answer `DailyApps` voice at the bridge (`harness/plugins/voice.ts`). | Low. |
| 3 | 15-17, 34, 54 | T6, P2 | Imports `connection-ui.tsx`, replaces `getAppRecordClient`, calls `c.offline()`. | Answer at `Agent.request` on the bridge (works in the production lane too). | Medium: the canonical Notes specs then run on the production bundle; verify the flag-off app shows agent Notes. |
| 4 | 11-13 | P13 | Own pageerror collector, network fence, connection seed. | Harness auto-fixture. | none |
| 5 | 44-46 | C3 | Title/body split duplicated for create and update. | One `splitContent`. | none |

## Proposed end state
`harness/plugins/notes.ts` holds the record server (state, revision, failure knobs, delay) and is installed through the
bridge's `Agent.request`. `nav.openNotes()` replaces `openCanonicalNotes`. The legacy Quint harness keeps importing this
module until P6 retires it.
