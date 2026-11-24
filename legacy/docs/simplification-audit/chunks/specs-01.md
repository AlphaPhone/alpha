# Chunk specs-01: LemmaScript README and browser/prototype proof companions

25 files: `specs/lemma/README.md` and 12 `.dfy` / `.dfy.gen` pairs. Per-file reports are under
`files/specs/lemma/…`.

## Files

| File | Kind | Verdict | Note |
|---|---|---|---|
| specs/lemma/README.md | docs | SIMPLIFY | Delete the concatenated first README (lines 1-31), fix the `skipped-no-*backend` contradiction, the empty code span and the unit-test claim |
| browser/browser-poll.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 3 obligations; live via `browser-adapter.ts` |
| browser/edit-receipt.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 2; duplicated by `test/browser-camera-storage.test.mjs:105-110` (T4) |
| browser/journal-retention.dfy / .dfy.gen | proof + hand-written lemmas | KEEP / KEEP | 16; live via `daily.ts`, `calendar-deletions.ts` |
| browser/notifications.dfy / .dfy.gen | proof + hand-written lemmas | KEEP / KEEP | 24; largest hand-written tail (~200 lines) |
| browser/video-capture.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 2; overlaps `test/video-capture-limit.test.mjs` |
| browser/video-edit.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 7; 8 real-type overrides |
| browser/workflow-triggers.dfy / .dfy.gen | proof + hand-written lemmas | KEEP / KEEP | 11; dev-simulator-only code (D20: keep with the simulator, or delete both together) |
| prototype/calendar-days.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 6 |
| prototype/chat-overlay-motion-adapter.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 9; Stage F: extract to a pure `chat-overlay-motion.ts` |
| prototype/context-selection.dfy / .dfy.gen | proof + hand-written lemmas | KEEP / KEEP | 17; 4 `//@ skip` RegExp constants |
| prototype/note-recorder.dfy / .dfy.gen | proof (identical pair) | KEEP / KEEP | 4 |
| prototype/settings-adapter.dfy / .dfy.gen | proof + hand-written lemmas | KEEP / KEEP | 12; source edited in this worktree, annotated functions untouched |

All `.dfy` paths are under `specs/lemma/apps/app/src/`.

## Main conclusions

- **Every model here is live.** All 12 sources exist, every proved function has a product caller (listed per report),
  and no DECISIONS item deletes them. The update check behind `updateCheckDue`/`updateIdle` is live (the D8 switch is
  already gone). `journal-retention` serves live calendar deletions, not the deleted D4 client sync stack.
- **Not text-anchored (not T10).** The companions are LemmaScript compiler output from the real functions, checked
  by `lsc gen-check`. Nothing here needs a PORT.
- **The identical pairs are tool-imposed.** 7 of 12 pairs in this chunk are byte-identical. lsc needs both files:
  `.dfy.gen` is the merge base and `.dfy` is what Dafny checks. They cannot be deduplicated without changing lsc.
- **Refactor coupling.** Stage F splits of `settings-adapter.ts` (1,274 lines), `chat-overlay-motion-adapter.ts`
  (973) and `note-recorder.ts` (573) must move the companion pair and the `LemmaScript-files.txt` line in the same
  commit, then run `npm run lemma:regen`. `check-lemma.ts` fails on unlisted `//@` annotations and on missing or stale
  companions. Hand-written lemmas in `notifications`, `context-selection`, `settings-adapter`, `journal-retention`
  and `workflow-triggers` name functions, so a rename needs lemma edits.

## Behaviours that would lose all coverage if the DELETEs happen

No file in this chunk is a DELETE. The proofs make some host tests redundant, and removing those leaves this gap:
- The proofs cover only the pure decision. When the example-based unit tests listed below go (T3/T4), the
  **effectful wrappers lose coverage**: `BrowserVideoCapture` (recorder stop at the cap), the video-edit receipt
  IndexedDB sweep in `prototype/browser-camera.ts`, `BrowserNotifications.mark`, the journal retire/trim passes in
  `daily.ts`, the settings update-check scheduling, and the chat-sheet release gesture. These need journey coverage:
  `journeys/camera-photos.spec.ts` (record past the cap, edit-receipt recovery), `journeys/notifications.spec.ts`
  (dismiss and retain), `journeys/calendar.spec.ts` (delete and undo), `journeys/settings.spec.ts` (check for
  updates, developer rows hidden in production), `journeys/home-shell.spec.ts` (drag the chat sheet).

## Shared helpers worth keeping

None in this chunk. The checker (`scripts/check-lemma.ts`) belongs to the scripts chunk. It should drop its receipt
and hash ceremony (B5) and use `scripts/quint-lib.ts`'s `sha256` only if hashes survive.

## Cross-file actions

1. Delete `.github/workflows/lemma-check.yml`. It is broken (DAFNY set on env, not PATH) and duplicates `browser.yml`
   verify. Run `lemma:check` once, in the static/formal lane, filtered on the 23 inventory sources, `specs/lemma/**`,
   `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts` and `package-lock.json`.
2. Host tests that re-check proved pure functions by example: drop those cases.
   - `test/browser-camera-storage.test.mjs:105-110`
   - `test/chat-release.test.mjs`
   - `test/video-capture-limit.test.mjs`
   - `test/context-selection.test.mjs`
   - `test/browser-notification-clear.test.mjs`
   - `test/settings-truth.test.mjs` (pure parts only)
   After that, delete the test-only re-export at `prototype/browser-camera.ts:12`.
3. `test/lemma-check.test.mjs` and `test/lemma-checker.test.mjs` both test the checker. Keep at most one (T5): it gates
   a release tool. Update the README reference.
4. Point `package.json` `lemma:regen` (`lsc gen`) at `lsc regen --backend=dafny --no-verify` so the three-way merge of
   hand-written lemmas is the documented path, or document `gen` correctly.
5. Stage F plan: one atomic move per split source, covering source, companion pair, inventory line and `lemma:regen`.
   If the workflow simulator is deleted or moved to `dev/`, handle `browser/workflow-triggers.*` the same way (D20).

## Owner questions

- `browser/workflow-triggers.ts` is reachable only through the development simulator (`simulated-apps.ts`). Should a
  proof of dev-only code stay in the release gate, or move with the simulator behind `dev/` (D20 currently keeps it)?
- Should the README keep per-file Dafny obligation counts? They are a dated snapshot and drift on every regen.
