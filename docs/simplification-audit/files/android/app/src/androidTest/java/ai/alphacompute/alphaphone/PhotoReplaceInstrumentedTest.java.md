# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotoReplaceInstrumentedTest.java
- Lines: 319 | Role: in-place photo replace recovery in upstream `OwnedPhotoEdits` with an injected faulty `ReplaceOutput`: failed writes, later result reconciliation, process death during edit/restore, backups retained when ownership is unproven | Verdict: MOVE to upstream (owner decision); otherwise KEEP
- Importers: none. Uses upstream `OwnedPhotoEdits` (its `ReplaceOutput` seam and 4-arg constructor) with `AlphaMediaConfig.MEDIA`. Text/path pins: `scripts/android-instrumentation.ts:273` (`PhotoReplace: { note: … }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | T5 / research P20 | Every test drives `OwnedPhotoEdits.replace/result` with a fault-injecting `ReplaceOutput` and inspects upstream internals: backup files `files/photo-replace-backups/<token>.original|.edited` (l.238-244) and the receipt JSON fields `damage`, `editBackup` in `alpha-photo-edit-results` (l.105-110, 182-184). No Alpha code path is involved beyond the config. This is upstream engine coverage living in the product repo. | Move the class to the upstream media plugin's androidTest (with a neutral config) and delete it here; Alpha keeps the UI-level PhotoEdit journey. | Medium: loses Alpha-side regression signal until upstream runs it. |
| 2 | 63, 106, 182 | C6 | `"alpha-photo-edit-results"` literal ×3. | Constant from production. | None. |
| 3 | 216-228 | C3 | Revision string `date_added:_size:generation_modified:is_trashed` duplicated from `PhotoFilterInstrumentedTest.revision` (l.18). | Shared helper. | None. |
| 4 | 246-256 | C3 | `readPhoto` stream copy; `PhotosTestFixture.bytes` uses `readAllBytes`. | Shared helper. | None. |
| 5 | 41 | B4 | `assumeTrue(SDK_INT >= 30)` — the app's minSdk already guarantees it (if ≥ 30). | Delete if minSdk ≥ 30. | None. |
| 6 | — | KEEP | Readable, formatted, focused cases. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ProcessDeath` | class | 272 | none | upstream |
| `Faulty` | class | 274-318 | none | upstream |
| `begin` (revision) | helper | 216-228 | PhotoFilter:18 | `PhotosTestFixture.revision` |
| `readPhoto` | helper | 246-256 | PhotosTestFixture:30, PhotoEdit:21, PhotoFilter:17 | `PhotosTestFixture.bytes` |
| `backup`/`editBackup` | helper | 238-244 | upstream path names | upstream |

## Proposed end state
Deleted here after an equivalent upstream test lands (0 lines). If kept: ~300 lines with shared helpers.

## Verification
`npm run test:android:instrumentation -- --classes PhotoReplace`.
