# scripts/ci/private-apk-storage.py
- Lines: 149 | Kind: release CI script + library (GCS exact-object transport) | Verdict: KEEP, SIMPLIFY
- Covers: validates a signing plan's `privateStorage` binding and downloads/uploads exact, generation-pinned private APK objects with a scoped token (`ALPHA_PRIVATE_STORAGE_TOKEN`). Duplicates: `qualified-app-update.py:189-211 signed_download` re-implements `download_object` (metadata GET, `alt=media` stream, size/digest bound) for `signed/` objects. Callers/importers: `.github/workflows/release-cloud-app-signing.yml` (upload/validate); imported by path from `qualified-app-update.py:43` and `sign-os-ota.py:28`; `verify-cloud-signing-input.sh`; `test/cloud-signing-input.test.py`; pinned in `scripts/quint-lib.ts:38`, `specs/quint/services/manifest.json:2931` and asserted by `specs/quint/refinement/services/protected-app-update-promotion.mjs:60,203` (workflow text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-93 vs `qualified-app-update.py:189-211` | C3 | Two streaming verified downloaders; they differ only in the object-name regex (`unsigned/...` here, `signed/...` there). | Generalise `download_object(pin, destination, max_bytes, prefix)`; `qualified-app-update.py` calls it. | Low; covered by `test/qualified-app-update.test.py` and `cloud-signing-input.test.py`. |
| 2 | 16-18 | C3 | `require()` copied in every Python CI file (`sign-os-ota.py` even imports this one as `STORAGE.require`). | `ci_common.require`. | None. |
| 3 | file name | C7 | Hyphenated name forces `importlib` loading in two scripts. | Rename to `private_apk_storage.py`; update workflow, `quint-lib.ts`, manifest and refinement harness pins in the same commit. | Low/medium (formal pins). |
| 4 | 104-123 | B5 | Upload hashes the source before and after and compares inode/mtime: protects against a concurrent writer on a runner the job owns. | Keep: it binds the receipt digest to uploaded bytes; acceptable for a release path. | — |

## Proposed end state
`private_apk_storage.py` with one verified `download_object` used by both release scripts, `upload_object`, `validate`; shared `require`/regexes from `ci_common.py`. Behaviour and receipts unchanged.
