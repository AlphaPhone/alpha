# scripts/ci/acquire-resident-bun.py
- Lines: 127 | Kind: CI script (authenticated pinned-asset download) | Verdict: KEEP, SIMPLIFY (share the GitHub download helper with `embedding-artifacts.py`)
- Covers: downloads the pinned Bun release archives (linux-musl x64+aarch64, or android aarch64) by GitHub asset id, without forwarding the token across redirects, with a size cap and SHA-256 check, and exports `ELIZA_BUN_*_FILE` to `GITHUB_ENV`. Duplicates: the redirect-safe authenticated download in `scripts/ci/embedding-artifacts.py:45-119` (same `NoRedirect`, same "token only on attempt 0", same redirect allow-list idea, same streaming hash+cap). Callers/importers: `.github/workflows/resident-android.yml:319` (via `resident-phase.py`), `.github/workflows/bun-spawn-seccomp.yml:30` (imports `download()` inline, dispatch-only reproduction), `scripts/ci/test-acquire-resident-bun.py` (Python unit test, run by `resident-android.yml:209`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-77 | C3 / C7 | `NoRedirect`, `safe_asset_url`, the 6-attempt redirect loop, first-attempt-only `Authorization`, streaming size cap and SHA-256 are re-implemented in `embedding-artifacts.py:45-119` (which `hosted-native-inputs.py` also reuses). | Extract one `scripts/ci/github_download.py` (`download(url, dest, sha256, token, max_bytes, hosts)`); both scripts import it. | Low; both tests exercise the same contract. |
| 2 | 85 | B3 | `release.get('version') != '1.4.2'` hard-codes the Bun version a second time (also in `bun-spawn-seccomp.yml`, `resident-android.yml` `setup-bun`). The lock is upstream data so validating it is legitimate, but the literal is a third copy. | Read the expected version from one place (the workflow `bun-version` input or the lock) or drop the version check; the archive SHA-256 pin already fixes the bytes. | Low. |
| 3 | 79-95 | B3 | Schema checks of the upstream lock (`schemaVersion`, repository, 40-hex revision, assetId range, 64-hex digests) re-validate data that the runtime loader "still verifies both pins" (docstring line 2). | Keep only what `download()` needs (assetId int, archiveSha256); the SHA check on the bytes is the real gate. | Low. |
| 4 | 120-127 | B1 (justified) | Catch-all that reduces exceptions to a fixed category is specified behaviour (signed URLs in reprs). Keep with its comment. | none | - |
| 5 | test twin | T9 | `scripts/ci/test-acquire-resident-bun.py` is a test living in `scripts/ci`, run only by `resident-android.yml`. | Move to `test/` (or fold into the shared download-helper test once #1 lands). | Low. |
| 6 | caller | P4 | `bun-spawn-seccomp.yml` is a dispatch-only reproduction workflow that copies an asset id and digest inline. | Candidate for deletion with the workflow (owner of ci chunk decides); then `download()` has one importer. | Low. |

## Proposed end state
- `acquire-resident-bun.py` reduced to ~40 lines: read lock -> pick arches -> call shared `github_download.download()` -> write `GITHUB_ENV`.
- One shared download helper used here, by `embedding-artifacts.py` and `hosted-native-inputs.py`.
- Its test lives under `test/` and tests the shared helper once.
