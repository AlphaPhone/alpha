# scripts/prepare-aosp-apk.py
- Lines: 90 | Kind: manual tool (Python) | Verdict: DELETE (owner confirm)
- Covers: repacks an unsigned APK with stored `.so`/`.dex` entries, zipaligns at 16 KiB and writes a `preparation.json` receipt for AOSP presigned import. Duplicates: AOSP APK staging in `stage-native-apps.ts` / `aosp-capability-overlay.ts` (both reference zipalign/presigned). Callers/importers: none in package.json, workflows, scripts or docs; only `test/aosp-apk-preparation.py`. Grep of vendor `packages/os` finds no reference.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | No caller; the live AOSP staging path does not use it. | Delete with `test/aosp-apk-preparation.py`. | low (manual use unknown) |
| 2 | all | C7 | Python beside TypeScript for APK handling that `scripts/apk.ts` owns. | If kept, port into `apk.ts`. | — |
| 3 | 71-79 | B5 | Receipt with constant fields (`payloadUnchanged: true`, `deployReady: false`, `remaining: [...]`) that nothing reads. | Drop if kept. | none |
| 4 | 16-18 | C3 | Python sha256 helper (5 Python twins). | — | — |

## Proposed end state
Deleted together with its Python test. Owner question: is presigned AOSP import of a separately prepared APK still a manual step?
