# scripts/ci/verify-cloud-signing-input.sh
- Lines: 57 | Kind: CI script (release gate) | Verdict: KEEP
- Covers: before cloud APK signing, admits the signing plan: ref is `main`, HEAD is `GITHUB_SHA`, plan source commit is an ancestor (or a reviewed private producer), private-storage plan validated, or the producer run/artifact identity (`resident-android.yml`, `workflow_dispatch`, digest, size, name) matches before download and `admit-cloud-signing-input.py`. Emits `plan_sha256`. Callers: `.github/workflows/verify-cloud-signing-input.yml:37`, `release-cloud-app-signing.yml:103` (`--stage`); tested by `test/cloud-signing-input.test.py`; pinned in `specs/quint/services/manifest.json` and `specs/quint/refinement/services/protected-app-update-promotion.{mjs,py}`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-24 | C7 | Inline Python heredoc that `runpy`s `admit-cloud-signing-input.py` to call two functions — shell + Python + jq for one admission. | Give `admit-cloud-signing-input.py` a `reviewed-producer` subcommand and call it like line 27/32. | Low |
| 2 | 34-55 | D8 | `else` branch not indented; reads as top level. | Indent. | — |
| 3 | 26-33 | — | Comment explains the unprotected/protected double check; this is intended defence across a secrets boundary, not B3. | Keep. | — |
| 4 | quint | T10 | Quint harness `protected-app-update-promotion.*` reads this shell file as text. | When that harness is ported, pin behaviour through `cloud-signing-input.test.py` rather than text. | Med |

## Proposed end state
Same gate; the inline Python moved into a subcommand of `admit-cloud-signing-input.py`; indentation fixed. Release-critical, keep behaviour byte-for-byte.
