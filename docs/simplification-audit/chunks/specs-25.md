# Chunk specs-25: native recovery/VAD conformance, review notes, refinement READMEs, application harnesses A–Bf

26 files reviewed; per-file reports under `docs/simplification-audit/files/specs/quint/...`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `specs/quint/native/recovery-vad-conformance.mjs` | Quint→Java conformance (real classes via javac) | KEEP, SIMPLIFY | Move VAD half upstream (models only `vendor/eliza` `LiveVadGate`, manifest `sources: []`); drop constant check and hash return; share Java discovery with `refinement/native/java.mjs` |
| `specs/quint/notes-storage-getter-review-20261109.md` | review note | DELETE | Describes "Previous Notes" (D1) |
| `specs/quint/pixel-native-review-20261109.md` | review note | DELETE | Move the one open device gate (auxiliary voice IME) to owner questions first |
| `specs/quint/refinement/README.md` | method doc | KEEP, REWRITE | ~35 lines; add "import, never slice" rule; drop receipt/hash text |
| `specs/quint/refinement/application/README.md` | catalogue doc | DELETE | Merge 5 lines into `refinement/README.md`; legacy Notes content is D1 |
| `.../accessible-toast-lifetime.mjs` | harness, transplant (strip-types + `model.js` slice) | PORT | `bundledSource` for `accessibility-timeout.ts`; extract `prototype/toast-queue.ts` from `model.js` |
| `.../account-sheet.mjs` | harness, Vite+Chromium real UI + source-marker injection in `connection-ui.tsx` | PORT (small) | Derive section/review from DOM; delete hashing of all of `apps/app/src`; share Agent-provider Capacitor fake |
| `.../address-input.mjs` | harness, transplant of `browser-adapter.ts` `navigate` region | PORT | Extract `prototype/browser-navigation.ts` `createBrowserNavigate(deps)` |
| `.../agent-calendar-event-return.md` | note | DELETE | |
| `.../agent-calendar-event-return.mjs` | harness, real bundled import | KEEP, **FIX NOW** | Constructor drift: drop the preservation argument; hold the mutation at the port, not at the deleted preservation gate |
| `.../agent-calendar-mutation.md` | note | DELETE | Describes deleted preservation |
| `.../agent-calendar-mutation.mjs` | harness, real bundled import | KEEP, **PORT NOW** (model + harness) | Remove preservation phase from `AgentCalendarMutation.qnt` and 4 preservation-only cases |
| `.../agent-calendar-refresh.md` | note | DELETE | Describes deleted legacy review |
| `.../agent-calendar-refresh.mjs` | harness, real bundled import + `Date.now()` text patch | KEEP, **PORT NOW** (model + harness) | Remove `legacy`/`retention` phases and statuses from `AgentCalendarRefresh.qnt`, 4 legacy-only cases; fake `Date.now` globally |
| `.../agent-calendar-sync-control.md` | note | DELETE | |
| `.../agent-calendar-sync-control.mjs` | harness, real bundled import + source-marker injection | KEEP, **PORT NOW** (model + harness) | Remove preservation phase from `AgentCalendarSyncControl.qnt`; drop `__selected` injection (derive from inputs/POST body) |
| `.../app-info-handoff-composition.mjs` | harness, composition (Chromium drawer + javac Java) | KEEP | Becomes text-free when `drawer-interaction.mjs` and `native/app-info-handoff.mjs` are ported; drop baseCommit assertion |
| `.../appearance-preference-admission.md` | note | DELETE | Bug-history narrative |
| `.../appearance-preference-admission.mjs` | harness over transplant fixture (5 anchors in `settings-adapter.ts`, `main.tsx`, `model.js`) | PORT | Extract `runtime/appearance-preference.ts`; move `test/fixtures/appearance-preference.mjs` next to the harness as ports |
| `.../automatic-app-update-schedule.mjs` | harness, real upstream scheduler + transplanted `pollAutomaticUpdate` (marker comments `settings-facts:begin/end`) | PORT | Extract `prototype/automatic-update-poll.ts`; delete provenance/tombstone asserts |
| `.../bookmarks-hydration.mjs` | harness, transplant of `browser-adapter.ts` bookmark region | PORT | Extract `prototype/browser-bookmarks.ts` `createBookmarkQueue(deps)` |
| `.../boundaries.mjs` | 3 adapters in one file | SPLIT + PORT | `filesAndSharing` → `bundledSource`; `notificationCollection` → journey step or bundle with one alias; `developmentHost` keep |
| `.../browser-album-storage.mjs` | harness, two real Chromium tabs, real IndexedDB/Web Locks | KEEP, SIMPLIFY | Drop provenance hash; move `checkBrowserAlbumWithoutLocks` into Photos journey or runner |
| `.../browser-deletion-poll.mjs` | harness, real bundled browser stores | KEEP, SIMPLIFY | Import `deferred` from `./support.mjs` instead of `specs/quint/legacy/core/source-support.mjs` |
| `.../browser-external-handoff.mjs` | harness over transplant fixture (`sourceContext`) | KEEP, PORT fixture | Load `prototype/browser-external-handoff.ts` with `bundledSource` (it already takes explicit deps) |
| `.../browser-files-trash.md` | note | DELETE | Record that `BrowserFilesTrash` models upstream `plugin-files` (upstream follow-up) |

Counts: KEEP (incl. KEEP+SIMPLIFY/FIX) 8, PORT 9 (counted in merge/rewrite), DELETE 11 (9 notes + 2 review logs; one README), REWRITE 1 (`refinement/README.md`), SPLIT 1 (`boundaries.mjs`).

## Urgent: harnesses already broken by stage A

`apps/app/src/runtime/agent-calendar.ts` in this worktree dropped the `CalendarPreservation` constructor parameter,
`AgentCalendarState.legacy` and the `legacy-recovery`/`transition-required` statuses (D1). Four live harnesses still
pass a preservation object as the second constructor argument, so it lands in the `client` slot and every case throws:
`agent-calendar-event-return.mjs`, `agent-calendar-mutation.mjs`, `agent-calendar-refresh.mjs`,
`agent-calendar-sync-control.mjs`. Three of their models (`AgentCalendarMutation.qnt`, `AgentCalendarRefresh.qnt`,
`AgentCalendarSyncControl.qnt`) still contain the preservation/legacy phase. Quint must stay at 100 %; these four
model+harness edits belong to the same commit as the preservation deletion. `AgentCalendarEventReturn.qnt` needs no
model change.

## Behaviours that would lose all coverage if DELETEs happen

- None of the DELETEs in this chunk remove behavioural coverage: they are narrative notes and review logs.
- Coverage risk comes from adjacent DELETE verdicts in other chunks that this chunk depends on:
  - `test/agent-calendar-mutation.test.mjs` (+ `scripts/test-agent-calendar-mutation-flow.ts`) DELETE: Calendar
    create/update/delete admission is then covered only by `agent-calendar-mutation.mjs`, which is currently broken.
    Do not delete the wrapper/script before this harness is green again.
  - `test/appearance-preference.test.mjs` DELETE: the appearance harness then runs only through `index.mjs`/the single
    runner; make sure it is in that runner.
  - Dropping the 4 preservation-only cases in each Calendar harness is correct (the behaviour no longer exists), not a loss.
- `checkBrowserAlbumWithoutLocks` (no Web Locks ⇒ album writes refused) is not a trace replay; if the per-model wrapper
  is merged without carrying it, that refusal loses coverage. Carry it into the Photos journey or the runner.

## Shared helpers worth keeping

- `support.mjs` `bundledSource()` — the target loader for every port in this chunk (event-return already uses it).
- `support.mjs` `deferred`/`tick`/`trace`/`checkpoint`/`call` — replace the `legacy/core/source-support.mjs` import.
- `browser-model-traces.mjs` `modelTraces`/`replayTraces`/`plain` — used by address-input and bookmarks; also the ITF
  decoder `recovery-vad-conformance.mjs` re-implements.
- `refinement/native/java.mjs` `executable()` — Java discovery duplicated in `recovery-vad-conformance.mjs` and
  `native/conformance.mjs`.
- `performance.now` override pattern in `browser-deletion-poll.mjs` — use instead of the `Date.now()` text patch in
  `buildAgentCalendar`.

## Cross-file actions

1. Product extractions that unblock harness ports (all also shrink god modules, stage F):
   `prototype/browser-navigation.ts` and `prototype/browser-bookmarks.ts` from `browser-adapter.ts`;
   `prototype/automatic-update-poll.ts` (+ remove `// settings-facts:begin/end` markers) and
   `runtime/appearance-preference.ts` from `settings-adapter.ts`/`main.tsx`/`model.js`;
   `prototype/toast-queue.ts` from `model.js`.
   Until these land, the harnesses block Prettier (D9) on those files.
2. Delete the `.source.json`/`baseCommit` provenance assertions copied into harnesses and fixtures
   (`app-info-handoff-composition.mjs:64-65`, `automatic-app-update-schedule.mjs:19-26`, `browser-album-storage.mjs:26-32`,
   `test/fixtures/browser-external-handoff.mjs:32-41`); call `checkClientFeatures()` once in the runner.
3. Delete `captureSources`/`captureInputs`/`boundInputs` hashing with the §2.8 receipt removal (every harness here).
4. Move harness-only fixtures from `test/fixtures/` into `specs/quint/refinement/application/`:
   `appearance-preference.mjs`, `browser-external-handoff.mjs` (both have no non-formal importer once the DELETE host
   tests go).
5. Remove `specs/quint/legacy` dependency in `browser-deletion-poll.mjs` (one of three blockers named in research §2.10).
6. Delete the `quint:conformance` npm alias; run `recovery-vad-conformance` through the single runner.
7. Upstream follow-ups (D14): `VadSegmentation` model + replay (upstream `LiveVadGate`), `BrowserFilesTrash`
   (upstream `plugin-files` storage volume), the generic half of `AutomaticAppUpdateSchedule` (upstream scheduler).
8. Split `boundaries.mjs` into one file per model.

## Owner questions

- `pixel-native-review-20261109.md` lists open installed-device gates (auxiliary voice IME switching/insertion,
  native keyboard-hide focus). Should they be carried as owner-tracked acceptance items before the note is deleted?
- `VadSegmentation` and `BrowserFilesTrash` model only upstream code. Move them upstream, or keep them here and run
  them only when `upstream.lock.json` changes?
- `notificationCollection` (browser notification redaction): keep as a bundled-module refinement, or make the
  Notifications Playwright journey the trace source for `NotificationCollection.qnt`?
