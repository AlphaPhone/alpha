# android/aosp/branding/system-entry/manifest.json
- Lines: 108 | Role: Reviewed record of the system-entry patch: revision, patch name/hash, per-file before/after hashes, logo identity, product-overlay path/hash/resources, status flags. | Verdict: SIMPLIFY
- Importers: `apply.py:10,13` (revision, patch, patchSha256, files[path, beforeSha256, afterSha256]); `prepare.py:370-371` (patchSha256 only); `test_native_plan.py` (`patch`, `patchSha256`, `files`, `productOverlay.path/sha256` at 82-99, `identity.source` at 172); `scripts/stage-alpha-os-branding.py:110-113` (`productOverlay.path/sha256`); `test/aosp-fresh-presets.test.py:79-80` (via staging).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 18, ... 78 | B5 | `"new": true|false` in each of 12 rows: never read (apply.py derives new-ness from `beforeSha256 is None`). | Delete the key (12 lines). | None. |
| 2 | 83-88 | B5 | `identity.sourceSha256`, `exactSvgPathPreserved`, `font`, `header`, `existingProductBlue`, `existingProductDarkBlue`: unread (only `identity.source` is read, test:172). | Keep `"logoSource": "apps/app/public/logo-mark.svg"` only. | None. |
| 3 | 93-101 | B5 / C6 | `productOverlay.resources` restates the XML content of `product-overlay/values/alpha-system-entry.xml` (also in `prepare.py:374-383, 389-390` and `PROVENANCE.json:34-44`); `destination` is prose. | Keep `path` and `sha256` only. | None. |
| 4 | 103-107 | B5 | `selectionDefaultsChanged`, `savedSelectionsChanged`, `compilation`, `imageBuilt`, `deviceQualified`: status flags nothing reads. | Delete. | None. |
| 5 | 6 | pin | `patchSha256` repeated in `power-voice/manifest.json:7`, `PROVENANCE.json:10,59`. | See cross-file action: power-voice references this manifest instead of copying the hash; PROVENANCE deleted. | - |

## Local types and helpers
None.

## Proposed end state
~55 lines: schema, project, revision, patch, patchSha256, files[{path, beforeSha256, afterSha256}], logoSource, productOverlay{path, sha256}. `prepare.py` should then stop writing its own (different, unread) `.cache/manifest.json`.

## Verification
Manual `test_native_plan.py` (update `MANIFEST['identity']['source']` -> `MANIFEST['logoSource']`); stage dry run; Quint `OSSourceStaging`.
