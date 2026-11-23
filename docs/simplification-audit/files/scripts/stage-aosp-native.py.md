# scripts/stage-aosp-native.py
- Lines: 101 | Kind: OS-image staging adapter (Python) | Verdict: KEEP, SIMPLIFY
- Covers: Alpha's admission policy (source stamp, Bun pin, native view declarations, worker lock) for upstream `stage-android-native.py`, staging the launcher's native libraries for Soong. Duplicates: none. Callers: `scripts/aosp-cuttlefish.ts:14`, `scripts/aosp-pixel10a.ts:97,102`; `test/aosp-native-fixtures.py:27`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-27 | D7 | `RUNTIME_MODES`, `TARGETS`, `CLOUD_OMITTED_MODEL`, `REQUIRED_AGENT_ASSETS` are re-exported for `aosp-native-fixtures.py` only; the `CLOUD_OMITTED_MODEL`/`RUNTIME_MODES` cases test upstream's cloud runtime mode, which Alpha's one-profile build never uses (T5). | Keep `TARGETS` (argparse choices); drop the others and the upstream-mode cases from the Python test. | Low |
| 2 | 84-85 | D4 | `finalize_soong` is a pass-through to `shared.finalize_soong`. | Call `shared.finalize_soong` directly. | — |
| 3 | 30-45 | B1 (question) | When the APK has no runtime provenance entry it silently assumes `linux-musl`/`stable`. If every current build writes provenance, this default hides a broken APK. | Owner/upstream question; if provenance is always present, raise instead. | Low |
| 4 | 50-57 | B5 | The stamp hashes `prepare-local-agent.ts`, `local-agent-source.ts`, `copy-file-clone.ts` (script-text pins as source identity). | Keep while upstream admission requires `expected` to match `alpha-source.json`; it must stay byte-equal to what `prepare-local-agent.ts` writes. | — |
| 5 | 63-64 | — | Spawns `node scripts/native-view-policy.ts` to read declarations. | Fine (Python cannot import TS). | — |

## Proposed end state
~85 lines: the admission builder, `stage`, CLI. Test keeps Alpha-policy cases only.
