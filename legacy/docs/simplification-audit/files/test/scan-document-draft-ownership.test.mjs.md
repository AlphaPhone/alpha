# test/scan-document-draft-ownership.test.mjs
- Lines: 80 | Kind: unit of upstream code (`.eliza/client-features/plugins/plugin-native-camera/src/scan-document.ts` via `prepareClientFeatures` + `tsImport`, fake draft store) | Verdict: DELETE
- Covers: automatic scan drafts are removed after a confirmed export; explicit/loaded drafts are kept. Duplicates: `test/browser/scan-draft.spec.ts`, `scan-keep.spec.ts` drive Alpha's dialog over this state. Callers/importers: `npm test` glob. Research classified it as "F, tests a scripts/ module": wrong, it only uses the script to project upstream sources.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-80 | T5 | Tests upstream `createScanDocument`; `prepareClientFeatures()` runs at import. | Delete; upstream follow-up (D14). | Low |

## Proposed end state
File deleted. Draft ownership after export: one case in `journeys/camera-photos.spec.ts` if the scan specs do not already
assert "autosaved draft gone after export, explicitly saved draft kept".
