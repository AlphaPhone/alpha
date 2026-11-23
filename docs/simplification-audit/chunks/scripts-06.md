# Chunk scripts-06: `scripts/ci/fixtures` recovery-guard captures

| File | Kind | Verdict | Target |
|---|---|---|---|
| `scripts/ci/fixtures/recovery-idle-52ab.json` | fixture: 4 captured API35 `{power, policy}` rows (218 KB) | KEEP + MOVE | `test/fixtures/android-recovery/idle-transition-api35.json` |
| `scripts/ci/fixtures/recovery-policy-52ab.txt` | fixture: captured `dumpsys window policy` (keyguard still user0 / sentinel `-10000`) | KEEP + MOVE | `test/fixtures/android-recovery/user-switch-policy-api35.txt` |
| `scripts/ci/fixtures/recovery-storage-e4d-pass.txt` | fixture: captured `am instrument -r` pass transcript | KEEP + MOVE (rename: not about "storage" or "recovery") | `test/fixtures/android-recovery/instrumentation-pass-api35.txt` |

(The fourth file in the folder, `recovery-dismiss-52ab-v2.json`, belongs to another chunk; its report proposes the same move.)

All three have exactly one importer, `scripts/ci/test-recovery-ui-guard.py` (lines 49, 68, 111), confirmed by a
whole-repo grep excluding `vendor/`, `.eliza/`, `docs/`. That test exercises `scripts/ci/recovery_ui_guard.py`, which
is live: `scripts/ci/pending-recovery-ui.py` imports it and runs in the `recovery-ui` job of
`.github/workflows/resident-android.yml` (job runs on main push / schedule / build dispatch; the research note that
it is dispatch-only is wrong for this job). "Recovery" here is the pending-workflow-notice process-death UI on the
emulator, not the deleted legacy Cloud recovery (D1/D3), so nothing here is a DELETE under DECISIONS.

## Coverage that would be lost if these were deleted
- The guard's handling of real API35 user-switch output: ActivityManager on user10 while keyguard still reports
  user0/`-10000`; PowerManager `mUserId`/`mForegroundProfile` lagging; dozing/asleep re-wake bounded to two wakes.
  The synthetic inline strings in the test do not reproduce these transitions.
- `terminal()` acceptance of a real multiline `stream=` instrumentation transcript (unprefixed class-name line).
No other test or Quint model covers `recovery_ui_guard.py`.

## Shared helpers worth keeping
- None in this chunk (data files). The consumer's `Fixture`/`Sequence`/`IdleSequence` fake command transport is the
  only harness; keep it inside the moved test.

## Cross-file actions
1. Move `scripts/ci/test-recovery-ui-guard.py` to `test/recovery-ui-guard.test.py` and all four `recovery-*` fixtures
   to `test/fixtures/android-recovery/` (renamed as above); update the four `Path(__file__).parent/'fixtures/...'`
   reads and the `runCi` call in `test/python-suites.test.mjs:25` (becomes `run(...)` with `sys.path` pointing at
   `scripts/ci` for the import).
2. Run the guard test once: keep `npm test`, delete the "Qualify owned secondary recovery guards" step at
   `resident-android.yml:567-570` (P3; same for `test-pending-recovery-phases.py`).
3. In the moved test, drop the synthetic `terminal()` refusal block (:40-:44) and add its two unique cases to the
   captured-transcript list.
4. Keep fixture bytes verbatim: the guard asserts each power/policy key appears exactly once, so the full dumps are
   the evidence that real output contains no ambiguous matches. Do not trim to the read keys.
5. If the owner retires the `recovery-ui` emulator lane (0/40 green per ci-and-formal research), delete
   `pending-recovery-ui.py`, `recovery_ui_guard.py`, both its tests and all four fixtures in one change.

## Owner questions
- Is the `resident-android.yml` `recovery-ui` emulator lane (and so `recovery_ui_guard.py`) staying? It decides
  whether these fixtures move or are deleted with it.
