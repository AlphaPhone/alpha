# android/aosp/branding/provision/source-inputs.json
- Lines: 100 | Role: Lock for Provision staging: 10 pinned AOSP source files (project, revision, path, sha256, url), two prose "authority" notes, and the product setup-icon pin (path, hash, logo source hash, geometry). | Verdict: SIMPLIFY
- Importers: `scripts/stage-alpha-os-branding.py:8` (`LOCK`: `files` via `pinned()`/`check_revision()`, `productIcon.path/sha256/logoSource/logoSourceSHA256` at 133-136, sha written into the receipt at 191); `scripts/fetch-alpha-os-preset-inputs.py:10` (fetches every `files` row); `specs/quint/refinement/application/os-source-staging.mjs:102` (hashed input); `test/aosp-fresh-presets.test.py` via the stage module.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 75-76 | B5 | `settingsUpdateAuthority`, `homeRoleAuthority`: prose with source line numbers; read by nothing (grep: 0). | Move the two sentences into `provision/README.md` (it already says the same at 21-25) and delete the keys. | None; the receipt records the lock sha, so the next receipt differs (expected). |
| 2 | 82-98 | B5 | `productIcon.reuse`, `geometry` (vector/group/clipPathSHA256), `assetPreservation`: read by nothing; geometry is implied by the pinned `sha256` of `app_icon.xml`. | Delete; keep `path`, `sha256`, `logoSource`, `logoSourceSHA256`. | None. |
| 3 | 25-73 | B5 (partial) | Of 10 file rows, staging reads only `DefaultActivity.java` and `AndroidManifest.xml` (via `pinned`) and uses the `revision` of Provision and frameworks/base (via `check_revision`). The `Android.bp`, `RoleManager.java`, IMMS, IMM, `Settings.java`, LatinIME manifest, DPM, DPMS rows are review references that `fetch-alpha-os-preset-inputs.py` downloads every time. | Keep one row per project revision that `check_revision` needs (Provision, frameworks/base) and the two transformed files; drop the 6 reference rows or mark them `"reference": true` and skip them in the fetch script. | Low; owner may want the references kept for review. |
| 4 | 9, 16, ... | C3 | Each `url` is derivable from project/revision/path, and `fetch-alpha-os-preset-inputs.py:14-15` recomputes and asserts it. | Drop `url` fields and let the shared fetch tool build them. | None. |

## Local types and helpers
None.

## Proposed end state
~35 lines: `schema`, 4 file rows, `productIcon` {path, sha256, logoSource, logoSourceSHA256}.

## Verification
Quint `OSSourceStaging` and `OSProvisioning`; manual `fetch-alpha-os-preset-inputs.py` + stage dry run (admission only, no `--apply`).
