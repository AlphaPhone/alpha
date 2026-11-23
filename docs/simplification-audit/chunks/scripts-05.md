# Chunk scripts-05

| File | Kind | Verdict | Target |
|---|---|---|---|
| `scripts/ci/fixtures/recovery-dismiss-52ab-v2.json` | test fixture (captured API35 dumpsys evidence, 335 KB) | KEEP + MOVE (optional trim of `power` text) | `test/fixtures/android-recovery/keyguard-dismiss-api35.json`, moved together with `scripts/ci/test-recovery-ui-guard.py` |

## Coverage at risk if DELETEs happen
None proposed. If the fixture were deleted, `admit_display`'s dismiss-only-after-later-awake/ON ordering and the
"persistent keyguard never admitted" case would lose their only real-device evidence (synthetic `POLICY`/`READY`
cases in the same test do not reproduce the asleep-to-awake transition).

## Shared helpers worth keeping
- `scripts/ci/recovery_ui_guard.py` (live product of `resident-android.yml` via `pending-recovery-ui.py`).
- The four `scripts/ci/fixtures/recovery-*` files form one set; move them together.

## Cross-file actions
1. Move `scripts/ci/test-recovery-ui-guard.py` + all four `scripts/ci/fixtures/recovery-*` to `test/` (one naming scheme); update `Path(__file__).parent/'fixtures/...'` reads and `test/python-suites.test.mjs:25` (`runCi` still needs `scripts/ci` on `sys.path` for `recovery_ui_guard`).
2. Run the guard test once: drop `python3 scripts/ci/test-recovery-ui-guard.py` from `resident-android.yml:569` (or from `npm test`), not both.
3. Rename run-id file names (`52ab`, `-v2`) to behaviour names.

## Owner questions
- Keep the full 62 KB-per-row `dumpsys power` captures verbatim (evidence that the parsed keys are unique in real output), or accept a trim to `m*=` lines?
