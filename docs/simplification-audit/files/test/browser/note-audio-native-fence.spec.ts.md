# test/browser/note-audio-native-fence.spec.ts
- Lines: 25 | Kind: Playwright spec, chromium, 3 tests; test 1 drives legacy Notes UI, tests 2-3 are module-only calls to `note-audio-store.ts` with a fake clock | Verdict: DELETE
- Covers: a delayed delete from a closed renderer cannot undo an explicit restore; operation-receipt history is bounded at 128 and an older restore cannot undo a newer delete; an expired recording clears bytes but keeps its replay fence. Duplicates: none in Playwright; the operation-fence rules are the subject of the Notes audio deletion models in `specs/quint/refinement/application/` (see owner question). Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-12 | A1, T6 | Legacy "Previous notes" restore plus `BrowserVoice.prototype.remove` replaced with a never-resolving promise. | Delete with legacy Notes. | None |
| 2 | 13-15 | T3/T6 | Pure store algorithm (receipt bound of 128, old restore vs newer delete) exercised by module calls in a browser. No user action. | Delete; if the owner wants the fence pinned, it belongs in the Quint model of note-audio deletion, not a browser spec. | Coverage: bounded receipt history (128) |
| 3 | 17-25 | T3/T6, T8 | Expiry fence via `page.clock.setFixedTime` and `migrateAudio()` (a legacy migration entry point). | Delete; the 30-day canonical Trash expiry is a server/agent concern. | Low |

## Proposed end state
File deleted. Owner confirms whether `note-audio-store.ts` operation receipts survive the legacy deletion; if they do, its fence belongs to a Quint model with an import-based harness.
