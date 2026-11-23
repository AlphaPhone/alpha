# scripts/ci/sign-os-ota.py
- Lines: 279 | Kind: release CI script (sign a preserving pilot OS OTA) | Verdict: KEEP, SIMPLIFY
- Covers: `validate` binds a plan to `android/signing/ota-tools.json` (reviewed producer commits, tool digest, reviewed target-files identities); `download` fetches target-files and otatools from private storage, inspects target metadata (A/B only, no data/trust partitions, unchanged APK signer and AVB key configuration, matching fingerprint/timestamp) and extracts tools safely; `sign` decrypts the OS release key from custody secrets into `/dev/shm`, runs `ota_from_target_files`, verifies the whole-file CMS signature and metadata, and writes a receipt; `upload` stores the OTA. Duplicates: `module`, `digest`, `pairs`, `read` twins in `qualified-app-update.py`; borrows `require` from `private-apk-storage.py`. Callers/importers: `.github/workflows/release-os-ota-signing.yml:71,90,101,117`; `sign-os-ota.test.py`; `test/qualified-app-update.test.mjs:74-76` (workflow step order, T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-30 | C7 | Loads `private-apk-storage.py` and `release-custody-proof.py` by path. | Plain imports after the underscore rename. | Low (custody script SHA pin; see that report). |
| 2 | 33-47 | C3 | JSON/digest helpers duplicated. | `ci_common`. | None. |
| 3 | 235 | D8 | `import shlex` inside the function; `;`-joined statements (186-187, 194, 231). | Top-level import; formatter. | None. |
| 4 | 207-211, 268 | B3 | `validate(plan)` runs again in `download`/`sign` after `__main__` already validated. | Validate once in `__main__`, pass `pin`. | None. |
| 5 | 119 | A8 | Comment mentions the "legacy non-A/B tool_extensions path"; describes upstream tool behaviour, not history. Keep. | None. | — |

## Proposed end state
`sign_os_ota.py` (~240 lines) importing `private_apk_storage`, `release_custody`, `ci_common`; same modes, receipts and refusals.
