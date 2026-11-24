# scripts/ci/test-acquire-resident-bun.py
- Lines: 145 | Kind: unit tests with mocks (+ one test of the Bun CLI) | Verdict: REWRITE as `test/acquire-resident-bun.test.py` keeping only the transport security cases; delete the rest
- Covers: `TargetTests` select artifacts from a fake lock (native default two arches, Android arm64 only, no musl fallback, extra arch / bad pin refused, `main()` with `download` patched); `TransportTests` prove a redirect drops the `Authorization` header and wrong origin / oversize / wrong digest fail closed without leaving a file; `OfflineCommandTests` prove Bun 1.4.2 rejects `--cwd` before `install` (tests Bun, not our code). Duplicates: the real `acquire-resident-bun.py` run at `resident-android.yml:319` (under `resident-phase.py`) exercises target selection against the real lock and real downloads. Callers/importers: `.github/workflows/resident-android.yml:209` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-88 | T3 / T4 | Lock-selection and `main()` tests with patched `download` duplicate the real acquisition step two minutes later in the same job. | Delete. | Low. |
| 2 | 91-118 | T3 (kept) | Token-not-forwarded-on-redirect and origin/size/digest refusal are security properties a successful real download cannot show. | Keep these two cases in `test/acquire-resident-bun.test.py`, run in npm test (no network). | — |
| 3 | 121-141 | T5 | Tests upstream Bun's argument parser; needs a pinned Bun installed. | Delete (a wrong invocation fails the real `agent:stage-android` step). | Low. |
| 4 | 17-19 | C7 | Path-loads the hyphenated module. | Import after rename. | None. |

## Proposed end state
A ~40-line `test/acquire-resident-bun.test.py` with the two transport cases, run once in npm test; nothing in `resident-android.yml`.
