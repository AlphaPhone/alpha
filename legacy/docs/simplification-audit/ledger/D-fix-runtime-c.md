# D-fix-runtime-c: review fixes (Clock envelope, Calendar sync leftovers)

Diff base `a247c0175`. Verified on the working tree; nothing committed.

## 1. [medium] Clock history unreadable on upgraded devices — FIXED
Re-checked: the shared `read()` throws "Clock handoff history changed in an older app" when
`stored.legacy !== legacy()`; Alpha now passes no `legacy`, so any `clock-handoff:v1:device`
envelope written by develop on a device that still had `alphaphone:clock-handoff:v1` (legacy:string)
is refused forever, and clock-adapter dispatch answers 'Can’t reach Clock'. That envelope is the
current format (develop still writes it), so D1 ("current persisted formats ... stay byte-identical")
requires it to stay readable.
Fix (D1-consistent, no plain-key reader restored): `apps/app/src/runtime/clock-handoff-history.ts`
wraps the storage. `read()` returns an envelope whose `legacy` is a string as `{...env, legacy:null}`
and remembers the raw stored value; `compareExchange()` swaps that view back to the raw value as
`expected`, so the next save rewrites the slot with `legacy:null`. `clock-adapter.ts` call unchanged;
`.eliza/`/`vendor/` untouched.
Check: new `test/clock-handoff-current-envelope.test.mjs` (seeds `{version:1,legacy:'{"id":"x",...}',record}`;
read succeeds, save rewrites `legacy:null`; a Workflows Clock set over it dispatches and is not refused).
Fails 0/2 on the HEAD binding, passes 2/2 with the fix. `test/fixtures/workflow-clock-admission.mjs`
gained an optional third `seed` argument (initial slot value; default null, existing callers unchanged).

## 2. [medium] verify reads deleted Calendar files — FIXED
The working-tree edit (another agent) already removed the LOCAL table/tests and the
`calendar-sync-settings.ts` lines. With finding 4 the whole `test/calendar-sync-failure-copy.test.mjs`
is deleted and the `screen-copy-mappings` "failed Calendar sync pause" test removed (it only exercised
the deleted `ui/calendar/sync-host.ts`).

## 3. [medium] Quint Clock admission / Calendar harnesses — FIXED (mostly by concurrent work)
On the current tree: `scripts/test-clock-handoff-flow.ts` has been restored (untracked, another agent)
on the one-argument binding, and the fixture re-export no longer names `clockHandoffLegacyKey`;
`composition/ports.mjs` no longer imports the deleted Calendar modules;
`calendar-linked-local-port.mjs` and `test/quint-calendar-linked-local-port.test.mjs` are deleted.
`bun scripts/run-tests.ts test/quint-workflow-clock-admission.test.mjs` passes.
Not run here: the full `bun run quint:tests` / `quint:check` / `lemma:check`.

## 4. [low] dead `apps/app/src/ui/calendar/sync-host.ts` — FIXED (D4)
Deleted the file, its row in `apps/app/src/ui/README.md`, its source entries in
`specs/quint/services/manifest.json` and `specs/quint/native/manifest.json` (the `:1370` entry was already
gone), `test/calendar-sync-failure-copy.test.mjs`, and the sync-host case in `test/screen-copy-mappings.test.mjs`.
No remaining reference outside docs/simplification-audit.

## Verification
`npx tsc --noEmit`: clean. `bun run typecheck:scripts`: passed.
`bun scripts/run-tests.ts test/clock-handoff-current-envelope.test.mjs test/quint-workflow-clock-admission.test.mjs
test/screen-copy-mappings.test.mjs test/adapter-contracts.test.mjs`: 23 pass, 0 fail.
