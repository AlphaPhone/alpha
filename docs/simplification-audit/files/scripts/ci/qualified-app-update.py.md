# scripts/ci/qualified-app-update.py
- Lines: 337 | Kind: release CI script (admit post-signing qualification, stage verified private outputs) | Verdict: KEEP (owner question on the never-run workflow), SIMPLIFY
- Covers: validates a qualification record (signing run identity via `gh api`, delivery artifact digest, embedded signing plan and content-free voice receipt), downloads the unsigned producer archive and signed bundle from private storage, re-admits the producer, and restores evidence and APKs into a product checkout for publication. Duplicates: `signed_download` (189-211) twins `private-apk-storage.download_object`; `module()`, `sha`, `file_sha`, `pairs`, `decode` twin `sign-os-ota.py:21-47`. Callers/importers: `.github/workflows/publish-qualified-app-update.yml` (research: never run); pinned in `scripts/quint-lib.ts:38`, `specs/quint/services/manifest.json:2932`, `specs/quint/refinement/services/protected-app-update-promotion.{mjs,py}`; tests `test/qualified-app-update.test.py`, `test/qualified-app-update.test.mjs` (workflow text), `test/ci-emulator-evidence.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 189-211 | C3 | Duplicate verified GCS download. | Call `private_apk_storage.download_object(..., prefix='signed/')`. | Low. |
| 2 | 36-44, 52-71 | C3 / C7 | Path-loader and JSON/digest helpers copied from/to `sign-os-ota.py`. | `ci_common.py`; underscore module names. | Low. |
| 3 | 97-99 | — | Explicitly refuses CMS delivery while `release-cloud-app-signing.yml:232-234` still produces CMS via `seal-signed-apks.py` when a plan has no `privateStorage`. The two release paths disagree on what is admissible. | Owner: if CMS delivery is retired, delete the CMS branch and `seal-signed-apks.py`; otherwise document that CMS deliveries are never publishable. | Owner decision. |
| 4 | 258-271 | D8 | 300-character allow-list condition. | Named tuples `RESTORED_FILES`, `RESTORED_PREFIXES`. | None. |
| 5 | — | P4 | `publish-qualified-app-update.yml` has never run; research also flags `runtimeProfile == 'cloud'` vs resident build writing a different profile (`ci-and-formal.md` Q8). | Owner question: keep the publication path or delete script + workflow + Quint model together (D20 rule: model and code go together). | High if deleted wrongly (release path). |

## Proposed end state
~260 lines using shared storage/download and JSON helpers; same record schema and receipts; the Quint `protected-app-update-promotion` model keeps passing with updated path pins (or is retired together with this script if the owner drops publication).
